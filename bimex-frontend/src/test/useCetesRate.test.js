import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCetesRate } from "../hooks/useCetesRate.js";

describe("useCetesRate hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("VITE_INDEXER_URL", "https://api.bimex.fi");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("obtiene la tasa CETES del indexer proxy exitosamente", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rate: 11.25, source: "etherfuse" }),
    });

    const { result } = renderHook(() => useCetesRate());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith("https://api.bimex.fi/cetes-rate");
    expect(result.current.rate).toBe(11.25);
    expect(result.current.error).toBeNull();
  });

  it("usa fallback de 9.45 cuando el indexer responde con código no-ok (ej. 502)", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: "Etherfuse upstream error" }),
    });

    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeDefined();
  });

  it("usa fallback de 9.45 cuando ocurre un error de red", async () => {
    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeDefined();
  });

  it("usa endpoint relativo /api/cetes-rate si VITE_INDEXER_URL no está definido", async () => {
    vi.stubEnv("VITE_INDEXER_URL", "");

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ rate: 10.5 }),
    });

    const { result } = renderHook(() => useCetesRate());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith("/api/cetes-rate");
    expect(result.current.rate).toBe(10.5);
  });

  it("cancela actualización de estado si se desmonta antes de resolver", async () => {
    let resolveFetch;
    fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { unmount } = renderHook(() => useCetesRate());

    unmount();

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ rate: 12.0 }),
    });
  });
});
