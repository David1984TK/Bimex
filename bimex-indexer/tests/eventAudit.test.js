import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseEvent,
  TOPIC_TO_EVENT,
  CONTRACT_EVENT_SYMBOLS,
} from '../eventParser.js';
import { buildEventFilters, processBatch } from '../processor.js';

describe('Event Schema & Audit Tests (Contrato ↔ Indexer)', () => {
  const CONTRACT_ID = 'CCONTRACT1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234';

  it('anti-desfase: todos los eventos emitidos en lib.rs tienen handler en el indexer', () => {
    const libRsPath = path.resolve(process.cwd(), '../bimex/contracts/bimex/src/lib.rs');
    expect(fs.existsSync(libRsPath), `lib.rs should exist at ${libRsPath}`).toBe(true);

    const libRsContent = fs.readFileSync(libRsPath, 'utf8');

    // Extraer todos los symbol_short!(...) publicados en env.events().publish(...)
    const eventPublishRegex = /env\.events\(\)\.publish\(\s*\(\s*(?:soroban_sdk::)?symbol_short!\("([^"]+)"\)/g;
    const emittedSymbols = new Set();
    let match;
    while ((match = eventPublishRegex.exec(libRsContent)) !== null) {
      emittedSymbols.add(match[1]);
    }

    expect(emittedSymbols.size).toBeGreaterThanOrEqual(9);

    for (const sym of emittedSymbols) {
      // 1. Debe estar en CONTRACT_EVENT_SYMBOLS
      expect(
        CONTRACT_EVENT_SYMBOLS,
        `El símbolo '${sym}' emitido en lib.rs debe estar en CONTRACT_EVENT_SYMBOLS`
      ).toContain(sym);

      // 2. Debe estar mapeado en TOPIC_TO_EVENT
      expect(
        TOPIC_TO_EVENT[sym],
        `El símbolo '${sym}' debe tener un tipo de evento definido en TOPIC_TO_EVENT`
      ).toBeDefined();

      // 3. Debe ser procesado sin crashear por parseEvent
      const dummyEvent = {
        contractId: CONTRACT_ID,
        topic: [sym, 'GDLCJGQLXZGDAAT5QGRF6FM2MBEER3FPYGCSVPXYL47G2ABIOX2M2S6K'],
        value: [1, '100', '1700000000'],
        ledger: 100,
        txHash: '0x123',
        ledgerClosedAt: '2026-01-01T00:00:00Z',
      };
      const parsed = parseEvent(dummyEvent, CONTRACT_ID);
      expect(parsed, `parseEvent no debe retornar null para símbolo '${sym}'`).not.toBeNull();
      expect(parsed.evento.fn_name).toBe(sym);
    }
  });

  it('buildEventFilters genera filtros compatibles con los límites de Soroban RPC', () => {
    const filters = buildEventFilters(CONTRACT_ID);
    expect(filters.length).toBeGreaterThan(0);
    expect(filters.length).toBeLessThanOrEqual(5);

    for (const f of filters) {
      expect(f.type).toBe('contract');
      expect(f.contractIds).toEqual([CONTRACT_ID]);
      expect(f.topics.length).toBe(2);

      // Segmento 0: <= 4 matchers en base64
      expect(f.topics[0].length).toBeLessThanOrEqual(4);
      for (const matcher of f.topics[0]) {
        expect(typeof matcher).toBe('string');
        // Valid base64 check
        expect(/^[A-Za-z0-9+/=]+$/.test(matcher)).toBe(true);
      }

      // Segmento 1: comodín '*'
      expect(f.topics[1]).toEqual(['*']);
    }
  });

  it('procesa el fixture real con XDR crudo de Testnet', () => {
    const fixturePath = path.resolve('tests/fixtures/realGetEvents.json');
    const rawFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const [aportarEv, admChgEv, propUpgEv] = rawFixture.events;

    // 1. Validar evento aportar
    const resAportar = parseEvent(aportarEv, CONTRACT_ID);
    expect(resAportar).not.toBeNull();
    expect(resAportar.evento.fn_name).toBe('aportar');
    expect(resAportar.evento.tipo).toBe('nueva_aportacion');
    expect(resAportar.aportacion).toEqual({
      proyecto_id: 10,
      contribuidor: 'GDLCJGQLXZGDAAT5QGRF6FM2MBEER3FPYGCSVPXYL47G2ABIOX2M2S6K',
      monto: '50000000',
      timestamp: '1791939000',
    });

    // 2. Validar evento adm_chg
    const resAdmChg = parseEvent(admChgEv, CONTRACT_ID);
    expect(resAdmChg).not.toBeNull();
    expect(resAdmChg.evento.fn_name).toBe('adm_chg');
    expect(resAdmChg.evento.tipo).toBe('admin_action');
    expect(resAdmChg.audit).toBeDefined();
    expect(resAdmChg.audit.action).toBe('adm_chg');
    expect(resAdmChg.audit.target).toBe('contract');
    expect(resAdmChg.audit.metadata.admin_actual).toBeTruthy();
    expect(resAdmChg.audit.metadata.nuevo_admin).toBeTruthy();

    // 3. Validar evento prop_upg
    const resPropUpg = parseEvent(propUpgEv, CONTRACT_ID);
    expect(resPropUpg).not.toBeNull();
    expect(resPropUpg.evento.fn_name).toBe('prop_upg');
    expect(resPropUpg.evento.tipo).toBe('admin_action');
    expect(resPropUpg.audit).toBeDefined();
    expect(resPropUpg.audit.action).toBe('prop_upg');
    expect(resPropUpg.audit.target).toBe('contract');
    expect(resPropUpg.audit.metadata.new_wasm_hash).toBeTruthy();
  });

  it('processBatch integra eventos reales y alimenta aportaciones y audit_log', async () => {
    const fixturePath = path.resolve('tests/fixtures/realGetEvents.json');
    const rawFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const soroban = {
      getEvents: vi.fn().mockResolvedValue({
        events: rawFixture.events,
        latestLedger: rawFixture.latestLedger,
      }),
    };

    const insertEvento = vi.fn().mockResolvedValue({ eventoNuevo: true });
    const upsertProyecto = vi.fn().mockResolvedValue();
    const upsertAportacion = vi.fn().mockResolvedValue();
    const insertAuditLog = vi.fn().mockResolvedValue();
    const notificarClientes = vi.fn();

    const result = await processBatch(5183145, {
      soroban,
      contractId: CONTRACT_ID,
      insertEvento,
      upsertProyecto,
      upsertAportacion,
      insertAuditLog,
      notificarClientes,
    });

    expect(result.ok).toBe(true);
    expect(insertEvento).toHaveBeenCalledTimes(3);
    expect(upsertAportacion).toHaveBeenCalledTimes(1);
    expect(upsertAportacion).toHaveBeenCalledWith(
      expect.objectContaining({
        proyecto_id: 10,
        contribuidor: 'GDLCJGQLXZGDAAT5QGRF6FM2MBEER3FPYGCSVPXYL47G2ABIOX2M2S6K',
        monto: '50000000',
      })
    );

    // adm_chg and prop_upg both generate audit_log entries
    expect(insertAuditLog).toHaveBeenCalledTimes(2);
    expect(insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'adm_chg' })
    );
    expect(insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'prop_upg' })
    );
  });

  it('retrocompatibilidad: soporta el formato legado "contribuir"', () => {
    const rawEvent = {
      contract_id: CONTRACT_ID,
      topics: [['contribuir'], ['GDLCJGQLXZGDAAT5QGRF6FM2MBEER3FPYGCSVPXYL47G2ABIOX2M2S6K']],
      data: [1, '1000', '1700000000'],
      ledger: 50,
      transaction_hash: 'tx_legacy',
      created_at: '2025-01-01T00:00:00Z',
    };

    const res = parseEvent(rawEvent, CONTRACT_ID);
    expect(res).not.toBeNull();
    expect(res.evento.tipo).toBe('nueva_aportacion');
    expect(res.aportacion.proyecto_id).toBe(1);
    expect(res.aportacion.monto).toBe('1000');
  });
});
