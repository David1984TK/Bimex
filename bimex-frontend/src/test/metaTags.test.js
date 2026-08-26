import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { aplicarMeta, crearMetaProyecto, leerProyectoIdDesdePath } from "../utils/metaTags.js";

describe("Bimex metadata", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("defines static Open Graph and Twitter fallbacks in index.html", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('<meta name="description"');
    expect(html).toContain('property="og:title" content="Bimex — Crowdfunding de Impacto Social"');
    expect(html).toContain('property="og:image" content="https://bimex-frontend.vercel.app/og-image.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="any"');
    expect(html).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml"');
  });

  it("builds and applies project-specific social metadata", () => {
    const meta = crearMetaProyecto({
      id: 42,
      nombre: "Biblioteca Solar",
      meta: 200000000n,
      aportado: 100000000n,
      estado: "Liberado",
    });

    aplicarMeta(meta);

    expect(document.title).toBe("Biblioteca Solar — Bimex");
    expect(meta.image).toBe("https://bimex-frontend.vercel.app/api/og?id=42");
    expect(document.head.querySelector('meta[property="og:title"]')?.content).toBe("Biblioteca Solar — Bimex");
    expect(document.head.querySelector('meta[property="og:description"]')?.content).toBe(
      "10.00 MXNe recaudados · faltan 10.00 MXNe para la meta"
    );
    expect(document.head.querySelector('meta[property="og:image"]')?.content).toBe(
      "https://bimex-frontend.vercel.app/api/og?id=42"
    );
    expect(document.head.querySelector('meta[property="og:url"]')?.content).toBe(
      "https://bimex-frontend.vercel.app/proyectos/42"
    );
    expect(document.head.querySelector('meta[name="twitter:image"]')?.content).toBe(
      "https://bimex-frontend.vercel.app/api/og?id=42"
    );
  });

  it("defaults missing aportado/meta to zero without crashing", () => {
    const meta = crearMetaProyecto({ id: 7, nombre: "Sin datos" });

    expect(meta.description).toBe("0.00 MXNe recaudados · faltan 0.00 MXNe para la meta");
  });

  it("builds metadata from an indexer row (numeric strings)", () => {
    const meta = crearMetaProyecto({
      id: 3,
      nombre: "Comedor",
      meta: "3500000000.00",
      total_aportado: "1750000000.00",
    });

    expect(meta.title).toBe("Comedor — Bimex");
    expect(meta.description).toBe("175.00 MXNe recaudados · faltan 175.00 MXNe para la meta");
  });

  it("parses project IDs from share paths", () => {
    expect(leerProyectoIdDesdePath("/proyectos/42")).toBe(42);
    expect(leerProyectoIdDesdePath("/proyectos/42/")).toBe(42);
    expect(leerProyectoIdDesdePath("/")).toBeNull();
  });
});
