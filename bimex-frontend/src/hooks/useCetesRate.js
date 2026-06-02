import { useState, useEffect } from "react";
import { parsearError } from "../utils/errores.js";

/**
 * Fetches current CETES APY from Etherfuse sandbox.
 * Falls back to 9.45 if API key not set or request fails.
 */
const ETHERFUSE_API_KEY = import.meta.env.VITE_ETHERFUSE_API_KEY;

export function useCetesRate() {
  const [rate, setRate]     = useState(() => ETHERFUSE_API_KEY ? null : 9.45);
  const [loading, setLoading] = useState(() => !!ETHERFUSE_API_KEY);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!ETHERFUSE_API_KEY) {
      return;
    }
    fetch("https://api.sand.etherfuse.com/v1/assets", {
      headers: { "Authorization": ETHERFUSE_API_KEY }
    })
      .then(r => r.json())
      .then(data => {
        // Try to find CETES APY in response - common field names
        const cetes = Array.isArray(data) ? data.find(a =>
          a.symbol?.includes("CETES") || a.name?.includes("CETES") || a.asset_type?.includes("cetes")
        ) : null;
        const apy = cetes?.apy ?? cetes?.rate ?? cetes?.annual_yield ?? 9.45;
        setRate(Number(apy));
      })
      .catch(e => {
        setError(parsearError(e));
        setRate(9.45);
      })
      .finally(() => setLoading(false));
  }, []);

  return { rate, loading, error };
}
