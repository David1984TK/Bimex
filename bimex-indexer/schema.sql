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
create index if not exists eventos_tipo_idx      on eventos(tipo);
create index if not exists eventos_ledger_idx    on eventos(ledger desc);
create index if not exists aportaciones_proj_idx on aportaciones(proyecto_id);

-- Enable Supabase realtime for live frontend updates
alter publication supabase_realtime add table eventos;
alter publication supabase_realtime add table proyectos;
