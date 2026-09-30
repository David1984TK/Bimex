import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processBatch } from '../processor.js';

const CONTRACT_ID = 'CCONTRACT_TEST';

function makeRawEvent({ topic, actor, data, ledger, txHash }) {
  return {
    contract_id: CONTRACT_ID,
    topics: [[topic], [actor]],
    data,
    ledger,
    transaction_hash: txHash,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function makeSorobanMock(records, latestLedger = 200, cursor = 201) {
  return {
    getEvents: vi.fn().mockResolvedValue({
      records,
      latestLedger,
      cursor,
    }),
  };
}

describe('processor.js — cursor-hold and retry', () => {
  let estado;
  let notificarClientes;

  beforeEach(() => {
    estado = {
      ultimoLedger: 0,
      txProcesadas: 0,
      ultimaActualizacion: null,
      rpcLatencyMs: null,
      escriturasFallidas: 0,
      ledgerAtascado: null,
      ultimoErrorEscritura: null,
      ciclosAtascado: 0,
    };
    notificarClientes = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('advances cursor when all writes succeed', async () => {
    const records = [
      makeRawEvent({ topic: 'contribuir', actor: 'GAAA', data: [1, '100', '1700000000'], ledger: 10, txHash: 'tx1' }),
      makeRawEvent({ topic: 'aprobar', actor: 'GADMIN', data: [1], ledger: 11, txHash: 'tx2' }),
    ];
    const soroban = makeSorobanMock(records, 11, 12);
    const insertEvento = vi.fn().mockResolvedValue({ eventoNuevo: true });
    const upsertProyecto = vi.fn().mockResolvedValue();
    const upsertAportacion = vi.fn().mockResolvedValue();
    const insertAuditLog = vi.fn().mockResolvedValue();

    const result = await processBatch(10, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion,
      insertAuditLog,
      notificarClientes,
      estado,
    });

    expect(result.ok).toBe(true);
    expect(result.cursor).toBe(12);
    expect(insertEvento).toHaveBeenCalledTimes(2);
    expect(upsertAportacion).toHaveBeenCalledTimes(1);
    expect(upsertProyecto).toHaveBeenCalledTimes(1);
    expect(estado.txProcesadas).toBe(2);
    expect(estado.ledgerAtascado).toBeNull();
    expect(soroban.getEvents).toHaveBeenCalledWith(expect.objectContaining({ startLedger: 10 }));
  });

  it('does not advance cursor when insertEvento fails — retryFromLedger is failed event ledger', async () => {
    const records = [
      makeRawEvent({ topic: 'contribuir', actor: 'GAAA', data: [1, '100', '1700000000'], ledger: 20, txHash: 'tx_fail' }),
      makeRawEvent({ topic: 'aprobar', actor: 'GADMIN', data: [2], ledger: 21, txHash: 'tx2' }),
    ];
    const soroban = makeSorobanMock(records, 21, 22);
    const insertEvento = vi.fn().mockRejectedValue(new Error('Supabase down'));
    const upsertProyecto = vi.fn().mockResolvedValue();
    const upsertAportacion = vi.fn().mockResolvedValue();
    const insertAuditLog = vi.fn().mockResolvedValue();

    const result = await processBatch(20, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion,
      insertAuditLog,
      notificarClientes,
      estado,
    });

    expect(result.ok).toBe(false);
    expect(result.retryFromLedger).toBe(20);
    expect(result.failedTxHash).toBe('tx_fail');
    // second event in batch must NOT be processed after first failure
    expect(insertEvento).toHaveBeenCalledTimes(1);
    expect(upsertAportacion).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[ALERTA]'));
    expect(estado.escriturasFallidas).toBe(1);
    expect(estado.ledgerAtascado).toBe(20);
    expect(estado.ultimoErrorEscritura).toMatchObject({ tx_hash: 'tx_fail', ledger: 20 });
    expect(estado.ciclosAtascado).toBe(1);
    expect(estado.txProcesadas).toBe(0);
  });

  it('also holds cursor when upsertProyecto fails', async () => {
    const records = [
      makeRawEvent({ topic: 'aprobar', actor: 'GADMIN', data: [5], ledger: 30, txHash: 'tx_aprobar' }),
    ];
    const soroban = makeSorobanMock(records, 30, 31);
    const insertEvento = vi.fn().mockResolvedValue({ eventoNuevo: true });
    const upsertProyecto = vi.fn().mockRejectedValue(new Error('upsert failed'));
    const upsertAportacion = vi.fn().mockResolvedValue();
    const insertAuditLog = vi.fn().mockResolvedValue();

    const result = await processBatch(30, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion,
      insertAuditLog,
      notificarClientes,
      estado,
    });

    expect(result.ok).toBe(false);
    expect(result.retryFromLedger).toBe(30);
    expect(estado.ledgerAtascado).toBe(30);
  });

  it('retries successfully on next cycle after transient failure', async () => {
    const records = [
      makeRawEvent({ topic: 'contribuir', actor: 'GAAA', data: [1, '100', '1700000000'], ledger: 40, txHash: 'tx_retry' }),
    ];

    // first attempt: transient failure
    const soroban1 = makeSorobanMock(records, 40, 41);
    const insertEventoFail = vi.fn().mockRejectedValue(new Error('transient'));
    const estado1 = { ...estado };

    const failResult = await processBatch(40, {
      soroban: soroban1,
      contractId: CONTRACT_ID,
      insertEvento: insertEventoFail,
      upsertProyecto: vi.fn(),
      upsertAportacion: vi.fn().mockResolvedValue(),
      insertAuditLog: vi.fn(),
      notificarClientes,
      estado: estado1,
    });
    expect(failResult.ok).toBe(false);
    expect(failResult.retryFromLedger).toBe(40);

    // second attempt: Supabase recovered — same ledger retried, now succeeds
    const soroban2 = makeSorobanMock(records, 40, 41);
    const insertEventoOk = vi.fn().mockResolvedValue({ eventoNuevo: true });
    const upsertAportacionOk = vi.fn().mockResolvedValue();
    const estado2 = estado1; // same estado object simulates persistent indexer

    const okResult = await processBatch(failResult.retryFromLedger, {
      soroban: soroban2,
      contractId: CONTRACT_ID,
      insertEvento: insertEventoOk,
      upsertProyecto: vi.fn(),
      upsertAportacion: upsertAportacionOk,
      insertAuditLog: vi.fn(),
      notificarClientes,
      estado: estado2,
    });

    expect(okResult.ok).toBe(true);
    expect(okResult.cursor).toBe(41);
    expect(insertEventoOk).toHaveBeenCalledTimes(1);
    expect(upsertAportacionOk).toHaveBeenCalledTimes(1);
    expect(estado2.ledgerAtascado).toBeNull();
    expect(estado2.ciclosAtascado).toBe(0);
  });

  it('skips yield increment when event is duplicate (idempotency)', async () => {
    const records = [
      makeRawEvent({ topic: 'yield', actor: 'GADMIN', data: [10, '250000'], ledger: 50, txHash: 'tx_yield_dup' }),
    ];
    const soroban = makeSorobanMock(records, 50, 51);
    const insertEvento = vi.fn().mockResolvedValue({ eventoNuevo: false });
    const upsertProyecto = vi.fn().mockResolvedValue();
    const upsertAportacion = vi.fn().mockResolvedValue();
    const insertAuditLog = vi.fn().mockResolvedValue();

    const result = await processBatch(50, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion,
      insertAuditLog,
      notificarClientes,
      estado,
    });

    expect(result.ok).toBe(true);
    expect(result.cursor).toBe(51);
    // yield delta must be skipped for duplicate
    expect(upsertProyecto).not.toHaveBeenCalled();
    expect(estado.txProcesadas).toBe(1);
  });

  it('calls yield increment when event is new', async () => {
    const records = [
      makeRawEvent({ topic: 'yield', actor: 'GADMIN', data: [10, '250000'], ledger: 51, txHash: 'tx_yield_new' }),
    ];
    const soroban = makeSorobanMock(records, 51, 52);
    const insertEvento = vi.fn().mockResolvedValue({ eventoNuevo: true });
    const upsertProyecto = vi.fn().mockResolvedValue();

    const result = await processBatch(51, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion: vi.fn(),
      insertAuditLog: vi.fn(),
      notificarClientes,
      estado,
    });

    expect(result.ok).toBe(true);
    expect(upsertProyecto).toHaveBeenCalledWith({ id: 10, yield_entregado_delta: '250000' });
  });

  it('handles backward-compatible insertEvento returning undefined (defaults to eventoNuevo true)', async () => {
    const records = [
      makeRawEvent({ topic: 'yield', actor: 'GADMIN', data: [10, '999'], ledger: 52, txHash: 'tx_compat' }),
    ];
    const soroban = makeSorobanMock(records, 52, 53);
    const insertEvento = vi.fn().mockResolvedValue(undefined);
    const upsertProyecto = vi.fn().mockResolvedValue();

    const result = await processBatch(52, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion: vi.fn(),
      insertAuditLog: vi.fn(),
      notificarClientes,
      estado,
    });

    expect(result.ok).toBe(true);
    // undefined return should be treated as new event -> increment should happen
    expect(upsertProyecto).toHaveBeenCalled();
  });

  it('emits alert and tracks stuck cycles on repeated failures', async () => {
    const records = [
      makeRawEvent({ topic: 'contribuir', actor: 'GAAA', data: [1, '100', '1700000000'], ledger: 60, txHash: 'tx_stuck' }),
    ];
    const insertEvento = vi.fn().mockRejectedValue(new Error('persistent'));
    const soroban = makeSorobanMock(records, 60, 61);

    // simulate 10 consecutive failed cycles
    for (let i = 0; i < 10; i++) {
      await processBatch(60, {
        soroban: makeSorobanMock(records, 60, 61),
        contractId: CONTRACT_ID,
        insertEvento,
        upsertProyecto: vi.fn(),
        upsertAportacion: vi.fn(),
        insertAuditLog: vi.fn(),
        notificarClientes,
        estado,
      });
    }
    expect(estado.ciclosAtascado).toBe(10);
    expect(estado.escriturasFallidas).toBe(10);
    // escalation alert every 10 cycles
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('atascado en ledger 60 durante 10 ciclos'));
  });
});

