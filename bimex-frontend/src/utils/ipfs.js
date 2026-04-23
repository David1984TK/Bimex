// src/utils/ipfs.js
// Uploads a file to IPFS via Pinata. Falls back to SHA-256 if upload fails.

const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

/**
 * Upload a File to IPFS via Pinata.
 * @param {File} archivo
 * @returns {Promise<string>} IPFS CID
 */
export async function subirAIPFS(archivo) {
  const apiKey    = import.meta.env.VITE_PINATA_API_KEY;
  const apiSecret = import.meta.env.VITE_PINATA_SECRET;

  if (!apiKey || !apiSecret) throw new Error("Pinata API keys not configured");

  const formData = new FormData();
  formData.append("file", archivo);

  const res = await fetch(PINATA_URL, {
    method: "POST",
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    },
    body: formData,
  });

  if (!res.ok) throw new Error(`Pinata error: ${res.status}`);
  const data = await res.json();
  return data.IpfsHash;
}

/**
 * SHA-256 hash of a File (fallback).
 * @param {File} archivo
 * @returns {Promise<string>} hex string
 */
export async function sha256Archivo(archivo) {
  const buffer = await archivo.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Upload file to IPFS; on failure return SHA-256 hex as fallback.
 * @param {File} archivo
 * @returns {Promise<{ cid: string|null, fallbackHash: string|null, usedFallback: boolean }>}
 */
export async function subirConFallback(archivo) {
  try {
    const cid = await subirAIPFS(archivo);
    return { cid, fallbackHash: null, usedFallback: false };
  } catch {
    const fallbackHash = await sha256Archivo(archivo);
    return { cid: null, fallbackHash, usedFallback: true };
  }
}
