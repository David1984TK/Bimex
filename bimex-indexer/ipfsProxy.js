const TIPOS_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const EXTENSIONES_PERMITIDAS = ['.pdf', '.png', '.jpg', '.jpeg'];
const TAMANO_MAX_BYTES = 10 * 1024 * 1024;
const CUERPO_LIMITE_BYTES = TAMANO_MAX_BYTES + 1024 * 1024;
const PINATA_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

function leerCuerpoConLimite(req, limiteBytes) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let totalBytes = 0;
    let done = false;

    req.on('data', chunk => {
      if (done) return;
      totalBytes += chunk.length;
      if (totalBytes > limiteBytes) {
        done = true;
        reject(new Error(`El cuerpo supera el límite de ${limiteBytes} bytes`));
        return;
      }
      raw += chunk;
    });

    req.on('end', () => {
      if (done) return;
      done = true;
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Cuerpo inválido: se esperaba JSON')); }
    });

    req.on('error', err => {
      if (done) return;
      done = true;
      reject(err);
    });
  });
}

function validarExtension(filename) {
  if (!filename || typeof filename !== 'string') return false;
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return false;
  const ext = filename.slice(idx).toLowerCase();
  return EXTENSIONES_PERMITIDAS.includes(ext);
}

function esBase64Valido(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  try {
    const decoded = Buffer.from(str, 'base64');
    return decoded.toString('base64') === str;
  } catch {
    return false;
  }
}

function tamanoBase64(str) {
  const padding = str.endsWith('==') ? 2 : str.endsWith('=') ? 1 : 0;
  return Math.floor(str.length * 3 / 4) - padding;
}

async function subirAPinata(base64, mimeType, filename) {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('Pinata keys not configured on server');
  }

  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);

  const res = await fetch(PINATA_URL, {
    method: 'POST',
    headers: { pinata_api_key: apiKey, pinata_secret_api_key: apiSecret },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Pinata error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

export async function handleIpfsUpload(req) {
  let body;
  try {
    body = await leerCuerpoConLimite(req, CUERPO_LIMITE_BYTES);
  } catch (e) {
    return { status: 400, error: e.message };
  }

  if (!body || !body.filename || !body.mimeType || !body.base64) {
    return { status: 400, error: 'Faltan campos requeridos: filename, mimeType, base64' };
  }

  if (!TIPOS_PERMITIDOS.includes(body.mimeType)) {
    return { status: 400, error: `Tipo no permitido. Usa: ${EXTENSIONES_PERMITIDAS.join(', ')}` };
  }

  if (!validarExtension(body.filename)) {
    return { status: 400, error: `Extensión no permitida. Usa: ${EXTENSIONES_PERMITIDAS.join(', ')}` };
  }

  if (!esBase64Valido(body.base64)) {
    return { status: 400, error: 'Base64 inválido' };
  }

  const decodificado = tamanoBase64(body.base64);
  if (decodificado > TAMANO_MAX_BYTES) {
    return { status: 400, error: 'El archivo supera el límite de 10MB' };
  }

  try {
    const IpfsHash = await subirAPinata(body.base64, body.mimeType, body.filename);
    return { status: 200, data: { IpfsHash } };
  } catch (e) {
    console.error('[ipfs] Error al subir a Pinata:', e.message);
    return { status: 502, error: 'Error al subir a IPFS' };
  }
}
