import { describe, it, expect } from "vitest";
import { verificarProxy, verificarConfig } from "../../scripts/check-vercel-proxy.mjs";

describe("vercel.json proxy /api guard (#338)", () => {
  it("no permitte destinos placeholder/falsos en ningun rewrite /api", () => {
    const { hallazgos, avisos } = verificarProxy();
    if (hallazgos.length > 0) {
      const summary = hallazgos.map(h => `[${h.tipo}] ${h.texto}`).join("\n");
      expect.fail(`Rewrites /api inválidos en vercel.json:\n${summary}`);
    }
    expect(hallazgos).toHaveLength(0);
    expect(avisos.some(a => a.tipo === "SIN_REWRITE_PRODUCCION")).toBe(true); // prod aún pendiente (#338)
    expect(avisos.some(a => a.tipo === "SIN_REWRITE_API")).toBe(false);       // staging sí está cableado
  });

  it("detecta un destino placeholder/falso como hallazgo bloqueante", () => {
    const fake = {
      rewrites: [
        { source: "/api/:path*", has: [{ type: "host", value: "bimex-frontend.vercel.app" }], destination: "https://placeholder.example.com/:path*" },
        { source: "/(.*)", destination: "/index.html" },
      ],
    };
    const { hallazgos } = verificarConfig(fake);
    expect(hallazgos.some(h => h.tipo === "HOST_FALSO")).toBe(true);
  });
});