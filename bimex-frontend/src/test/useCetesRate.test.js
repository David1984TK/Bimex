import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

describe('useCetesRate hook', () => {

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('retorna fallback 9.45 inmediatamente cuando no hay VITE_ETHERFUSE_API_KEY', async () => {
    vi.stubEnv('VITE_ETHERFUSE_API_KEY', '');
    const { useCetesRate } = await import('../hooks/useCetesRate.js');
    const { result } = renderHook(() => useCetesRate());

    expect(result.current.rate).toBe(9.45);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('obtiene y parsea la tasa CETES exitosamente cuando la API responde con array', async () => {
    vi.stubEnv('VITE_ETHERFUSE_API_KEY', 'test-etherfuse-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { symbol: 'MXN-TREASURY', name: 'Other Bond', apy: 5.0 },
        { symbol: 'CETES-28', name: 'CETES 28 Días', apy: 11.25 },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useCetesRate } = await import('../hooks/useCetesRate.js');
    const { result } = renderHook(() => useCetesRate());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rate).toBe(11.25);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('https://api.sand.etherfuse.com/v1/assets', {
      headers: { Authorization: 'test-etherfuse-key' },
    });
  });

  it('soporta campos alternativos rate y annual_yield en la respuesta', async () => {
    vi.stubEnv('VITE_ETHERFUSE_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ asset_type: 'cetes', annual_yield: 10.75 }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useCetesRate } = await import('../hooks/useCetesRate.js');
    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rate).toBe(10.75);
    expect(result.current.error).toBeNull();
  });

  it('usa 9.45 de respaldo cuando no se encuentra ningún activo CETES en la lista', async () => {
    vi.stubEnv('VITE_ETHERFUSE_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ symbol: 'USD-BOND', apy: 4.5 }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useCetesRate } = await import('../hooks/useCetesRate.js');
    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeNull();
  });

  it('maneja error de red manteniendo el fallback 9.45 y guardando el error', async () => {
    vi.stubEnv('VITE_ETHERFUSE_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', fetchMock);

    const { useCetesRate } = await import('../hooks/useCetesRate.js');
    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeTruthy();
  });

  it('maneja respuesta con fallo de parseo JSON o error HTTP', async () => {
    vi.stubEnv('VITE_ETHERFUSE_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON response'); },
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useCetesRate } = await import('../hooks/useCetesRate.js');
    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeTruthy();
  });
});
