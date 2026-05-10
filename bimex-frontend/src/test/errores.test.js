import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parsearError, esErrorDeConexion } from '../utils/errores.js';

describe('parsearError', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "Sin conexión" for ERR_INTERNET_DISCONNECTED', () => {
    const result = parsearError(new Error('net::ERR_INTERNET_DISCONNECTED'));
    expect(result).toContain('Sin conexión');
  });

  it('returns "Sin conexión" when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const result = parsearError(new Error('some error'));
    expect(result).toContain('Sin conexión');
  });

  it('returns message containing "Freighter" for Freighter not installed error', () => {
    const result = parsearError(new Error('Freighter is not installed'));
    expect(result).toContain('Freighter');
  });

  it('returns message containing "Cancelaste" for User declined', () => {
    const result = parsearError(new Error('User declined'));
    expect(result).toContain('Cancelaste');
  });

  it('returns message containing "solicitudes" for rate limit 429', () => {
    const result = parsearError(new Error('429 Too Many Requests'));
    expect(result).toContain('solicitudes');
  });

  it('returns message about timeout for ETIMEDOUT', () => {
    const result = parsearError(new Error('ETIMEDOUT'));
    expect(result.toLowerCase()).toMatch(/tard|tiempo/);
  });

  it('returns message about insufficient funds for "insufficient balance"', () => {
    const result = parsearError(new Error('insufficient balance'));
    expect(result).toMatch(/Saldo insuficiente|Fondos/);
  });

  it('returns message about meta for HostError with meta validation', () => {
    const result = parsearError(new Error('HostError: La meta debe ser mayor'));
    expect(result.toLowerCase()).toContain('meta');
  });

  it('returns message about authorization for HostError require_auth', () => {
    const result = parsearError(new Error('HostError: require_auth failed'));
    expect(result).toContain('autorización');
  });

  it('returns message about IPFS for IPFS upload error', () => {
    const result = parsearError(new Error('IPFS upload failed'));
    expect(result).toContain('IPFS');
  });

  it('returns message about trustline for missing trustline', () => {
    const result = parsearError(new Error('trustline not found'));
    expect(result).toContain('trustline');
  });

  it('returns original message for unknown short error', () => {
    const result = parsearError(new Error('something small'));
    expect(result).toBe('something small');
  });

  it('truncates long unknown error messages with ellipsis', () => {
    const longMessage = 'x'.repeat(200);
    const result = parsearError(new Error(longMessage));
    expect(result.length).toBeLessThanOrEqual(144);
    expect(result).toContain('…');
  });

  it('does not throw and returns a string for null input', () => {
    expect(() => parsearError(null)).not.toThrow();
    expect(typeof parsearError(null)).toBe('string');
  });

  it('does not throw and returns a string for undefined input', () => {
    expect(() => parsearError(undefined)).not.toThrow();
    expect(typeof parsearError(undefined)).toBe('string');
  });
});

describe('esErrorDeConexion', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('returns true for ERR_CONNECTION_REFUSED', () => {
    expect(esErrorDeConexion(new Error('net::ERR_CONNECTION_REFUSED'))).toBe(true);
  });

  it('returns true for Failed to fetch', () => {
    expect(esErrorDeConexion(new Error('Failed to fetch'))).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    expect(esErrorDeConexion(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('returns false for User declined', () => {
    expect(esErrorDeConexion(new Error('User declined'))).toBe(false);
  });

  it('returns false for HostError require_auth', () => {
    expect(esErrorDeConexion(new Error('HostError: require_auth'))).toBe(false);
  });
});
