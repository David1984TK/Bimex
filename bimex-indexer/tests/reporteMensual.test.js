import { describe, it, expect, vi } from 'vitest';

// reporteMensual.js instantiates a Supabase client and a Resend client at module
// load. Stub both so importing the module in tests has no side effects.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: vi.fn(), rpc: vi.fn() }),
}));
vi.mock('resend', () => ({
  Resend: class {
    constructor() {
      this.emails = { send: vi.fn().mockResolvedValue({ error: null }) };
    }
  },
}));

import {
  parseArgs,
  procesarPeriodo,
  parsePeriodo,
  inicioMesUnix,
  finMesUnix,
  formatoMXNe,
  timestampAUnix,
  calcularYield,
  calcularYieldSeguro,
  agruparPorContribuidor,
} from '../jobs/reporteMensual.js';

describe('reporteMensual — parseArgs / period resolution', () => {
  it('--dry-run flag is detected', () => {
    expect(parseArgs(['node', 'reporteMensual.js', '--dry-run'], {}).dryRun).toBe(true);
  });

  it('dryRun is false when the flag is absent', () => {
    expect(parseArgs(['node', 'reporteMensual.js'], {}).dryRun).toBe(false);
  });

  it('--periodo CLI arg wins over env and the default', () => {
    const cfg = parseArgs(
      ['node', 'reporteMensual.js', '--periodo', '2026-05'],
      { REPORTE_PERIODO: '2026-01' },
    );
    expect(cfg.periodo).toBe('2026-05');
  });

  it('REPORTE_PERIODO env is used when no CLI arg is given', () => {
    expect(parseArgs(['node', 'x'], { REPORTE_PERIODO: '2025-12' }).periodo).toBe('2025-12');
  });

  it('defaults to the previous calendar month', () => {
    expect(procesarPeriodo(['node', 'x'], {}, new Date(Date.UTC(2026, 2, 15)))).toBe('2026-02');
  });

  it('previous-month default rolls the year back in January', () => {
    expect(procesarPeriodo(['node', 'x'], {}, new Date(Date.UTC(2026, 0, 3)))).toBe('2025-12');
  });

  it('concurrency and batch size fall back to defaults', () => {
    const cfg = parseArgs(['node', 'x'], {});
    expect(cfg.maxConcurrency).toBe(3);
    expect(cfg.batchSize).toBe(10);
  });

  it('concurrency and batch size are read from env', () => {
    const cfg = parseArgs(['node', 'x'], { REPORTE_CONCURRENCY: '1', REPORTE_BATCH_SIZE: '25' });
    expect(cfg.maxConcurrency).toBe(1);
    expect(cfg.batchSize).toBe(25);
  });
});

describe('reporteMensual — date helpers', () => {
  it('parsePeriodo returns a 0-indexed month', () => {
    expect(parsePeriodo('2026-05')).toEqual({ year: 2026, month: 4 });
  });

  it('inicioMesUnix / finMesUnix bound the month in UTC seconds', () => {
    const inicio = inicioMesUnix(2026, 4); // May 2026
    const fin = finMesUnix(2026, 4);
    expect(inicio).toBe(Math.floor(Date.UTC(2026, 4, 1) / 1000));
    expect(fin).toBe(Math.floor(Date.UTC(2026, 5, 1) / 1000));
    expect(fin - inicio).toBe(31 * 24 * 3600);
  });

  it('timestampAUnix parses ISO strings and passes through numbers', () => {
    expect(timestampAUnix('2023-11-14T22:13:20.000Z')).toBe(1700000000);
    expect(timestampAUnix(1700000000)).toBe(1700000000);
    expect(timestampAUnix('1700000000')).toBe(1700000000);
  });
});

describe('reporteMensual — amount formatting', () => {
  it('converts stroops to a 2-decimal MXNe string', () => {
    expect(formatoMXNe(10_000_000n, 'en-US')).toBe('1.00');
    expect(formatoMXNe(123_456_789n, 'en-US')).toBe('12.35');
  });
});

describe('reporteMensual — yield calculation', () => {
  it('returns 0 when the reference time is at/before the contribution time', () => {
    expect(calcularYield('10000000', 1700000000, 1700000000)).toBe(0n);
    expect(calcularYield('10000000', 1700000000, 1699999999)).toBe(0n);
  });

  it('is the sum of the CETES half and the AMM half', () => {
    const cantidad = 100_000_000n; // 10 MXNe
    const start = 1700000000;
    const end = start + 365 * 24 * 3600; // ~one year
    const minutos = BigInt(Math.floor((end - start) / 60));

    const esperado =
      calcularYieldSeguro(cantidad / 2n, 945n, minutos) +
      calcularYieldSeguro(cantidad - cantidad / 2n, 400n, minutos);

    expect(calcularYield(String(cantidad), start, end)).toBe(esperado);
  });

  it('grows monotonically with elapsed time', () => {
    const start = 1700000000;
    const oneMonth = calcularYield('100000000', start, start + 30 * 24 * 3600);
    const twoMonths = calcularYield('100000000', start, start + 60 * 24 * 3600);
    expect(twoMonths).toBeGreaterThan(oneMonth);
  });

  it('matches the contract formula for a fixed reference case (regression)', () => {
    // 10 MXNe contributed, yield accrued over exactly 90 days.
    const start = 1700000000;
    const end = start + 90 * 24 * 3600;
    expect(calcularYield('100000000', start, end)).toBe(1427854n);
  });

  it('larger contributions are at least proportionally more efficient (integer truncation favours size)', () => {
    const start = 1700000000;
    const end = start + 90 * 24 * 3600;
    const base = calcularYield('100000000', start, end);
    const tenx = calcularYield('1000000000', start, end);
    // Truncation in the contract formula costs small contributions more, so the
    // 10x contribution earns at least 10x — never less.
    expect(tenx).toBeGreaterThanOrEqual(base * 10n);
    expect(tenx).toBeLessThan(base * 20n);
  });
});

describe('reporteMensual — agruparPorContribuidor', () => {
  it('groups contribution rows by wallet address', () => {
    const rows = [
      { contribuidor: 'GA', proyecto_id: 1, monto: '100' },
      { contribuidor: 'GB', proyecto_id: 1, monto: '200' },
      { contribuidor: 'GA', proyecto_id: 2, monto: '300' },
    ];
    const groups = agruparPorContribuidor(rows);
    expect(groups.size).toBe(2);
    expect(groups.get('GA')).toHaveLength(2);
    expect(groups.get('GB')).toHaveLength(1);
    expect(groups.get('GA').map(r => r.proyecto_id)).toEqual([1, 2]);
  });

  it('returns an empty map for empty / nullish input', () => {
    expect(agruparPorContribuidor([]).size).toBe(0);
    expect(agruparPorContribuidor(undefined).size).toBe(0);
  });
});
