import { useState, useEffect } from "react";

/**
 * Fetches current CETES APY from Etherfuse sandbox.
 * Falls back to 9.45 if API key not set or request fails.
 */
export function useCetesRate() {
  const [rate, setRate]     = useState(null);   // number, e.g. 9.45
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_ETHERFUSE_API_KEY;
    if (!apiKey) {
      setRate(9.45);
      setLoading(false);
      return;
    }
    fetch("https://api.sand.etherfuse.com/v1/assets", {
      headers: { "Authorization": apiKey }
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
      .catch(() => setRate(9.45))
      .finally(() => setLoading(false));
  }, []);

  return { rate, loading };
}
