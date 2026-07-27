import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { handleIpfsUpload } from '../ipfsProxy.js';

const BASE64_1X1_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const BASE64_INVALID = 'not-valid-base64!!!';
const PDF_FILENAME = 'documento.pdf';
const PNG_FILENAME = 'imagen.png';
const JPG_FILENAME = 'foto.jpg';
const JPEG_FILENAME = 'foto.jpeg';

function mockReq(body, { limitBytes } = {}) {
  const json = JSON.stringify(body);
  const buf = Buffer.from(json);
  const stream = Readable.from([buf]);
  if (limitBytes) {
    const limited = Readable.from([buf.slice(0, limitBytes)]);
    return limited;
  }
  return stream;
}

describe('handleIpfsUpload', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.PINATA_API_KEY = 'test-key';
    process.env.PINATA_SECRET = 'test-secret';
  });

  it('acepta PDF válido y sube a Pinata', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: 'QmTest123' }),
    });
    const req = mockReq({ filename: PDF_FILENAME, mimeType: 'application/pdf', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(200);
    expect(result.data.IpfsHash).toBe('QmTest123');
  });

  it('acepta PNG válido y sube a Pinata', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: 'QmPngHash' }),
    });
    const req = mockReq({ filename: PNG_FILENAME, mimeType: 'image/png', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(200);
    expect(result.data.IpfsHash).toBe('QmPngHash');
  });

  it('acepta JPEG válido', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: 'QmJpgHash' }),
    });
    const req = mockReq({ filename: JPG_FILENAME, mimeType: 'image/jpg', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(200);
  });

  it('acepta jpeg extensión .jpeg', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: 'QmJpegHash' }),
    });
    const req = mockReq({ filename: JPEG_FILENAME, mimeType: 'image/jpeg', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(200);
  });

  it('rechaza tipo MIME no permitido', async () => {
    const req = mockReq({ filename: 'archivo.zip', mimeType: 'application/zip', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Tipo no permitido/);
  });

  it('rechaza extensión no permitida', async () => {
    const req = mockReq({ filename: 'virus.exe', mimeType: 'application/pdf', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Extensión no permitida/);
  });

  it('rechaza base64 inválido', async () => {
    const req = mockReq({ filename: PDF_FILENAME, mimeType: 'application/pdf', base64: BASE64_INVALID });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Base64 inválido/);
  });

  it('rechaza archivo que excede 10MB (el límite de cuerpo atrapa la sobrecarga base64)', async () => {
    const grande = Buffer.alloc(11 * 1024 * 1024).toString('base64');
    const req = mockReq({ filename: PDF_FILENAME, mimeType: 'application/pdf', base64: grande });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/límite/);
  });

  it('rechaza campos faltantes', async () => {
    const req = mockReq({ filename: PDF_FILENAME });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Faltan campos requeridos/);
  });

  it('rechaza cuerpo vacío', async () => {
    const req = mockReq({});
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/Faltan campos requeridos/);
  });

  it('rechaza cuerpo que excede el límite de bytes', async () => {
    const grande = 'x'.repeat(12 * 1024 * 1024);
    const req = mockReq({ data: grande });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/límite/);
  });

  it('retorna 502 cuando Pinata falla', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    const req = mockReq({ filename: PDF_FILENAME, mimeType: 'application/pdf', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(502);
    expect(result.error).toMatch(/Error al subir a IPFS/);
  });

  it('retorna 502 cuando el fetch a Pinata falla por red', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    const req = mockReq({ filename: PDF_FILENAME, mimeType: 'application/pdf', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(502);
    expect(result.error).toMatch(/Error al subir a IPFS/);
  });

  it('retorna 502 cuando las keys de Pinata no están configuradas', async () => {
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET;
    const req = mockReq({ filename: PDF_FILENAME, mimeType: 'application/pdf', base64: BASE64_1X1_PNG });
    const result = await handleIpfsUpload(req);
    expect(result.status).toBe(502);
    expect(result.error).toMatch(/Error al subir a IPFS/);
  });
});