describe('processor.js — notificaciones por hitos de fondeo', () => {
  let estado;
  let notificarClientes;

  beforeEach(() => {
    estado = {
      ultimoLedger: 0,
      txProcesadas: 0,
      ultimaActualizacion: null,
      rpcLatencyMs: null,
      escriturasFallidas: 0,
      ledgerAtascado: null,
      ultimoErrorEscritura: null,
      ciclosAtascado: 0,
    };
    notificarClientes = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  function contribuirEvent({ monto, ledger = 10, txHash = 'tx_hito' } = {}) {
    return makeRawEvent({
      topic: 'contribuir',
      actor: 'GAAA',
      data: [1, String(monto), '1700000000'],
      ledger,
      txHash,
    });
  }

  function depsBase(overrides = {}) {
    return {
      soroban: makeSorobanMock([contribuirEvent({ monto: 30 })], 10, 11),
      contractId: CONTRACT_ID,
      insertEvento: vi.fn().mockResolvedValue({ eventoNuevo: true }),
      upsertProyecto: vi.fn().mockResolvedValue(),
      upsertAportacion: vi.fn().mockResolvedValue(),
      insertAuditLog: vi.fn().mockResolvedValue(),
      notificarClientes,
      estado,
      ...overrides,
    };
  }

  const hitosEmitidos = () =>
    notificarClientes.mock.calls.filter(([tipo]) => tipo === 'hito_fondeo').map(([, datos]) => datos);

  it('emite hito_fondeo al cruzar el 30% y encola el evento de email', async () => {
    const registrarEventoProyecto = vi.fn().mockResolvedValue();
    const obtenerProyecto = vi
      .fn()
      .mockResolvedValue({ id: 1, meta: 100, total_aportado: 30, nombre: 'Pozo', dueno: 'GOWNER' });

    const result = await processBatch(10, depsBase({ obtenerProyecto, registrarEventoProyecto }));

    expect(result.ok).toBe(true);
    expect(hitosEmitidos()).toHaveLength(1);
    expect(hitosEmitidos()[0]).toMatchObject({ proyectoId: 1, hito: 30, totalAportado: 30, meta: 100 });
    expect(registrarEventoProyecto).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'hito_fondeo', project_id: 1, owner_wallet: 'GOWNER' }),
    );
  });

  it('usa meta_alcanzada al cruzar el 100%', async () => {
    const registrarEventoProyecto = vi.fn().mockResolvedValue();
    const obtenerProyecto = vi
      .fn()
      .mockResolvedValue({ id: 1, meta: 100, total_aportado: 100, nombre: 'Pozo', dueno: 'GOWNER' });
    const deps = depsBase({ obtenerProyecto, registrarEventoProyecto });
    deps.soroban = makeSorobanMock([contribuirEvent({ monto: 100, txHash: 'tx_100' })], 10, 11);

    await processBatch(10, deps);

    expect(hitosEmitidos().map((h) => h.hito)).toContain(100);
    expect(registrarEventoProyecto).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'meta_alcanzada' }),
    );
  });

  it('no emite hito cuando la contribución no cruza ningún umbral', async () => {
    const obtenerProyecto = vi
      .fn()
      .mockResolvedValue({ id: 1, meta: 100, total_aportado: 31, nombre: 'Pozo', dueno: 'GOWNER' });
    const deps = depsBase({ obtenerProyecto });
    deps.soroban = makeSorobanMock([contribuirEvent({ monto: 1, txHash: 'tx_none' })], 10, 11);

    await processBatch(10, deps);

    expect(hitosEmitidos()).toHaveLength(0);
  });

  it('sin obtenerProyecto no notifica hitos (compatibilidad hacia atrás)', async () => {
    const result = await processBatch(10, depsBase());

    expect(result.ok).toBe(true);
    expect(hitosEmitidos()).toHaveLength(0);
  });

  it('un fallo al leer el proyecto no rompe el procesamiento', async () => {
    const obtenerProyecto = vi.fn().mockRejectedValue(new Error('supabase caído'));

    const result = await processBatch(10, depsBase({ obtenerProyecto }));

    expect(result.ok).toBe(true);
    expect(hitosEmitidos()).toHaveLength(0);
  });
});
