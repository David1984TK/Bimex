import { useState, useEffect } from "react";
import { parsearError } from "../utils/errores.js";

const DEFAULT_CETES_RATE = 9.45;

/**
 * Fetches current CETES APY from indexer proxy endpoint (/cetes-rate).
 * Falls back to 9.45 if indexer unavailable, non-200 response, or request fails.
 * Protects secrets by never calling Etherfuse API directly from browser.
 */
export function useCetesRate() {
  const [rate, setRate] = useState(DEFAULT_CETES_RATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    const indexerUrl = import.meta.env.VITE_INDEXER_URL || "";
    const endpoint = indexerUrl ? `${indexerUrl.replace(/\/+$/, "")}/cetes-rate` : "/api/cetes-rate";

    fetch(endpoint)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data) => {
        if (cancelado) return;
        const rawRate = Number(data?.rate ?? data?.tasa ?? DEFAULT_CETES_RATE);
        const validRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : DEFAULT_CETES_RATE;
        setRate(validRate);
      })
      .catch((e) => {
        if (cancelado) return;
        setError(parsearError(e));
        setRate(DEFAULT_CETES_RATE);
      })
      .finally(() => {
        if (!cancelado) {
          setLoading(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return { rate, loading, error };
}

export default useCetesRate;
