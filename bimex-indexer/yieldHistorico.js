/**
 * Serie de tiempo del yield generado, construida a partir de los eventos
 * on-chain que el indexer YA persistió en la tabla `eventos`
 * (tipo `yield_reclamado`). No se consulta el contrato ni se recalcula el
 * yield en cada request: la página de transparencia solo lee este agregado.
 *
 * Payload del evento `yield` publicado por el contrato (lib.rs →
 * `reclamar_yield`):
 *
 *   topics = (symbol "yield", dueño)
 *   data   = (id_proyecto, yield_monto, timestamp)
 *
 * LIMITACIÓN DE DATOS CONOCIDA (issue #352): el contrato ya conoce el desglose
 * CETES vs AMM de cada reclamo (`calcular_yield_detallado()` devuelve
 * `YieldDetallado { cetes, amm, total }`), pero el evento publicado hoy solo
 * incluye el total. Por eso el histórico indexado no permite separar fuentes.
 *
 * Si una versión futura del contrato publica el desglose en el evento,
 * `data` pasará a tener 5 elementos: (id_proyecto, total, timestamp, cetes,
 * amm) y este módulo expone automáticamente las series `cetes` y `amm`
 * (`desglose_disponible: true`), sin cambios en el frontend.
 */

export const GRANULARIDADES = ['dia', 'semana', 'mes'];
export const GRANULARIDAD_POR_DEFECTO = 'dia';

export function esGranularidadValida(granularidad) {
  return GRANULARIDADES.includes(granularidad);
}

function numeroODefecto(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Semana ISO-8601 (lunes como primer día) en UTC. */
function semanaISO(fecha) {
  const dia = fecha.getUTCDay() || 7;
  const jueves = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate() + 4 - dia));
  const anio = jueves.getUTCFullYear();
  const inicioAnio = new Date(Date.UTC(anio, 0, 1));
  const semana = Math.ceil(((jueves.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7);
  return { anio, semana };
}

/**
 * Clave de periodo (UTC) usada como etiqueta del eje X.
 * - `dia`    → `2026-09-01`
 * - `semana` → `2026-S36`
 * - `mes`    → `2026-09`
 */
export function clavePeriodo(fechaISO, granularidad = GRANULARIDAD_POR_DEFECTO) {
  const fecha = new Date(fechaISO);
  if (Number.isNaN(fecha.getTime())) return null;

  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');

  if (granularidad === 'mes') return `${anio}-${mes}`;
  if (granularidad === 'semana') {
    const { anio: anioISO, semana } = semanaISO(fecha);
    return `${anioISO}-S${String(semana).padStart(2, '0')}`;
  }
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaDeEvento(evento, timestampOnChain) {
  const desdeDb = evento?.timestamp != null ? new Date(evento.timestamp) : null;
  if (desdeDb && !Number.isNaN(desdeDb.getTime())) return desdeDb.toISOString();

  const segundos = numeroODefecto(timestampOnChain);
  if (segundos == null || segundos <= 0) return null;
  const fecha = new Date(segundos * 1000);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/**
 * Normaliza un evento indexado a un punto de yield.
 * Devuelve `null` si el evento no es un yield reclamado parseable.
 */
export function extraerYieldEvento(evento) {
  const data = evento?.data;
  if (!Array.isArray(data) || data.length < 2) return null;

  const proyectoId = numeroODefecto(data[0]);
  const total = numeroODefecto(data[1]);
  if (proyectoId == null || total == null) return null;

  const fecha = fechaDeEvento(evento, data[2]);
  if (!fecha) return null;

  // El desglose por fuente es opcional: solo existe si el contrato lo publica.
  const cetes = data.length > 3 ? numeroODefecto(data[3]) : null;
  const amm = data.length > 4 ? numeroODefecto(data[4]) : null;

  return { proyectoId, total, cetes, amm, fecha };
}

/**
 * Agrega los eventos de yield indexados en una serie de tiempo.
 *
 * @param {Array<{data?: unknown, timestamp?: string}>} eventos filas de `eventos`
 * @param {{granularidad?: string, proyectoId?: number|string|null}} opciones
 * @returns {{
 *   granularidad: string,
 *   proyecto_id: number|null,
 *   desglose_disponible: boolean,
 *   total_yield: number,
 *   total_cetes: number|null,
 *   total_amm: number|null,
 *   total_eventos: number,
 *   series: Array<{fuente: string, puntos: Array<{periodo: string, yield: number, acumulado: number, eventos: number}>}>
 * }}
 */
export function agregarYieldHistorico(eventos = [], {
  granularidad = GRANULARIDAD_POR_DEFECTO,
  proyectoId = null,
} = {}) {
  const granularidadFinal = esGranularidadValida(granularidad) ? granularidad : GRANULARIDAD_POR_DEFECTO;
  const filtroProyecto = proyectoId == null || proyectoId === '' ? null : Number(proyectoId);

  const normalizados = [];
  for (const evento of eventos ?? []) {
    const ev = extraerYieldEvento(evento);
    if (!ev) continue;
    if (filtroProyecto != null && ev.proyectoId !== filtroProyecto) continue;

    const periodo = clavePeriodo(ev.fecha, granularidadFinal);
    if (!periodo) continue;
    normalizados.push({ ...ev, periodo });
  }

  // El orden cronológico determina los acumulados; no dependemos del orden
  // en que Supabase devolvió las filas.
  normalizados.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));

  const desgloseDisponible = normalizados.some(ev => ev.cetes != null && ev.amm != null);

  const porPeriodo = new Map();
  for (const ev of normalizados) {
    if (!porPeriodo.has(ev.periodo)) {
      porPeriodo.set(ev.periodo, { total: 0, cetes: 0, amm: 0, eventos: 0 });
    }
    const bucket = porPeriodo.get(ev.periodo);
    bucket.total += ev.total;
    bucket.eventos += 1;
    if (desgloseDisponible) {
      bucket.cetes += ev.cetes ?? 0;
      bucket.amm += ev.amm ?? 0;
    }
  }

  const periodos = [...porPeriodo.keys()].sort();

  const construirSerie = (fuente) => {
    let acumulado = 0;
    return periodos.map(periodo => {
      const bucket = porPeriodo.get(periodo);
      acumulado += bucket[fuente];
      return {
        periodo,
        yield: bucket[fuente],
        acumulado,
        eventos: bucket.eventos,
      };
    });
  };

  const series = [{ fuente: 'total', puntos: construirSerie('total') }];
  if (desgloseDisponible) {
    series.push({ fuente: 'cetes', puntos: construirSerie('cetes') });
    series.push({ fuente: 'amm', puntos: construirSerie('amm') });
  }

  const totalDe = (fuente) => periodos.reduce((s, p) => s + porPeriodo.get(p)[fuente], 0);

  return {
    granularidad: granularidadFinal,
    proyecto_id: filtroProyecto,
    desglose_disponible: desgloseDisponible,
    total_yield: totalDe('total'),
    total_cetes: desgloseDisponible ? totalDe('cetes') : null,
    total_amm: desgloseDisponible ? totalDe('amm') : null,
    total_eventos: normalizados.length,
    series,
  };
}

