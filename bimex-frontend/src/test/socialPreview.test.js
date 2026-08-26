import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_META,
  construirMetaProyecto,
  esCrawlerRedes,
  formatoMXNe,
  idProyectoDesdePath,
  inyectarMetaEnHtml,
} from "../utils/socialPreview.js";

const INDEX_HTML = readFileSync("index.html", "utf8");

describe("esCrawlerRedes", () => {
  it.each([
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; WhatsApp/2.23.20.0)",
    "Twitterbot/1.0",
    "TelegramBot (like TwitterBot)",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "LinkedInBot/1.0",
    "Slackbot-LinkExpanding 1.0",
    "Applebot/0.1 (+http://www.apple.com/go/applebot)",
  ])("detecta crawler: %s", (ua) => {
    expect(esCrawlerRedes(ua)).toBe(true);
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
    "",
    null,
    undefined,
  ])("no marca como crawler: %s", (ua) => {
    expect(esCrawlerRedes(ua)).toBe(false);
  });
});

describe("idProyectoDesdePath", () => {
  it("extrae el id de rutas de proyecto", () => {
    expect(idProyectoDesdePath("/proyectos/42")).toBe(42);
    expect(idProyectoDesdePath("/proyectos/42/")).toBe(42);
  });

  it("rechuta rutas que no son un proyecto numérico", () => {
    expect(idProyectoDesdePath("/proyectos")).toBeNull();
    expect(idProyectoDesdePath("/proyectos/abc")).toBeNull();
    expect(idProyectoDesdePath("/")).toBeNull();
    expect(idProyectoDesdePath(null)).toBeNull();
  });
});

describe("formatoMXNe", () => {
  it("convierte stroops a MXNe con formato es-MX", () => {
    expect(formatoMXNe(123456789n)).toBe("12.35");
    expect(formatoMXNe(0n)).toBe("0.00");
  });
});

describe("inyectarMetaEnHtml", () => {
  it("reemplaza title, description, og y twitter en el HTML estático", () => {
    const meta = construirMetaProyecto({
      id: 9,
      nombre: 'Banco <de> "Alimentos"',
      meta: 1000000000n,
      aportado: 250000000n,
    });
    const html = inyectarMetaEnHtml(INDEX_HTML, meta);

    expect(html).toContain("<title>Banco &lt;de&gt; &quot;Alimentos&quot; — Bimex</title>");
    expect(html).toContain('property="og:title" content="Banco &lt;de&gt; &quot;Alimentos&quot; — Bimex"');
    expect(html).toContain('name="twitter:image" content="https://bimex-frontend.vercel.app/api/og?id=9"');
    expect(html).toContain('property="og:description" content="25.00 MXNe recaudados · faltan 75.00 MXNe para la meta"');
    // El resto del documento permanece intacto
    expect(html).toContain('<div id="root"></div>');
  });

  it("inserta tags faltantes antes de </head>", () => {
    const minimo = "<!doctype html><html><head></head><body></body></html>";
    const html = inyectarMetaEnHtml(minimo, DEFAULT_META);

    expect(html).toContain('property="og:title" content="Bimex — Crowdfunding de Impacto Social"');
    expect(html.indexOf('property="og:title"')).toBeLessThan(html.indexOf("</head>"));
  });

  it("sin proyecto devuelve las meta genéricas", () => {
    expect(construirMetaProyecto(null)).toEqual(DEFAULT_META);
    expect(construirMetaProyecto(undefined)).toEqual(DEFAULT_META);
  });
});
