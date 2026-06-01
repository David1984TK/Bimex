import i18n from '../i18n';

/**
 * Formatea stroops (unidades de MXNe) a formato legible con locale
 * @param {bigint|number|string} stroops - Cantidad en stroops (1 MXNe = 10^7 stroops)
 * @returns {string} Valor formateado con 2 decimales
 */
export function formatearMXNe(stroops) {
  const valor = Number(stroops) / 1e7;
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formatea un timestamp Unix a fecha legible con locale
 * @param {number} timestamp - Timestamp Unix en segundos
 * @returns {string} Fecha formateada
 */
export function formatearFecha(timestamp) {
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp * 1000));
}

/**
 * Formatea un porcentaje con locale
 * @param {number} valor - Valor del porcentaje (ej: 5 para 5%)
 * @returns {string} Porcentaje formateado
 */
export function formatearPorcentaje(valor) {
  return new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(valor / 100);
}

/**
 * Formatea un número con locale (sin decimales)
 * @param {number} numero - Número a formatear
 * @returns {string} Número formateado
 */
export function formatearNumero(numero) {
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);
}

/**
 * Formatea un número con decimales específicos
 * @param {number} numero - Número a formatear
 * @param {number} decimales - Cantidad de decimales (default: 2)
 * @returns {string} Número formateado
 */
export function formatearNumeroConDecimales(numero, decimales = 2) {
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero);
}
