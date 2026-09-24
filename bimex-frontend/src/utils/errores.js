import i18n from "../i18n/index.js";
import * as Sentry from '@sentry/react';

/**
 * Convierte errores técnicos de Soroban/Stellar/red
 * en mensajes legibles para el usuario.
 */
export function parsearError(err) {
  const raw = err?.message || String(err) || i18n.t("errores.desconocido");

  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: {
        tipo: 'error_parseado',
        es_conexion: esErrorDeConexion(err) ? 'si' : 'no',
      },
    });
  }

  // ── Conectividad / sin internet ───────────────────────────────────────────────
  if (!navigator.onLine || raw.includes("ERR_INTERNET_DISCONNECTED") || raw.includes("net::ERR"))
    return i18n.t("errores.sinInternet");
  if (raw.includes("ERR_NAME_NOT_RESOLVED") || raw.includes("DNS"))
    return i18n.t("errores.noDns");
  if (raw.includes("ECONNREFUSED"))
    return i18n.t("errores.connRefused");

  // ── RPC / Soroban node ────────────────────────────────────────────────────────
  if (raw.includes("502") || raw.includes("503") || raw.includes("Bad Gateway"))
    return i18n.t("errores.rpcNoDisponible");
  if (raw.includes("429") || raw.includes("Too Many Requests") || raw.includes("rate limit"))
    return i18n.t("errores.demasiadasSolicitudes");
  if (raw.includes("timeout") || raw.includes("Timeout") || raw.includes("ETIMEDOUT"))
    return i18n.t("errores.timeout");
  if (raw.includes("socket hang up") || raw.includes("ECONNRESET"))
    return i18n.t("errores.connInterrumpida");

  // ── Freighter wallet (específico) ─────────────────────────────────────────────
  if (raw.includes("Freighter is not installed") || (raw.includes("freighter") && raw.includes("undefined")))
    return i18n.t("errores.freighterNoInstalado");
  if (raw.includes("locked") || raw.includes("Wallet is locked"))
    return i18n.t("errores.freighterBloqueado");
  if (raw.includes("not allowed") || raw.includes("Not allowed"))
    return i18n.t("errores.freighterSinPermiso");
  if (raw.includes("wrong network") || raw.includes("red incorrecta"))
    return i18n.t("errores.freighterRedIncorrecta");

  // ── IPFS / Pinata ─────────────────────────────────────────────────────────────
  if (raw.includes("pinata") || raw.includes("IPFS") || raw.includes("ipfs"))
    return i18n.t("errores.ipfsError");
  if (raw.includes("413") || raw.includes("Payload Too Large"))
    return i18n.t("errores.archivoGrande");

  // ── Token / MXNe ──────────────────────────────────────────────────────────────
  if (raw.includes("not authorized") && raw.includes("token"))
    return i18n.t("errores.tokenNoAutorizado");
  if (raw.includes("trustline"))
    return i18n.t("errores.tokenTrustline");
  if (raw.includes("token_transfer") || raw.includes("ClassicOp"))
    return i18n.t("errores.tokenTransfer");

  // ── Estado / lógica de contrato ───────────────────────────────────────────────
  if (raw.includes("Proyecto no encontrado") || raw.includes("project not found"))
    return i18n.t("errores.proyectoNoEncontrado");
  if (raw.includes("Estado incorrecto") || raw.includes("invalid state") || raw.includes("InvalidState"))
    return i18n.t("errores.estadoIncorrecto");
  if (raw.includes("Aportacion no encontrada") || raw.includes("contribution not found"))
    return i18n.t("errores.aportacionNoEncontrada");
  if (raw.includes("Fecha de inicio") || raw.includes("start_date"))
    return i18n.t("errores.fechaInvalida");
  if (raw.includes("Plazo invalido") || raw.includes("invalid duration"))
    return i18n.t("errores.plazoInvalido");

  // ── Sesión / autenticación ────────────────────────────────────────────────────
  if (raw.includes("session expired") || raw.includes("sesión expirada"))
    return i18n.t("errores.sesionExpirada");
  if (raw.includes("signature") || raw.includes("Signature"))
    return i18n.t("errores.firmaError");

  // ── Errores de contrato (Soroban / WasmVm) ────────────────────────────────────
  if (raw.includes("HostError") || raw.includes("WasmVm") || raw.includes("UnreachableCode") || raw.includes("InvalidAction")) {
    if (raw.includes("La meta debe ser mayor"))      return i18n.t("errores.metaMayorCero");
    if (raw.includes("alcanzo su meta"))             return i18n.t("errores.metaAlcanzada");
    if (raw.includes("No hay fondos"))               return i18n.t("errores.sinFondos");
    if (raw.includes("Aun no hay yield"))            return i18n.t("errores.sinYield");
    if (raw.includes("Principal ya retirado"))       return i18n.t("errores.principalYaRetirado");
    if (raw.includes("Ya inicializado"))             return i18n.t("errores.yaInicializado");
    if (raw.includes("Cantidad debe ser mayor"))     return i18n.t("errores.cantidadMayorCero");
    if (raw.includes("Solo el admin"))               return i18n.t("errores.soloAdmin");
    if (raw.includes("require_auth") || raw.includes("Auth"))
                                                     return i18n.t("errores.authError");
    return i18n.t("errores.contratoError");
  }

  // ── Errores de Freighter / wallet ─────────────────────────────────────────────
  if (raw.includes("rechazó la firma") || raw.includes("User declined"))
    return i18n.t("errores.firmaRechazada");
  if (raw.includes("no devolvió una transacción firmada"))
    return i18n.t("errores.freighterNoDevolvio");
  if (raw.includes("Freighter"))
    return i18n.t("errores.freighterGenerico");

  // ── Errores de red / RPC ──────────────────────────────────────────────────────
  if (raw.includes("Tiempo de espera agotado"))
    return i18n.t("errores.esperaAgotada");
  if (raw.includes("falló en la red") || raw.includes("XDR"))
    return i18n.t("errores.txRechazadaRed");
  if (raw.includes("restauración de TTL"))
    return i18n.t("errores.restauracionTtl");
  if (raw.includes("NetworkError") || raw.includes("Failed to fetch") || raw.includes("fetch"))
    return i18n.t("errores.redGenerico");
  if (raw.includes("no devolvió valor"))
    return i18n.t("errores.noDevolvioValor");

  // ── Errores de saldo / fondos ─────────────────────────────────────────────────
  if (raw.includes("insufficient") || raw.includes("balance") || raw.includes("saldo"))
    return i18n.t("errores.saldoInsuficiente");
  if (raw.includes("op_underfunded"))
    return i18n.t("errores.fondosInsuficientes");

  // ── Mensaje genérico (truncado si es muy largo) ───────────────────────────────
  return raw.length > 140 ? raw.slice(0, 140) + "…" : raw;
}

/**
 * Devuelve true si el error es probablemente de red/conectividad
 * (sin internet, timeout, RPC caído) — útil para mostrar botón de reintentar.
 */
export function esErrorDeConexion(err) {
  const raw = err?.message || String(err) || "";
  if (!navigator.onLine) return true;
  return (
    raw.includes("ERR_INTERNET_DISCONNECTED") ||
    raw.includes("net::ERR") ||
    raw.includes("ERR_NAME_NOT_RESOLVED") ||
    raw.includes("DNS") ||
    raw.includes("ECONNREFUSED") ||
    raw.includes("502") ||
    raw.includes("503") ||
    raw.includes("Bad Gateway") ||
    raw.includes("429") ||
    raw.includes("Too Many Requests") ||
    raw.includes("rate limit") ||
    raw.includes("timeout") ||
    raw.includes("Timeout") ||
    raw.includes("ETIMEDOUT") ||
    raw.includes("socket hang up") ||
    raw.includes("ECONNRESET") ||
    raw.includes("NetworkError") ||
    raw.includes("Failed to fetch") ||
    raw.includes("no devolvió valor")
  );
}
