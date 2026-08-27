// Helpers puros para vistas previas sociales (OG/Twitter).
// Sin imports de SDK ni del DOM — se usan tanto en el cliente
// (metaTags.js) como en el Edge Middleware y la función /api/og.

export const SITE_URL = "https://bimex-frontend.vercel.app";

export const DEFAULT_META = {
  title: "Bimex — Crowdfunding de Impacto Social",
  description:
    "Aporta MXNe a proyectos sociales. El rendimiento financia el impacto. Tu capital siempre regresa.",
  image: `${SITE_URL}/og-image.png`,
  url: SITE_URL,
};

// Crawlers de redes/mensajería que NO ejecutan JavaScript al scrapear:
// Facebook/WhatsApp/Messenger, X/Twitter, Telegram, Discord, LinkedIn, Slack, iMessage.
const CRAWLERS_RE =
  /facebookexternalhit|facebookcatalog|Twitterbot|WhatsApp|TelegramBot|Discordbot|LinkedInBot|Slackbot|Slack-ImgProxy|Applebot|embedly|quora link preview|vkShare|XING-contenttabreceiver/i;

export function esCrawlerRedes(userAgent) {
  return typeof userAgent === "string" && CRAWLERS_RE.test(userAgent);
}

export function idProyectoDesdePath(pathname) {
  const match = String(pathname ?? "").match(/^\/proyectos\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function aStroops(valor) {
  try {
    const n = Number(valor ?? 0);
    return Number.isFinite(n) ? BigInt(Math.round(n)) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}

export function formatoMXNe(stroops) {
  const b = aStroops(stroops);
  const valor = Number(b / BigInt(10_000_000)) + Number(b % BigInt(10_000_000)) / 10_000_000;
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Construye las meta tags de un proyecto.
 * Acepta tanto la forma del contrato ({ nombre, meta, aportado } en BigInt/stroops)
 * como la fila del indexer ({ nombre, meta, total_aportado } en numeric/string).
 */
export function construirMetaProyecto(proyecto) {
  if (!proyecto) return DEFAULT_META;
  const nombre = proyecto.nombre || "Proyecto Bimex";
  const meta = aStroops(proyecto.meta);
  const aportado = aStroops(proyecto.aportado ?? proyecto.total_aportado);
  const recaudado = formatoMXNe(aportado);
  const faltante = formatoMXNe(meta > aportado ? meta - aportado : 0n);
  const image =
    proyecto.id !== undefined && proyecto.id !== null
      ? `${SITE_URL}/api/og?id=${Number(proyecto.id)}`
      : DEFAULT_META.image;
  return {
    title: `${nombre} — Bimex`,
    description: `${recaudado} MXNe recaudados · faltan ${faltante} MXNe para la meta`,
    image,
    url: `${SITE_URL}/proyectos/${proyecto.id}`,
  };
}

function escaparHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function reemplazarMeta(html, tipoAttr, clave, content) {
  const re = new RegExp(`(<meta[^>]*${tipoAttr}="${clave}"[^>]*?content=")[^"]*(")`);
  if (re.test(html)) {
    return html.replace(re, `$1${escaparHtml(content)}$2`);
  }
  const tag = `<meta ${tipoAttr}="${clave}" content="${escaparHtml(content)}" />`;
  return html.replace("</head>", `${tag}\n  </head>`);
}

/** Inyecta title/description/og/twitter en un HTML estático (index.html). */
export function inyectarMetaEnHtml(html, meta) {
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escaparHtml(meta.title)}</title>`);
  out = reemplazarMeta(out, "name", "description", meta.description);
  out = reemplazarMeta(out, "property", "og:title", meta.title);
  out = reemplazarMeta(out, "property", "og:description", meta.description);
  out = reemplazarMeta(out, "property", "og:image", meta.image);
  out = reemplazarMeta(out, "property", "og:url", meta.url);
  out = reemplazarMeta(out, "name", "twitter:title", meta.title);
  out = reemplazarMeta(out, "name", "twitter:description", meta.description);
  out = reemplazarMeta(out, "name", "twitter:image", meta.image);
  return out;
}
