-- Migration: API Optimizations & Aggregations (Issue #411)
-- Replaces in-memory table scans with performant database-level aggregations.

-- 1. Function: obtener_stats_agregadas
create or replace function obtener_stats_agregadas()
returns json
language plpgsql
security definer
as $$
declare
  v_total_proyectos bigint;
  v_activos bigint;
  v_total_aportado numeric;
  v_total_yield numeric;
  v_capital_activo numeric;
  v_numero_contribuidores bigint;
begin
  select
    count(*),
    count(*) filter (where estado in ('EtapaInicial', 'EnProgreso', 'Liberado')),
    coalesce(sum(total_aportado), 0),
    coalesce(sum(yield_entregado), 0)
  into
    v_total_proyectos,
    v_activos,
    v_total_aportado,
    v_total_yield
  from proyectos;

  select
    coalesce(sum(monto) filter (where not retirado), 0),
    count(distinct contribuidor) filter (where contribuidor is not null)
  into
    v_capital_activo,
    v_numero_contribuidores
  from aportaciones;

  return json_build_object(
    'total_proyectos', coalesce(v_total_proyectos, 0),
    'activos', coalesce(v_activos, 0),
    'total_aportado', coalesce(v_total_aportado, 0),
    'total_yield', coalesce(v_total_yield, 0),
    'capital_activo', coalesce(v_capital_activo, 0),
    'numero_contribuidores', coalesce(v_numero_contribuidores, 0)
  );
end;
$$;

-- 2. Indexes for fast aggregation and pagination filtering
create index if not exists idx_proyectos_estado on proyectos (estado);
create index if not exists idx_aportaciones_proyecto_id on aportaciones (proyecto_id);
create index if not exists idx_aportaciones_contribuidor on aportaciones (contribuidor);
create index if not exists idx_aportaciones_retirado on aportaciones (retirado);
create index if not exists idx_eventos_tipo_ledger on eventos (tipo, ledger desc);
create index if not exists idx_audit_log_action_time on audit_log (action, block_time desc);
