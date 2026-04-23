import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// ─── Configuración ────────────────────────────────────────────────────────────

const _network = import.meta.env.VITE_NETWORK ?? "testnet";
const _isMainnet = _network === "mainnet";

export const CONFIG = {
  CONTRACT_ID: (import.meta.env.VITE_CONTRACT_ID ?? "CAEYEIIH4MHXDVEBAPNGV2LJ7DAO4JSVBIN3E3I6TBK56AMRWERNRM3B").trim(),
  RPC_URL: import.meta.env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org",
  NETWORK_PASSPHRASE: _isMainnet ? Networks.PUBLIC : Networks.TESTNET,
  NETWORK: _network,
  TOKEN_MXNE: import.meta.env.VITE_TOKEN_MXNE ?? "CDDIGHPVTW4PSCQCU67NQ4NXZ4NX5GDLNL3O67WT5RQ4GT6RXIEYPC4P",
  // Tasas reales en producción (bps): 945 = 9.45% CETES, 400 = 4% AMM
  // Tasas demo en testnet: 5000000 / 2000000 (~10 MXNe/min por 16K)
  YIELD_CETES_BPS: _isMainnet ? 945 : 5000000,
  YIELD_AMM_BPS:   _isMainnet ? 400 : 2000000,
};

// ─── Servidor RPC ─────────────────────────────────────────────────────────────

const servidor = new rpc.Server(CONFIG.RPC_URL, { allowHttp: false });
// Cuenta ficticia para simulaciones de lectura (no necesita existir en la red)
const CUENTA_DUMMY = Keypair.random().publicKey();

// ─── Utilidades internas ──────────────────────────────────────────────────────

function dirAScVal(direccion) {
  return new Address(direccion).toScVal();
}

