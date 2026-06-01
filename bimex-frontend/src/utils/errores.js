import * as Sentry from '@sentry/react';

/**
 * Convierte errores técnicos de Soroban/Stellar/red
 * en mensajes legibles para el usuario.
 */
export function parsearError(err) {
  const raw = err?.message || String(err) || "Error desconocido";

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
    return "Sin conexión a internet. Revisa tu red e intenta de nuevo.";
  if (raw.includes("ERR_NAME_NOT_RESOLVED") || raw.includes("DNS"))
    return "No se pudo resolver el servidor. Verifica tu conexión.";
  if (raw.includes("ECONNREFUSED"))
    return "Conexión rechazada por el servidor. El servicio puede estar caído.";

  // ── RPC / Soroban node ────────────────────────────────────────────────────────
  if (raw.includes("502") || raw.includes("503") || raw.includes("Bad Gateway"))
    return "El nodo RPC de Soroban está temporalmente no disponible. Intenta en unos minutos.";
  if (raw.includes("429") || raw.includes("Too Many Requests") || raw.includes("rate limit"))
    return "Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.";
  if (raw.includes("timeout") || raw.includes("Timeout") || raw.includes("ETIMEDOUT"))
    return "La solicitud tardó demasiado. Verifica tu conexión y vuelve a intentar.";
  if (raw.includes("socket hang up") || raw.includes("ECONNRESET"))
    return "La conexión se interrumpió. Intenta de nuevo.";

  // ── Freighter wallet (específico) ─────────────────────────────────────────────
  if (raw.includes("Freighter is not installed") || (raw.includes("freighter") && raw.includes("undefined")))
    return "Freighter no está instalado. Instálalo desde la Chrome Web Store para continuar.";
  if (raw.includes("locked") || raw.includes("Wallet is locked"))
    return "Freighter está bloqueado. Desbloquéalo con tu contraseña e intenta de nuevo.";
  if (raw.includes("not allowed") || raw.includes("Not allowed"))
    return "Freighter no tiene permiso para conectar con esta app. Abre Freighter y acepta la conexión.";
  if (raw.includes("wrong network") || raw.includes("red incorrecta"))
    return "Tu Freighter está en una red diferente. Cámbialo a Testnet (o Mainnet según corresponda).";

  // ── IPFS / Pinata ─────────────────────────────────────────────────────────────
  if (raw.includes("pinata") || raw.includes("IPFS") || raw.includes("ipfs"))
    return "Error al subir documentos a IPFS. Los documentos se guardarán con hash local como respaldo.";
  if (raw.includes("413") || raw.includes("Payload Too Large"))
    return "El archivo es demasiado grande. El límite es 10 MB por documento.";

  // ── Token / MXNe ──────────────────────────────────────────────────────────────
  if (raw.includes("not authorized") && raw.includes("token"))
    return "No tienes autorización para transferir este token. Asegúrate de tener MXNe en tu wallet.";
  if (raw.includes("trustline"))
    return "Tu wallet no tiene una trustline para MXNe. Necesitas agregarla desde Freighter.";
  if (raw.includes("token_transfer") || raw.includes("ClassicOp"))
    return "Error al transferir MXNe. Revisa que tengas saldo suficiente y la trustline activa.";

  // ── Estado / lógica de contrato ───────────────────────────────────────────────
  if (raw.includes("Proyecto no encontrado") || raw.includes("project not found"))
    return "Proyecto no encontrado. Puede haber sido eliminado o el ID es incorrecto.";
  if (raw.includes("Estado incorrecto") || raw.includes("invalid state") || raw.includes("InvalidState"))
    return "Esta acción no está permitida en el estado actual del proyecto.";
  if (raw.includes("Aportacion no encontrada") || raw.includes("contribution not found"))
    return "No tienes una aportación registrada en este proyecto.";
  if (raw.includes("Fecha de inicio") || raw.includes("start_date"))
    return "La fecha de inicio del proyecto no es válida.";
  if (raw.includes("Plazo invalido") || raw.includes("invalid duration"))
    return "El plazo del proyecto no es válido. Debe ser entre 1 y 60 meses.";

  // ── Sesión / autenticación ────────────────────────────────────────────────────
  if (raw.includes("session expired") || raw.includes("sesión expirada"))
    return "Tu sesión ha expirado. Reconecta tu wallet para continuar.";
  if (raw.includes("signature") || raw.includes("Signature"))
    return "Error de firma digital. Intenta firmar la transacción de nuevo en Freighter.";

  // ── Errores de contrato (Soroban / WasmVm) ────────────────────────────────────
  if (raw.includes("HostError") || raw.includes("WasmVm") || raw.includes("UnreachableCode") || raw.includes("InvalidAction")) {
    if (raw.includes("La meta debe ser mayor"))      return "La meta del proyecto debe ser mayor a 0 MXNe.";
    if (raw.includes("alcanzo su meta"))             return "Este proyecto ya alcanzó su meta de financiamiento.";
    if (raw.includes("No hay fondos"))               return "No hay fondos depositados en este proyecto.";
    if (raw.includes("Aun no hay yield"))            return "Todavía no hay yield suficiente acumulado para retirar.";
    if (raw.includes("Principal ya retirado"))       return "Ya retiraste tu capital de este proyecto.";
    if (raw.includes("Ya inicializado"))             return "El contrato ya está inicializado.";
    if (raw.includes("Cantidad debe ser mayor"))     return "La cantidad a depositar debe ser mayor a 0.";
    if (raw.includes("Solo el admin"))               return "Solo el administrador puede realizar esta acción.";
    if (raw.includes("require_auth") || raw.includes("Auth"))
                                                     return "Error de autorización. Verifica que tu wallet esté conectada correctamente.";
    return "Error en el contrato inteligente. El contrato en testnet puede necesitar ser redesPlegado. Contacta al administrador.";
  }

  // ── Errores de Freighter / wallet ─────────────────────────────────────────────
  if (raw.includes("rechazó la firma") || raw.includes("User declined"))
    return "Cancelaste la transacción en Freighter.";
  if (raw.includes("no devolvió una transacción firmada"))
    return "Freighter no devolvió la transacción firmada. Intenta de nuevo.";
  if (raw.includes("Freighter"))
    return "Error con Freighter Wallet. Asegúrate de que esté desbloqueado y en Testnet.";

  // ── Errores de red / RPC ──────────────────────────────────────────────────────
  if (raw.includes("Tiempo de espera agotado"))
    return "La transacción tardó demasiado. Puede haber confirmado igual — verifica en el explorador de Stellar.";
  if (raw.includes("falló en la red") || raw.includes("XDR"))
    return "La transacción fue rechazada por la red. Intenta de nuevo.";
  if (raw.includes("restauración de TTL"))
    return "El contrato requiere restauración de TTL. Contacta al administrador.";
  if (raw.includes("NetworkError") || raw.includes("Failed to fetch") || raw.includes("fetch"))
    return "Error de red. Verifica tu conexión a internet.";
  if (raw.includes("no devolvió valor"))
    return "El contrato no respondió. El RPC puede estar caído — intenta en unos minutos.";

  // ── Errores de saldo / fondos ─────────────────────────────────────────────────
  if (raw.includes("insufficient") || raw.includes("balance") || raw.includes("saldo"))
    return "Saldo insuficiente. Obtén MXNe de prueba con el botón '100 MXNe'.";
  if (raw.includes("op_underfunded"))
    return "Fondos insuficientes en tu wallet para cubrir la transacción.";

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
