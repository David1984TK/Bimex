import { describe, it, expect } from 'vitest';
import { validarArchivo, TIPOS_PERMITIDOS, TAMANO_MAX_BYTES } from '../utils/ipfs.js';

describe('validarArchivo', () => {
  it('should invalidate undefined/null file', () => {
    const res = validarArchivo(null);
    expect(res.valido).toBe(false);
    expect(res.error).toBe('No se seleccionó ningún archivo');
  });

  it('should validate correct PDF file', () => {
    const file = {
      name: 'test.pdf',
      type: 'application/pdf',
      size: 1024 * 1024 // 1MB
    };
    const res = validarArchivo(file);
    expect(res.valido).toBe(true);
    expect(res.error).toBeNull();
  });

  it('should validate correct PNG file', () => {
    const file = {
      name: 'test.png',
      type: 'image/png',
      size: 5 * 1024 * 1024 // 5MB
    };
    const res = validarArchivo(file);
    expect(res.valido).toBe(true);
    expect(res.error).toBeNull();
  });

  it('should invalidate .exe file', () => {
    const file = {
      name: 'test.exe',
      type: 'application/x-msdownload',
      size: 1024 * 1024 // 1MB
    };
    const res = validarArchivo(file);
    expect(res.valido).toBe(false);
    expect(res.error).toContain('Tipo no permitido');
  });

  it('should invalidate file larger than 10MB', () => {
    const file = {
      name: 'large.pdf',
      type: 'application/pdf',
      size: 11 * 1024 * 1024 // 11MB
    };
    const res = validarArchivo(file);
    expect(res.valido).toBe(false);
    expect(res.error).toContain('El archivo supera el límite de 10MB');
  });
});
