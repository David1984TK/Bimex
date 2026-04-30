/**
 * Convierte errores técnicos de Soroban/Stellar/red
 * en mensajes legibles para el usuario.
 */
export function parsearError(err) {
  const raw = err?.message || String(err) || "Error desconocido";

  // ── Errores de contrato (Soroban / WasmVm) ────────────────────────────────
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
    // Error genérico de contrato (raro)
    return "Error en el contrato inteligente. El contrato en testnet puede necesitar ser redesPlegado. Contacta al administrador.";
  }

  // ── Errores de Freighter / wallet ─────────────────────────────────────────
  if (raw.includes("rechazó la firma") || raw.includes("User declined"))
    return "Cancelaste la transacción en Freighter.";
  if (raw.includes("no devolvió una transacción firmada"))
    return "Freighter no devolvió la transacción firmada. Intenta de nuevo.";
  if (raw.includes("Freighter"))
    return "Error con Freighter Wallet. Asegúrate de que esté desbloqueado y en Testnet.";

  // ── Errores de red / RPC ──────────────────────────────────────────────────
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

  // ── Errores de saldo / fondos ─────────────────────────────────────────────
  if (raw.includes("insufficient") || raw.includes("balance") || raw.includes("saldo"))
    return "Saldo insuficiente. Obtén MXNe de prueba con el botón '100 MXNe'.";
  if (raw.includes("op_underfunded"))
    return "Fondos insuficientes en tu wallet para cubrir la transacción.";

  // ── Mensaje genérico (truncado si es muy largo) ───────────────────────────
  return raw.length > 140 ? raw.slice(0, 140) + "…" : raw;
}
