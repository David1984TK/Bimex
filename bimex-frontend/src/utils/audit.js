import { esDireccionValida } from "./stellar.js";

/**
 * Builds the query string for the /audit endpoint from user-supplied filter
 * values, always going through URLSearchParams so every value is
 * percent-encoded (never interpolated raw into the URL).
 * @param {object} filtros
 * @param {string} [filtros.action] - action filter, "Todos" means "no filter".
 * @param {string} [filtros.actor] - Stellar address typed by the user.
 * @param {string} [filtros.startDate]
 * @param {string} [filtros.endDate]
 * @param {Record<string, string|number>} [extra] - extra params (e.g. limit/offset).
 * @returns {URLSearchParams}
 */
export function construirAuditParams({ action, actor, startDate, endDate } = {}, extra = {}) {
  const params = new URLSearchParams(extra);
  if (action && action !== "Todos") params.set("action", action);
  const actorTrim = actor?.trim();
  if (actorTrim && esDireccionValida(actorTrim)) params.set("actor", actorTrim);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return params;
}

/**
 * Builds the full, safely-encoded URL for exporting the audit log as CSV.
 * @param {string} apiUrl
 * @param {object} filtros - see construirAuditParams.
 * @returns {string}
 */
export function construirAuditCsvUrl(apiUrl, filtros) {
  const params = construirAuditParams(filtros, { format: "csv" });
  return `${apiUrl}/audit?${params}`;
}
