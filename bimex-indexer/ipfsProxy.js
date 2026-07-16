// Proxy de subida a IPFS (Pinata).
// Mantiene las credenciales de Pinata en el servidor (issue #145): el frontend
// manda el archivo en base64 y este módulo lo sube con PINATA_API_KEY/PINATA_SECRET,
// que nunca se bundlean en el JS público.

export const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
export const TAMANO_MAX_BYTES = 10 * 1024 * 1024; // mismo límite que el frontend (10MB)
// El JSON con base64 infla ~4/3 el tamaño del archivo; margen para nombre/tipo.
export const MAX_CUERPO_BYTES = Math.ceil(TAMANO_MAX_BYTES * 4 / 3) + 4096;

const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/** Tamaño real en bytes de un string base64 (sin decodificarlo). */
export function tamanoBase64(b64) {
  const sinPadding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor(b64.length * 3 / 4) - sinPadding;
}

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export function validarUploadIpfs(body) {
  const { nombre, tipo, contenidoBase64 } = body ?? {};
  if (!nombre || typeof nombre !== 'string' || nombre.length > 255) {
    return { valido: false, error: 'Falta "nombre" o es inválido' };
  }
  if (!TIPOS_PERMITIDOS.includes(tipo)) {
    return { valido: false, error: 'Tipo de archivo no permitido' };
  }
  if (!contenidoBase64 || typeof contenidoBase64 !== 'string' || !BASE64_RE.test(contenidoBase64)) {
    return { valido: false, error: 'Falta "contenidoBase64" o no es base64 válido' };
  }
  if (tamanoBase64(contenidoBase64) > TAMANO_MAX_BYTES) {
    return { valido: false, error: 'El archivo supera el límite de 10MB' };
  }
  return { valido: true, error: null };
}

/**
 * Lee el cuerpo del request con un tope de bytes; aborta la conexión si lo supera.
 * Local a este endpoint porque los uploads necesitan un límite mucho mayor que
 * el resto de la API.
 */
export function leerCuerpoLimitado(req, maxBytes = MAX_CUERPO_BYTES) {
  return new Promise((resolve, reject) => {
    let recibido = 0;
    const chunks = [];
    req.on('data', chunk => {
      recibido += chunk.length;
      if (recibido > maxBytes) {
        req.destroy();
        const err = new Error('Cuerpo demasiado grande');
        err.statusCode = 413;
        return reject(err);
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('Cuerpo inválido: se esperaba JSON')); }
    });
    req.on('error', reject);
  });
}

export function pinataConfigurado() {
  return Boolean(process.env.PINATA_API_KEY && process.env.PINATA_SECRET);
}

/** Sube el archivo a Pinata desde el servidor. Devuelve el CID. */
export async function subirAPinata({ nombre, tipo, contenidoBase64 }) {
  if (!pinataConfigurado()) {
    const err = new Error('Pinata no está configurado en el servidor');
    err.statusCode = 503;
    throw err;
  }
  const buffer = Buffer.from(contenidoBase64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: tipo }), nombre);

  const res = await fetch(PINATA_URL, {
    method: 'POST',
    headers: {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET,
    },
    body: form,
  });
  if (!res.ok) {
    const err = new Error(`Pinata respondió ${res.status}`);
    err.statusCode = 502;
    throw err;
  }
  const data = await res.json();
  return data.IpfsHash;
}
