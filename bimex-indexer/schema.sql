-- Bimex Indexer Schema
-- Run in Supabase SQL editor or as a migration

create table if not exists proyectos (
  id              integer primary key,
  dueno           text,
  nombre          text,
  meta            numeric,
  total_aportado  numeric default 0,
  yield_entregado numeric default 0,
  estado          text,
  motivo_rechazo  text,
  created_at      timestamptz
);

create table if not exists aportaciones (
  proyecto_id  integer references proyectos(id),
  contribuidor text,
  monto        numeric,
  retirado     boolean default false,
  timestamp    timestamptz,
  primary key (proyecto_id, contribuidor)
);

create table if not exists eventos (
  id          bigserial primary key,
  tipo        text not null,
  contract_id text not null,
  fn_name     text,
  data        jsonb,
  ledger      bigint,
  tx_hash     text unique,
  timestamp   timestamptz
);

-- Index for fast lookups
create index if not exists eventos_tipo_idx         on eventos(tipo);
create index if not exists eventos_ledger_idx       on eventos(ledger desc);
create index if not exists aportaciones_proj_idx    on aportaciones(proyecto_id);
create index if not exists aportaciones_backer_idx  on aportaciones(contribuidor);

-- Atomic yield increment (avoids read-modify-write race)
create or replace function incrementar_yield_entregado(p_id integer, p_delta numeric)
returns void language sql as $$
  update proyectos
  set yield_entregado = yield_entregado + p_delta
  where id = p_id;
$$;

-- Enable Supabase realtime for live frontend updates
alter publication supabase_realtime add table eventos;
alter publication supabase_realtime add table proyectos;

 #147-Global-rate-limiting-by-IP-on-public-indexer-endpoints-FIX
-- Shared API rate-limit buckets (used by bimex-indexer/rateLimiter.js).
-- The API falls back to in-memory counters if these objects have not been migrated,
-- but Supabase storage keeps limits consistent across multiple API instances.
create table if not exists api_rate_limits (
  key            text primary key,
  limit_name     text not null,
  ip             text,
  identifier     text not null,
  window_start   timestamptz not null,
  window_seconds integer not null,
  count          integer not null default 0,
  expires_at     timestamptz not null,
  updated_at     timestamptz not null default now()
);

create index if not exists api_rate_limits_expires_idx on api_rate_limits(expires_at);
create index if not exists api_rate_limits_ip_idx on api_rate_limits(ip);

create table if not exists api_rate_limit_blocks (
  id                   bigserial primary key,
  ip                   text,
  endpoint             text not null,
  method               text not null,
  limit_name           text not null,
  identifier           text not null,
  retry_after_seconds  integer,
  user_agent           text,
  blocked_at           timestamptz not null default now()
);

create index if not exists api_rate_limit_blocks_blocked_at_idx on api_rate_limit_blocks(blocked_at desc);
create index if not exists api_rate_limit_blocks_ip_idx on api_rate_limit_blocks(ip);

create table if not exists api_sse_connections (
  id          text primary key,
  ip          text not null,
  endpoint    text not null default '/sse',
  user_agent  text,
  opened_at   timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists api_sse_connections_ip_idx on api_sse_connections(ip);
create index if not exists api_sse_connections_expires_idx on api_sse_connections(expires_at);

create or replace function consume_api_rate_limit(
  p_key text,
  p_limit_name text,
  p_ip text,
  p_identifier text,
  p_window_seconds integer,
  p_max_requests integer
)
returns table(
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_expires_at timestamptz;
begin
  delete from api_rate_limits where expires_at < v_now - interval '1 hour';

  insert into api_rate_limits as rl (
    key,
    limit_name,
    ip,
    identifier,
    window_start,
    window_seconds,
    count,
    expires_at,
    updated_at
  ) values (
    p_key,
    p_limit_name,
    p_ip,
    p_identifier,
    v_now,
    p_window_seconds,
    1,
    v_now + make_interval(secs => p_window_seconds),
    v_now
  )
  on conflict (key) do update set
    limit_name = excluded.limit_name,
    ip = excluded.ip,
    identifier = excluded.identifier,
    window_start = case
      when rl.expires_at <= v_now then excluded.window_start
      else rl.window_start
    end,
    window_seconds = excluded.window_seconds,
    count = case
      when rl.expires_at <= v_now then 1
      else rl.count + 1
    end,
    expires_at = case
      when rl.expires_at <= v_now then excluded.expires_at
      else rl.expires_at
    end,
    updated_at = v_now
  returning count, expires_at into v_count, v_expires_at;

  return query select
    v_count <= p_max_requests,
    v_count,
    greatest(p_max_requests - v_count, 0),
    v_expires_at,
    greatest(ceil(extract(epoch from (v_expires_at - v_now)))::integer, 1);
end;
$$;

create or replace function acquire_api_sse_connection(
  p_id text,
  p_ip text,
  p_max_connections integer,
  p_ttl_seconds integer,
  p_user_agent text default null
)
returns table(
  allowed boolean,
  active_connections integer,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_active integer;
begin
  perform pg_advisory_xact_lock(hashtext('api_sse:' || p_ip));

  delete from api_sse_connections where expires_at <= v_now;
  select count(*) into v_active from api_sse_connections where ip = p_ip;

  if v_active >= p_max_connections then
    return query select false, v_active, 0, 60;
    return;
  end if;

  insert into api_sse_connections(id, ip, user_agent, opened_at, expires_at)
  values (p_id, p_ip, p_user_agent, v_now, v_now + make_interval(secs => p_ttl_seconds));

  v_active := v_active + 1;
  return query select true, v_active, greatest(p_max_connections - v_active, 0), 0;
end;
$$;

create or replace function release_api_sse_connection(p_id text)
returns void
language sql
security definer
as $$
  delete from api_sse_connections where id = p_id;
$$;

-- Audit Log for Admin Actions
create table if not exists audit_log (
  id bigserial primary key,
  action text not null,
  actor_address text not null,
  target text,
  metadata jsonb,
  tx_hash text unique,
  block_time timestamptz not null,
  recorded_at timestamptz default now()
);

-- Row Level Security to enforce immutability
alter table audit_log enable row level security;
create policy "Allow public read" on audit_log for select using (true);
create policy "Allow insert only" on audit_log for insert with check (true);
-- No policies for update or delete means they are implicitly denied

create index if not exists idx_audit_log_block_time on audit_log (block_time desc);
create index if not exists idx_audit_log_actor_address on audit_log (actor_address);
create index if not exists idx_audit_log_action on audit_log (action);
 main
