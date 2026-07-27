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
  const indexerUrl = import.meta.env.VITE_INDEXER_URL;
  if (!indexerUrl) throw new Error("Indexer URL not configured");

  const base64 = await archivoABase64(archivo);

  const res = await fetch(`${indexerUrl}/ipfs-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: archivo.name,
      mimeType: archivo.type,
      base64,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Proxy error: ${res.status}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

function archivoABase64(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(archivo);
  });
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
