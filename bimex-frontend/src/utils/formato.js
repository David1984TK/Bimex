import i18n from '../i18n';

export function formatearMXNe(stroops) {
  const b = typeof stroops === "bigint" ? stroops : BigInt(stroops ?? 0);
  const valor = Number(b / BigInt(10_000_000)) + Number(b % BigInt(10_000_000)) / 10_000_000;
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatearFecha(timestamp) {
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp * 1000));
}

export function formatearPorcentaje(valor) {
  return new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(valor / 100);
}

export function formatearNumero(numero) {
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);
}

export function formatearNumeroConDecimales(numero, decimales = 2) {
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(numero);
}
