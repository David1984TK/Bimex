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
