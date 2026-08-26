import { parseEvent } from './eventParser.js';

/**
 * Procesa un batch de eventos de Soroban con garantía de no avanzar el
 * cursor si alguna escritura a Supabase falla de forma persistente.
 *
 * Idempotency:
 * - insertEvento usa upsert con ignoreDuplicates + count:'exact' y reporta
 *   eventoNuevo. Si el evento ya existía, los incrementos de yield se omiten
 *   para evitar doble conteo al reprocesar tras un fallo parcial.
 * - Todos los demás upserts son idempotentes por onConflict.
 *
 * @param {number} startLedger - ledger desde el que pedir eventos (inclusivo)
 * @param {object} deps - dependencias inyectables (para testabilidad)
 * @param {object} deps.soroban - cliente rpc.Server con getEvents
 * @param {string} deps.contractId
 * @param {Function} deps.insertEvento
 * @param {Function} deps.upsertProyecto
 * @param {Function} deps.upsertAportacion
 * @param {Function} deps.insertAuditLog
 * @param {Function} deps.notificarClientes
 * @param {object} [deps.estado] - objeto mutable para métricas/health
 * @returns {Promise<{ok: boolean, cursor?: number, retryFromLedger?: number, failedTxHash?: string, error?: Error}>}
 */
export async function processBatch(startLedger, deps) {
  const {
    soroban,
    contractId,
    insertEvento,
    upsertProyecto,
    upsertAportacion,
    insertAuditLog,
    notificarClientes,
    estado,
  } = deps;

  const inicioRpc = Date.now();
  const resp = await soroban.getEvents({
    startLedger,
    filters: [{
      contractIds: [contractId],
      topics: [['contribuir'], ['yield'], ['retiro'], ['aprobar'], ['rechazar'], ['pausar'], ['reanudar'], ['upgrade']],
    }],
    pagination: { limit: 200 },
  });
  const finRpc = Date.now();
  if (estado) estado.rpcLatencyMs = finRpc - inicioRpc;

  const records = resp.records ?? resp.events ?? [];
  if (estado) {
    estado.ultimoLedger = resp.latestLedger ?? startLedger;
    estado.ultimaActualizacion = new Date().toISOString();
  }

  for (const event of records) {
    const parsed = parseEvent(event, contractId);
    if (!parsed) continue;

    const { evento, proyecto, aportacion, audit } = parsed;

    let eventoNuevo = true;
    try {
      const res = await insertEvento(evento);
      if (res && typeof res.eventoNuevo === 'boolean') {
        eventoNuevo = res.eventoNuevo;
      }

      const isYieldDelta = proyecto && proyecto.yield_entregado_delta != null;
      if (proyecto) {
        if (isYieldDelta && !eventoNuevo) {
          // duplicate yield event already counted — skip increment to keep idempotency
        } else {
          await upsertProyecto(proyecto);
        }
      }
      if (aportacion) await upsertAportacion(aportacion);
      if (audit) await insertAuditLog(audit);
    } catch (err) {
      const msg = `[ALERTA] Escritura fallida ledger=${evento.ledger} tipo=${evento.tipo} tx=${evento.tx_hash}: ${err.message}. Cursor no avanza, se reintentará.`;
      console.error(msg);
      if (estado) {
        estado.escriturasFallidas = (estado.escriturasFallidas ?? 0) + 1;
        estado.ledgerAtascado = evento.ledger;
        estado.ultimoErrorEscritura = {
          tx_hash: evento.tx_hash,
          tipo: evento.tipo,
          ledger: evento.ledger,
          mensaje: err.message,
          timestamp: new Date().toISOString(),
        };
        estado.ciclosAtascado = (estado.ciclosAtascado ?? 0) + 1;
        if (estado.ciclosAtascado % 10 === 0) {
          console.error(
            `[ALERTA] Indexer atascado en ledger ${estado.ledgerAtascado} durante ${estado.ciclosAtascado} ciclos. Supabase no disponible o evento corrupto. Requiere intervención.`
          );
        }
      }
      return { ok: false, retryFromLedger: evento.ledger, failedTxHash: evento.tx_hash, error: err };
    }

    // Only after successful writes: update counters and emit SSE
    if (estado) estado.txProcesadas = (estado.txProcesadas ?? 0) + 1;

    if (proyecto) {
      try { notificarClientes('proyecto_actualizado', { id: proyecto.id, estado: proyecto.estado }); } catch (_) {}
    }
    if (aportacion) {
      try { notificarClientes('nueva_contribucion', { proyectoId: aportacion.proyecto_id, monto: aportacion.monto }); } catch (_) {}
    }
    if (audit) {
      try { notificarClientes('admin_action', { action: audit.action, target: audit.target }); } catch (_) {}
    }
    if (evento.tipo === 'yield_reclamado') {
      try { notificarClientes('yield_reclamado', { proyectoId: proyecto?.id ?? null, monto: proyecto?.yield_entregado_delta ?? null }); } catch (_) {}
    }

    console.log(`[${new Date().toISOString()}] ${evento.tipo} ledger=${evento.ledger} tx=${evento.tx_hash}`);
  }

  // All events in batch persisted — clear stuck state
  if (estado) {
    estado.ledgerAtascado = null;
    estado.ciclosAtascado = 0;
  }

  const cursor = resp.cursor ?? (resp.latestLedger != null ? resp.latestLedger + 1 : startLedger);
  return { ok: true, cursor };
}
