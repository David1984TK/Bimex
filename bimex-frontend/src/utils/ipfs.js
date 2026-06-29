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

export async function subirAIPFS(archivo) {
  const validacion = validarArchivo(archivo);
  if (!validacion.valido) throw new Error(validacion.error);
  const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  if (!API_URL) throw new Error('Indexer API not configured');

  const formData = new FormData();
  formData.append('file', archivo);

  const res = await fetch(`${API_URL}/upload-ipfs`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    let message = `IPFS proxy error: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Keep generic status message when the proxy does not return JSON.
    }
    throw new Error(message);
  }

  const data = await res.json();
  if (!data?.IpfsHash) throw new Error('IPFS proxy response missing IpfsHash');
  return data.IpfsHash;
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
