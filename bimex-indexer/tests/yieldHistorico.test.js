import { describe, it, expect } from 'vitest';
import {
  GRANULARIDADES,
  clavePeriodo,
  esGranularidadValida,
  extraerYieldEvento,
  agregarYieldHistorico,
} from '../yieldHistorico.js';

/** Evento indexado tal como lo guarda el indexer (data = [id, monto, ts]). */
function evento(proyectoId, monto, fechaISO, extra = []) {
  return {
    tipo: 'yield_reclamado',
    data: [proyectoId, monto, Math.floor(new Date(fechaISO).getTime() / 1000), ...extra],
    timestamp: fechaISO,
  };
}

describe('clavePeriodo', () => {
  it('agrupa por día, semana ISO y mes en UTC', () => {
    const fecha = '2026-09-03T23:30:00.000Z'; // jueves

    expect(clavePeriodo(fecha, 'dia')).toBe('2026-09-03');
    expect(clavePeriodo(fecha, 'semana')).toBe('2026-S36');
    expect(clavePeriodo(fecha, 'mes')).toBe('2026-09');
  });

  it('respeta el límite de año de la semana ISO', () => {
    // 2027-01-01 es viernes: pertenece a la semana 53 de 2026.
    expect(clavePeriodo('2027-01-01T00:00:00.000Z', 'semana')).toBe('2026-S53');
  });

  it('devuelve null para fechas inválidas', () => {
    expect(clavePeriodo('no-es-fecha', 'dia')).toBeNull();
  });

  it('usa granularidad diaria por defecto', () => {
    expect(clavePeriodo('2026-09-03T00:00:00.000Z')).toBe('2026-09-03');
  });
});

describe('esGranularidadValida', () => {
  it('acepta solo las granularidades soportadas', () => {
    expect(GRANULARIDADES).toEqual(['dia', 'semana', 'mes']);
    for (const g of GRANULARIDADES) expect(esGranularidadValida(g)).toBe(true);
    expect(esGranularidadValida('trimestre')).toBe(false);
    expect(esGranularidadValida(undefined)).toBe(false);
  });
});

describe('extraerYieldEvento', () => {
  it('normaliza el payload del evento yield', () => {
    const ev = extraerYieldEvento(evento(3, 1500, '2026-09-01T10:00:00.000Z'));

    expect(ev).toMatchObject({
      proyectoId: 3,
      total: 1500,
      cetes: null,
      amm: null,
      fecha: '2026-09-01T10:00:00.000Z',
    });
  });

  it('lee el desglose CETES/AMM cuando el evento lo incluye', () => {
    const ev = extraerYieldEvento(evento(1, 300, '2026-09-01T10:00:00.000Z', [200, 100]));

    expect(ev).toMatchObject({ total: 300, cetes: 200, amm: 100 });
  });

  it('cae al timestamp on-chain si la fila no tiene columna timestamp', () => {
    const segundos = Math.floor(new Date('2026-05-04T12:00:00.000Z').getTime() / 1000);

    const ev = extraerYieldEvento({ tipo: 'yield_reclamado', data: [1, 10, segundos] });

    expect(ev.fecha).toBe('2026-05-04T12:00:00.000Z');
  });

  it('descarta eventos sin payload o sin fecha utilizable', () => {
    expect(extraerYieldEvento(null)).toBeNull();
    expect(extraerYieldEvento({ data: 'no-array' })).toBeNull();
    expect(extraerYieldEvento({ data: [1] })).toBeNull();
    expect(extraerYieldEvento({ data: ['x', 'y', 123] })).toBeNull();
    expect(extraerYieldEvento({ data: [1, 5], timestamp: null })).toBeNull();
    expect(extraerYieldEvento({ data: [1, 5], timestamp: 'no-es-fecha', })).toBeNull();
  });
});

describe('agregarYieldHistorico', () => {
  it('agrupa por periodo, suma montos y calcula acumulados', () => {
    const res = agregarYieldHistorico([
      evento(1, 1000, '2026-09-01T09:00:00.000Z'),
      evento(2, 2000, '2026-09-01T18:00:00.000Z'),
      evento(1, 500, '2026-09-03T09:00:00.000Z'),
    ]);

    expect(res.granularidad).toBe('dia');
    expect(res.total_yield).toBe(3500);
    expect(res.total_eventos).toBe(3);
    expect(res.series).toHaveLength(1);
    expect(res.series[0].fuente).toBe('total');
    expect(res.series[0].puntos).toEqual([
      { periodo: '2026-09-01', yield: 3000, acumulado: 3000, eventos: 2 },
      { periodo: '2026-09-03', yield: 500, acumulado: 3500, eventos: 1 },
    ]);
    expect(res.desglose_disponible).toBe(false);
    expect(res.total_cetes).toBeNull();
    expect(res.total_amm).toBeNull();
  });

  it('ordena cronológicamente aunque las filas lleguen desordenadas', () => {
    const res = agregarYieldHistorico([
      evento(1, 500, '2026-09-03T09:00:00.000Z'),
      evento(1, 1000, '2026-09-01T09:00:00.000Z'),
    ], { granularidad: 'mes' });

    expect(res.series[0].puntos.map(p => p.periodo)).toEqual(['2026-09']);
    expect(res.series[0].puntos[0]).toEqual({ periodo: '2026-09', yield: 1500, acumulado: 1500, eventos: 2 });
  });

  it('filtra por proyecto cuando se pide uno específico', () => {
    const eventos = [
      evento(1, 1000, '2026-09-01T09:00:00.000Z'),
      evento(2, 7000, '2026-09-02T09:00:00.000Z'),
    ];

    const res = agregarYieldHistorico(eventos, { proyectoId: 1 });

    expect(res.proyecto_id).toBe(1);
    expect(res.total_yield).toBe(1000);
    expect(res.total_eventos).toBe(1);
  });

  it('expone las series CETES y AMM cuando el desglose está disponible', () => {
    const res = agregarYieldHistorico([
      evento(1, 300, '2026-09-01T09:00:00.000Z', [200, 100]),
      evento(1, 700, '2026-09-02T09:00:00.000Z', [400, 300]),
    ]);

    expect(res.desglose_disponible).toBe(true);
    expect(res.series.map(s => s.fuente)).toEqual(['total', 'cetes', 'amm']);
    expect(res.total_cetes).toBe(600);
    expect(res.total_amm).toBe(400);

    const cetes = res.series.find(s => s.fuente === 'cetes');
    expect(cetes.puntos).toEqual([
      { periodo: '2026-09-01', yield: 200, acumulado: 200, eventos: 1 },
      { periodo: '2026-09-02', yield: 400, acumulado: 600, eventos: 1 },
    ]);
  });

  it('devuelve una serie vacía sin eventos válidos', () => {
    const res = agregarYieldHistorico([null, { data: [] }, { data: [1, 5], timestamp: null }]);

    expect(res.total_eventos).toBe(0);
    expect(res.total_yield).toBe(0);
    expect(res.series[0].puntos).toEqual([]);
  });

  it('cae a granularidad diaria si se pasa una inválida', () => {
    const res = agregarYieldHistorico([evento(1, 10, '2026-09-01T09:00:00.000Z')], { granularidad: 'anual' });

    expect(res.granularidad).toBe('dia');
  });
});
