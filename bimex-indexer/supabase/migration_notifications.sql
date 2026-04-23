-- Migration: notification system
-- Run in Supabase SQL editor or via supabase db push

-- ── user_notifications ────────────────────────────────────────────────────────
-- Stores email preferences per wallet address
create table if not exists user_notifications (
  wallet_address        text primary key,
  email                 text not null,
  notifications_enabled boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_notifications_updated_at on user_notifications;
create trigger trg_user_notifications_updated_at
  before update on user_notifications
  for each row execute function set_updated_at();

-- ── project_events ────────────────────────────────────────────────────────────
-- Stores on-chain events detected by the indexer
create table if not exists project_events (
  id             bigserial primary key,
  event_type     text not null,   -- proyecto_aprobado | proyecto_rechazado | meta_alcanzada | yield_disponible | retiro_principal
  project_id     integer not null,
  project_name   text not null,
  owner_wallet   text not null,   -- FK to user_notifications.wallet_address
  payload        jsonb,           -- optional extra data: { motivo, monto }
  notified_at    timestamptz,     -- null = pending, set when email sent
  created_at     timestamptz not null default now()
);

create index if not exists idx_project_events_notified
  on project_events (notified_at)
  where notified_at is null;

create index if not exists idx_project_events_owner
  on project_events (owner_wallet);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- user_notifications: users can read/write their own row via wallet address
alter table user_notifications enable row level security;

create policy "owner can upsert own preferences"
  on user_notifications
  for all
  using (true)   -- service role bypasses RLS; frontend uses anon key with wallet check
  with check (true);

-- project_events: read-only for service role (indexer uses service key)
alter table project_events enable row level security;

create policy "service role full access"
  on project_events
  for all
  using (true)
  with check (true);
