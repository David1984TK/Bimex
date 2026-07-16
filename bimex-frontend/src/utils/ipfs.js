export const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
export const EXTENSIONES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg'];
export const TAMANO_MAX_MB = 10;
export const TAMANO_MAX_BYTES = TAMANO_MAX_MB * 1024 * 1024;

export function validarArchivo(archivo) {
  if (!archivo) return { valido: false, error: "No se seleccionó ningún archivo" };
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return { valido: false, error: `Tipo no permitido. Usa: ${EXTENSIONES_PERMITIDAS.join(', ')}` };
  }
  if (archivo.size > TAMANO_MAX_BYTES) {
    return { valido: false, error: `El archivo supera el límite de ${TAMANO_MAX_MB}MB` };
  }
  return { valido: true, error: null };
}

// La subida va vía proxy backend (bimex-indexer /ipfs-upload) para que las
// credenciales de Pinata nunca lleguen al bundle público (issue #145).
const PROXY_BASE = import.meta.env.VITE_INDEXER_URL;

export async function archivoABase64(archivo) {
  const buffer = await archivo.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binario = "";
  const CHUNK = 0x8000; // btoa por bloques para no reventar la pila con archivos grandes
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binario += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binario);
}

export async function subirAIPFS(archivo) {
  if (!PROXY_BASE) throw new Error("IPFS proxy not configured");

  const contenidoBase64 = await archivoABase64(archivo);
  const res = await fetch(`${PROXY_BASE}/ipfs-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: archivo.name, tipo: archivo.type, contenidoBase64 }),
  });
  if (!res.ok) throw new Error(`IPFS proxy error: ${res.status}`);
  const data = await res.json();
  return data.cid;
}

export async function sha256Archivo(archivo) {
  const buffer = await archivo.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function subirConFallback(archivo) {
  try {
    const cid = await subirAIPFS(archivo);
    return { cid, fallbackHash: null, usedFallback: false };
  } catch {
    const fallbackHash = await sha256Archivo(archivo);
    return { cid: null, fallbackHash, usedFallback: true };
  }
}

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/** Regex for CIDv0 (Qm…) and CIDv1 (baf…) */
const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[a-z2-7]{58,})$/;

export function esCID(valor) {
  return CID_RE.test(valor?.trim() ?? "");
}

export function cidAUrl(cid) {
  return `${IPFS_GATEWAY}/${cid}`;
}

/**
 * Parsea doc_hash: "CID1|CID2|CID3" → { cids, fallbackHash, esFallback }
 * Orden esperado: [INE, plan, presupuesto]
 */
export function parsearDocHash(docHash) {
  if (!docHash) return { cids: [], fallbackHash: null, esFallback: false };
  const partes = docHash.split("|").map(s => s.trim()).filter(Boolean);
  if (partes.length > 1 || esCID(partes[0])) {
    return { cids: partes, fallbackHash: null, esFallback: false };
  }
  return { cids: [], fallbackHash: partes[0] ?? null, esFallback: true };
}
