import { describe, it, expect } from 'vitest';
import {
  validarUploadIpfs,
  tamanoBase64,
  TIPOS_PERMITIDOS,
  TAMANO_MAX_BYTES,
  pinataConfigurado,
} from '../ipfsProxy.js';

const pdfBase64 = Buffer.from('%PDF-1.4 contenido de prueba').toString('base64');

describe('tamanoBase64', () => {
  it('calcula el tamaño decodificado sin decodificar', () => {
    const original = 'hola mundo con acentos áéí';
    const b64 = Buffer.from(original).toString('base64');
    expect(tamanoBase64(b64)).toBe(Buffer.byteLength(original));
  });

  it('maneja padding simple y doble', () => {
    expect(tamanoBase64(Buffer.from('ab').toString('base64'))).toBe(2);   // 'YWI=' (1 pad)
    expect(tamanoBase64(Buffer.from('a').toString('base64'))).toBe(1);    // 'YQ==' (2 pad)
    expect(tamanoBase64(Buffer.from('abc').toString('base64'))).toBe(3);  // sin pad
  });
});

describe('validarUploadIpfs', () => {
  const valido = { nombre: 'ine.pdf', tipo: 'application/pdf', contenidoBase64: pdfBase64 };

  it('acepta un upload válido', () => {
    expect(validarUploadIpfs(valido)).toEqual({ valido: true, error: null });
  });

  it('acepta todos los tipos permitidos', () => {
    for (const tipo of TIPOS_PERMITIDOS) {
      expect(validarUploadIpfs({ ...valido, tipo }).valido).toBe(true);
    }
  });

  it('rechaza body ausente o vacío', () => {
    expect(validarUploadIpfs(undefined).valido).toBe(false);
    expect(validarUploadIpfs({}).valido).toBe(false);
  });

  it('rechaza tipo no permitido', () => {
    const res = validarUploadIpfs({ ...valido, tipo: 'application/x-msdownload' });
    expect(res.valido).toBe(false);
    expect(res.error).toContain('Tipo');
  });

  it('rechaza nombre ausente o demasiado largo', () => {
    expect(validarUploadIpfs({ ...valido, nombre: '' }).valido).toBe(false);
    expect(validarUploadIpfs({ ...valido, nombre: 'x'.repeat(256) }).valido).toBe(false);
  });

  it('rechaza contenido que no es base64', () => {
    const res = validarUploadIpfs({ ...valido, contenidoBase64: 'no es base64 !!!' });
    expect(res.valido).toBe(false);
    expect(res.error).toContain('base64');
  });

  it('rechaza archivos que superan el límite de 10MB', () => {
    // String base64 que representa > TAMANO_MAX_BYTES sin materializar 10MB reales de entropía
    const grande = 'A'.repeat(Math.ceil((TAMANO_MAX_BYTES + 1024) * 4 / 3 / 4) * 4);
    const res = validarUploadIpfs({ ...valido, contenidoBase64: grande });
    expect(res.valido).toBe(false);
    expect(res.error).toContain('10MB');
  });
});

describe('pinataConfigurado', () => {
  it('refleja la presencia de las env vars', () => {
    const prevKey = process.env.PINATA_API_KEY;
    const prevSecret = process.env.PINATA_SECRET;
    delete process.env.PINATA_API_KEY;
    delete process.env.PINATA_SECRET;
    expect(pinataConfigurado()).toBe(false);
    process.env.PINATA_API_KEY = 'k';
    process.env.PINATA_SECRET = 's';
    expect(pinataConfigurado()).toBe(true);
    if (prevKey === undefined) delete process.env.PINATA_API_KEY; else process.env.PINATA_API_KEY = prevKey;
    if (prevSecret === undefined) delete process.env.PINATA_SECRET; else process.env.PINATA_SECRET = prevSecret;
  });
});
