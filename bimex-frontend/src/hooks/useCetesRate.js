import { useState, useEffect } from "react";
import { parsearError } from "../utils/errores.js";

const FALLBACK_RATE = 9.45;

/**
 * Fetches the CETES rate through the indexer. Etherfuse credentials never
 * leave the server; a stable fallback keeps the UI usable when the API fails.
 */
export function useCetesRate() {
  const [rate, setRate] = useState(FALLBACK_RATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    fetch(`${import.meta.env.VITE_API_URL || "/api"}/cetes-rate`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`CETES rate request failed (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        const nextRate = Number(data?.rate);
        if (!Number.isFinite(nextRate) || nextRate <= 0) {
          throw new Error("Invalid CETES rate response");
        }
        if (active) setRate(nextRate);
      })
      .catch((err) => {
        if (!active) return;
        setError(parsearError(err));
        setRate(FALLBACK_RATE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { rate, loading, error };
}