async function simularLectura(metodo, args = []) {
  const contrato = new Contract(CONFIG.CONTRACT_ID);
  let cuentaInfo;
  try {
    cuentaInfo = await servidor.getAccount(CUENTA_DUMMY);
  } catch {
    cuentaInfo = {
      accountId: () => CUENTA_DUMMY,
      sequenceNumber: () => "0",
      incrementSequenceNumber: () => {},
    };
  }

  const tx = new TransactionBuilder(cuentaInfo, {
    fee: BASE_FEE,
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(contrato.call(metodo, ...args))
    .setTimeout(300)
    .build();

  const resultado = await servidor.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(resultado)) {
    throw new Error(`Error en '${metodo}': ${resultado.error}`);
  }
  if (rpc.Api.isSimulationRestore(resultado)) {
    throw new Error(`El contrato requiere restauración de TTL. Contacta al administrador.`);
  }
  if (!resultado.result?.retval) {
    throw new Error(`'${metodo}' no devolvió valor`);
  }

  return scValToNative(resultado.result.retval);
}

async function construirTx(cuentaPublica, metodo, args = []) {
  const contrato = new Contract(CONFIG.CONTRACT_ID);
  const cuentaInfo = await servidor.getAccount(cuentaPublica);

  const tx = new TransactionBuilder(cuentaInfo, {
    fee: "1000000",
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(contrato.call(metodo, ...args))
    .setTimeout(300)
    .build();

  return servidor.prepareTransaction(tx);
}

async function firmarYEnviar(txPreparada, cuentaPublica) {
  const { signedTxXdr, error: errorFirma } = await signTransaction(
    txPreparada.toXDR(),
    { networkPassphrase: CONFIG.NETWORK_PASSPHRASE, address: cuentaPublica }
  );

  if (errorFirma) {
    throw new Error(`Freighter rechazó la firma: ${errorFirma?.message || JSON.stringify(errorFirma)}`);
  }
  if (!signedTxXdr) {
    throw new Error("Freighter no devolvió una transacción firmada.");
  }

  const txFirmada = TransactionBuilder.fromXDR(signedTxXdr, CONFIG.NETWORK_PASSPHRASE);
  const envio = await servidor.sendTransaction(txFirmada);

  if (envio.status === "ERROR") {
    const motivo = envio.errorResult
      ? envio.errorResult.toXDR("base64")
      : "desconocido";
    throw new Error(`La transacción fue rechazada por la red. Detalle: ${motivo}`);
  }

  if (!envio.hash) {
    throw new Error(`La red no aceptó la transacción (status: ${envio.status}). Intenta de nuevo.`);
  }

  let intentos = 0;
  while (intentos < 20) {
    await new Promise((r) => setTimeout(r, 2000));
    const estado = await servidor.getTransaction(envio.hash);
    if (estado.status === rpc.Api.GetTransactionStatus.SUCCESS) return estado;
    if (estado.status === rpc.Api.GetTransactionStatus.FAILED) {
      const xdrFallo = estado.resultXdr ? estado.resultXdr.toXDR("base64") : envio.hash;
      throw new Error(`La transacción falló en la red. XDR: ${xdrFallo}`);
    }
    intentos++;
  }
  throw new Error(`Tiempo de espera agotado. Verifica la TX en el explorador: ${envio.hash}`);
}

// ─── Funciones de LECTURA ─────────────────────────────────────────────────────

/** Devuelve el balance de MXNe del usuario en stroops (BigInt) */
export async function obtenerBalanceMXNe(direccion) {
  try {
    const tokenContrato = new Contract(CONFIG.TOKEN_MXNE);
    const cuentaDummy = {
      accountId: () => Keypair.random().publicKey(),
      sequenceNumber: () => "0",
      incrementSequenceNumber: () => {},
    };
    const tx = new TransactionBuilder(cuentaDummy, {
      fee: BASE_FEE,
      networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContrato.call("balance", new Address(direccion).toScVal()))
      .setTimeout(300)
      .build();
    const resultado = await servidor.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(resultado)) return BigInt(0);
    if (!resultado.result?.retval) return BigInt(0);
    return BigInt(scValToNative(resultado.result.retval) ?? 0);
  } catch {
    return BigInt(0);
  }
}

export async function obtenerTotalProyectos() {
  try {
    console.log("[Bimex] llamando total_proyectos en contrato:", CONFIG.CONTRACT_ID);
    const total = await simularLectura("total_proyectos", []);
    console.log("[Bimex] total_proyectos respuesta:", total);
    return Number(total);
  } catch (e) {
    console.error("[Bimex] Error en total_proyectos:", e);
    return 0;
  }
}

// Soroban codifica enums unitarios como ScvVec de un solo Symbol → scValToNative los devuelve como array ["VariantName"]
// También puede llegar como objeto { VariantName: undefined } o string directo
function decodificarEstado(rawEstado) {
  let nombre;
  if (Array.isArray(rawEstado)) {
    nombre = rawEstado[0];                          // ["EnProgreso"]
  } else if (rawEstado && typeof rawEstado === "object") {
    nombre = Object.keys(rawEstado)[0];             // { EnProgreso: undefined }
  } else if (typeof rawEstado === "string") {
    nombre = rawEstado;                             // "EnProgreso"
  }
  if (nombre === "Liberado")    return "Liberado";
  if (nombre === "Abandonado")  return "Abandonado";
  if (nombre === "EnProgreso")  return "EnProgreso";
  if (nombre === "EnRevision")  return "EnRevision";
  if (nombre === "Rechazado")   return "Rechazado";
  return "EtapaInicial";
}

export async function obtenerProyecto(id) {
  const raw = await simularLectura("obtener_proyecto", [
    nativeToScVal(id, { type: "u32" }),
  ]);

  // doc_hash viene como Buffer/Uint8Array desde scValToNative para BytesN<32>
  let docHash = null;
  if (raw.doc_hash) {
    const bytes = raw.doc_hash instanceof Uint8Array ? raw.doc_hash : new Uint8Array(Object.values(raw.doc_hash));
    // Si todos son cero es un hash vacío (proyecto demo sin docs)
    const esTodosCero = bytes.every(b => b === 0);
    docHash = esTodosCero ? null : bytes;
  }

  return {
    id: Number(id),
    dueno: raw.dueno?.toString() ?? "",
    nombre: raw.nombre?.toString() ?? "",
    meta: BigInt(raw.meta ?? 0),
    aportado: BigInt(raw.total_aportado ?? 0),
    yield_entregado: BigInt(raw.yield_entregado ?? 0),
    estado: decodificarEstado(raw.estado),
    timestamp_inicio: Number(raw.timestamp_inicio ?? 0),
    // Dual-yield
    capital_en_cetes: BigInt(raw.capital_en_cetes ?? 0),
    capital_en_amm: BigInt(raw.capital_en_amm ?? 0),
    yield_cetes_acumulado: BigInt(raw.yield_cetes_acumulado ?? 0),
    yield_amm_acumulado: BigInt(raw.yield_amm_acumulado ?? 0),
    // Verificación documental
    doc_hash: docHash,  // Uint8Array(32) si tiene documentos, null si no
    // Admin
    motivo_rechazo: raw.motivo_rechazo?.toString() ?? "",
  };
}

export async function calcularYield(idProyecto, direccionBacker) {
  try {
    const raw = await simularLectura("calcular_yield", [
      nativeToScVal(idProyecto, { type: "u32" }),
      dirAScVal(direccionBacker),
    ]);
    return BigInt(raw ?? 0);
  } catch {
    return BigInt(0);
  }
}

export async function obtenerAportacion(idProyecto, direccionBacker) {
  try {
    const raw = await simularLectura("obtener_aportacion", [
      nativeToScVal(idProyecto, { type: "u32" }),
      dirAScVal(direccionBacker),
    ]);
    return BigInt(raw?.cantidad ?? 0);
  } catch {
    return BigInt(0);
  }
}

export async function calcularYieldDetallado(idProyecto) {
  try {
    const raw = await simularLectura("calcular_yield_detallado", [
      nativeToScVal(idProyecto, { type: "u32" }),
    ]);
    return {
      cetes: BigInt(raw?.cetes ?? 0),
      amm:   BigInt(raw?.amm   ?? 0),
      total: BigInt(raw?.total ?? 0),
    };
  } catch {
    return { cetes: BigInt(0), amm: BigInt(0), total: BigInt(0) };
  }
}

export async function obtenerEstadoCapital(idProyecto) {
  try {
    const raw = await simularLectura("estado_capital", [
      nativeToScVal(idProyecto, { type: "u32" }),
    ]);
    return {
      en_cetes: BigInt(raw?.en_cetes ?? 0),
      en_amm:   BigInt(raw?.en_amm   ?? 0),
      total:    BigInt(raw?.total    ?? 0),
    };
  } catch {
    return { en_cetes: BigInt(0), en_amm: BigInt(0), total: BigInt(0) };
  }
}

export async function obtenerTodosLosProyectos() {
  const total = await obtenerTotalProyectos();
  if (total === 0) return [];
  const promesas = Array.from({ length: total }, (_, i) =>
    obtenerProyecto(i).catch(() => null)
  );
  const proyectos = await Promise.all(promesas);
  return proyectos.filter(Boolean);
}

// ─── Funciones de ESCRITURA ───────────────────────────────────────────────────

export async function crearProyecto(direccion, nombre, metaMXNe, docHashBytes) {
  // docHashBytes debe ser Uint8Array(32) generado por hashearDocumentos()
  const docHashScVal = xdr.ScVal.scvBytes(Buffer.from(docHashBytes));

  const tx = await construirTx(direccion, "crear_proyecto", [
    dirAScVal(direccion),
    nativeToScVal(nombre, { type: "string" }),
    nativeToScVal(metaMXNe, { type: "i128" }),
    docHashScVal,
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function contribuir(direccion, idProyecto, cantidadMXNe) {
  const tx = await construirTx(direccion, "contribuir", [
    dirAScVal(direccion),
    nativeToScVal(idProyecto, { type: "u32" }),
    nativeToScVal(cantidadMXNe, { type: "i128" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function abandonarProyecto(direccion, idProyecto) {
  const tx = await construirTx(direccion, "abandonar_proyecto", [
    nativeToScVal(idProyecto, { type: "u32" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function solicitarContinuar(direccion, idProyecto) {
  const tx = await construirTx(direccion, "solicitar_continuar", [
    dirAScVal(direccion),
    nativeToScVal(idProyecto, { type: "u32" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function retirarPrincipal(direccion, idProyecto) {
  const tx = await construirTx(direccion, "retirar_principal", [
    dirAScVal(direccion),
    nativeToScVal(idProyecto, { type: "u32" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function aprobarProyecto(direccion, idProyecto) {
  const tx = await construirTx(direccion, "admin_aprobar", [
    nativeToScVal(idProyecto, { type: "u32" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function rechazarProyecto(direccion, idProyecto, motivo) {
  const tx = await construirTx(direccion, "admin_rechazar", [
    nativeToScVal(idProyecto, { type: "u32" }),
    nativeToScVal(motivo, { type: "string" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

export async function reclamarYield(direccion, idProyecto) {
  const tx = await construirTx(direccion, "reclamar_yield", [
    nativeToScVal(idProyecto, { type: "u32" }),
  ]);
  return firmarYEnviar(tx, direccion);
}

// ─── Faucet — solo testnet ────────────────────────────────────────────────────

/**
 * Mintea 100 MXNe de prueba a la dirección indicada.
 * Firma con la clave de faucet (solo testnet, clave en .env.local).
 */
export async function mintearMXNePrueba(direccionDestino) {
  const secretFaucet = import.meta.env.VITE_FAUCET_SECRET;
  if (!secretFaucet) throw new Error("Faucet no configurado (VITE_FAUCET_SECRET)");

  const faucetKeypair = Keypair.fromSecret(secretFaucet);
  const tokenContrato = new Contract(CONFIG.TOKEN_MXNE);
  const cuentaInfo    = await servidor.getAccount(faucetKeypair.publicKey());

  const tx = new TransactionBuilder(cuentaInfo, {
    fee: "1000000",
    networkPassphrase: CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(tokenContrato.call(
      "mint",
      new Address(direccionDestino).toScVal(),
      nativeToScVal(BigInt(1_000_000_000), { type: "i128" }), // 100 MXNe
    ))
    .setTimeout(300)
    .build();

  const txPreparada = await servidor.prepareTransaction(tx);
  txPreparada.sign(faucetKeypair);

  const envio = await servidor.sendTransaction(txPreparada);
  if (envio.status === "ERROR") throw new Error("Faucet tx rechazada por la red");

  let intentos = 0;
  while (intentos < 20) {
    await new Promise(r => setTimeout(r, 2000));
    const estado = await servidor.getTransaction(envio.hash);
    if (estado.status === rpc.Api.GetTransactionStatus.SUCCESS) return 100;
    if (estado.status === rpc.Api.GetTransactionStatus.FAILED)
      throw new Error("Faucet tx falló en la red");
    intentos++;
  }
  throw new Error("Timeout del faucet");
}

// ─── Verificación documental ──────────────────────────────────────────────────

/**
 * Genera el hash bundle SHA-256 de los tres documentos requeridos.
 * Los archivos NUNCA salen del dispositivo — solo se sube el hash a la cadena.
 * @param {File} ine          - Identificación oficial (imagen o PDF)
 * @param {File} plan         - Plan del proyecto (PDF)
 * @param {File} presupuesto  - Presupuesto detallado (PDF)
 * @returns {Promise<Uint8Array>} Hash bundle de 32 bytes
 */
export async function hashearDocumentos(ine, plan, presupuesto) {
  async function sha256Archivo(archivo) {
    const buffer = await archivo.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return new Uint8Array(digest);
  }

  const [h1, h2, h3] = await Promise.all([
    sha256Archivo(ine),
    sha256Archivo(plan),
    sha256Archivo(presupuesto),
  ]);

  // Concatenar los tres hashes de 32 bytes → 96 bytes → un único hash final
  const combinado = new Uint8Array(96);
  combinado.set(h1, 0);
  combinado.set(h2, 32);
  combinado.set(h3, 64);

  const bundleDigest = await crypto.subtle.digest("SHA-256", combinado);
  return new Uint8Array(bundleDigest);
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

export function stroopsAMXNe(stroops) {
  const valor = Number(BigInt(stroops)) / 10_000_000;
  return `${valor.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXNe`;
}

export function mxneAStroops(mxne) {
  return BigInt(Math.round(Number(mxne) * 10_000_000));
}