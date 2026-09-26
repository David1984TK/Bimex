/**
 * Helpers puros del gráfico de yield histórico (issue #352).
 *
 * Viven fuera del componente para poder probarlos (y reusarlos) sin
 * renderizar SVG. Los montos que devuelve el indexer están en stroops
 * (1 MXNe = 10_000_000 stroops); aquí solo se formatean, nunca se recalculan.
 */
import { formatearNumero } from "./formato.js";

export const STROOPS_POR_MXNE = 10_000_000;

/** Número máximo de etiquetas visibles en el eje X (evita solapamientos). */
export const MAX_ETIQUETAS_X = 6;

/**
 * Normaliza cualquier monto (string, number o bigint) a un bigint válido.
 * Nunca lanza: los datos vienen de la API y un valor raro no debe romper la UI.
 */
export function aStroops(valor) {
  try {
    return BigInt(Math.round(Number(valor ?? 0)));
  } catch {
    return BigInt(0);
  }
}

/**
 * Etiqueta compacta del eje Y: stroops → MXNe con sufijo `k`/`M`.
 * Ej.: 1_000_000_000 → "100", 10_000_000_000 → "1k", 20_000_000_000_000 → "2M".
 */
export function formatearEjeY(stroops) {
  const mxne = Number(aStroops(stroops)) / STROOPS_POR_MXNE;
  const absoluto = Math.abs(mxne);

  if (absoluto >= 1_000_000) return `${formatearNumero(mxne / 1_000_000)}M`;
  if (absoluto >= 1_000) return `${formatearNumero(mxne / 1_000)}k`;
  return formatearNumero(mxne);
}

/**
 * Techo del eje Y a partir de las series visibles. Se toma el máximo de todos
 * los puntos para que varias series compartan la misma escala.
 * Devuelve `minimo` cuando no hay datos (evita dividir entre cero).
 */
export function techoSerie(series = [], minimo = 1) {
  let maximo = 0;

  for (const serie of series) {
    for (const punto of serie?.puntos ?? []) {
      const valor = Number(punto?.yield ?? 0);
      if (Number.isFinite(valor) && valor > maximo) maximo = valor;
    }
  }

  return maximo > 0 ? maximo : minimo;
}

/**
 * Índices de los periodos que reciben etiqueta en el eje X.
 * Con muchos periodos se etiquetan solo `maximo` de ellos, siempre
 * incluyendo el primero y el último, para que el eje siga siendo legible.
 */
export function indicesEtiquetasX(total, maximo = MAX_ETIQUETAS_X) {
  if (!Number.isFinite(total) || total <= 0) return [];
  if (total <= maximo) return Array.from({ length: total }, (_, i) => i);

  const paso = (total - 1) / (maximo - 1);
  const indices = new Set();
  for (let i = 0; i < maximo; i += 1) indices.add(Math.round(i * paso));
  return [...indices].sort((a, b) => a - b);
}
