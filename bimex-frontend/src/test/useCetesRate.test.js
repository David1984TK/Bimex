import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCetesRate } from "../hooks/useCetesRate.js";

describe("useCetesRate", () => {
  afterEach(() => {
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
    expect(fetch).toHaveBeenCalledWith("/api/cetes-rate");
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
