import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCetesRate } from "../hooks/useCetesRate.js";

describe("useCetesRate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the rate returned by the indexer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rate: 9.7 }),
    }));

    const { result } = renderHook(() => useCetesRate());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rate).toBe(9.7);
    expect(result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL || "/api"}/cetes-rate`);
  });

  it("reads the indexer URL from VITE_API_URL when configured", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3001");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rate: 9.7 }),
    }));

    const { result } = renderHook(() => useCetesRate());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/cetes-rate");
    expect(result.current.rate).toBe(9.7);
    expect(result.current.error).toBeNull();
  });

  it("falls back to 9.45 with no API key in the frontend when the indexer fails", async () => {
    vi.stubEnv("VITE_API_URL", undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { result } = renderHook(() => useCetesRate());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetch).toHaveBeenCalledWith("/api/cetes-rate");
    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeTruthy();
  });

  it("falls back when the HTTP response is not successful", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    const { result } = renderHook(() => useCetesRate());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeTruthy();
  });

  it("falls back when the network request rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    const { result } = renderHook(() => useCetesRate());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeTruthy();
  });

  it("falls back when the response contains an invalid rate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rate: "not-a-number" }),
    }));

    const { result } = renderHook(() => useCetesRate());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rate).toBe(9.45);
    expect(result.current.error).toBeTruthy();
  });

  it("does not update state after unmount", async () => {
    let resolveResponse;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => {
      resolveResponse = resolve;
    })));

    const { unmount } = renderHook(() => useCetesRate());
    unmount();

    await act(async () => {
      resolveResponse({ ok: true, json: async () => ({ rate: 9.7 }) });
    });
  });
});
