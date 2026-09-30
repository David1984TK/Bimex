// Hitos de fondeo notificables (porcentaje de la meta del proyecto).
export const HITOS_FONDEO = [30, 50, 75, 100];

/**
 * Porcentaje de fondeo (puede superar 100 si hay sobre-fondeo, aunque el
 * contrato lo impide). Devuelve 0 si la meta no es válida.
 */
export function porcentajeFondeo(totalAportado, meta) {
  const m = Number(meta);
  if (!Number.isFinite(m) || m <= 0) return 0;
  return (Number(totalAportado) / m) * 100;
}

/**
 * Devuelve los hitos cruzados al pasar de `antes` a `despues` (mismas unidades
 * que `meta`). Un hito cuenta cuando `antes < hito <= despues` expresado en
 * porcentaje, de modo que:
 * - el salto que cruza exactamente un umbral lo notifica una sola vez,
 * - un salto grande (p.ej. 20% -> 80%) notifica todos los hitos intermedios,
 * - los aportes que no cruzan ningún umbral no notifican nada.
 */
export function hitosCruzados(antes, despues, meta, hitos = HITOS_FONDEO) {
  const m = Number(meta);
  if (!Number.isFinite(m) || m <= 0) return [];
  const a = Number(antes);
  const d = Number(despues);
  if (!Number.isFinite(a) || !Number.isFinite(d) || d <= a) return [];

  const pctAntes = (a / m) * 100;
  const pctDespues = (d / m) * 100;
  return hitos.filter((hito) => pctAntes < hito && hito <= pctDespues);
}

/**
 * Construye el payload de la notificación de un hito.
 */
export function payloadHito(proyectoId, hito, totalAportado, meta) {
  return {
    proyectoId,
    hito,
    porcentaje: hito,
    totalAportado: Number(totalAportado),
    meta: Number(meta),
  };
}
