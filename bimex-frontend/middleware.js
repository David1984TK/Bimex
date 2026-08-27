// Vercel Routing Middleware (framework-agnostic, runtime edge).
//
// Los crawlers de redes sociales (WhatsApp, X/Twitter, Facebook, Telegram,
// Discord, LinkedIn, Slack, iMessage) NO ejecutan JavaScript al scrapear una
// URL: para ellos las meta tags actualizadas en runtime por DetalleProyecto.jsx
// son invisibles. Este middleware les sirve el index.html estático con las
// meta tags og/twitter inyectadas por proyecto.
//
// Datos del proyecto: GET {INDEXER_URL}/proyectos/:id (bimex-indexer).
// Si no hay INDEXER_URL o falla la consulta, se degradan las tags a las
// genéricas de Bimex — el link nunca se rompe.
import {
  DEFAULT_META,
  construirMetaProyecto,
  esCrawlerRedes,
  idProyectoDesdePath,
  inyectarMetaEnHtml,
} from "./src/utils/socialPreview.js";

export const config = {
  matcher: "/proyectos/:path*",
};

async function obtenerIndexHtml(request) {
  try {
    const res = await fetch(new URL("/index.html", request.url), {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function obtenerProyectoRemoto(id) {
  const base = process.env.INDEXER_URL || process.env.VITE_INDEXER_URL || "";
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/proyectos/${id}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function respuestaHtml(html, cacheable) {
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": cacheable
        ? "public, s-maxage=300, stale-while-revalidate=600"
        : "public, max-age=0, must-revalidate",
    },
  });
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);
  const userAgent = request.headers.get("user-agent") ?? "";

  // Crawlers de redes: HTML con meta tags del proyecto específico.
  const idProyecto = idProyectoDesdePath(pathname);
  if (idProyecto !== null && esCrawlerRedes(userAgent)) {
    const [html, proyecto] = await Promise.all([
      obtenerIndexHtml(request),
      obtenerProyectoRemoto(idProyecto),
    ]);
    if (html) {
      const meta = proyecto ? construirMetaProyecto({ ...proyecto, id: idProyecto }) : DEFAULT_META;
      return respuestaHtml(inyectarMetaEnHtml(html, meta), Boolean(proyecto));
    }
  }

  // Navegadores normales y rutas sin id numérico: shell SPA intacta.
  const html = await obtenerIndexHtml(request);
  if (html) return respuestaHtml(html, false);

  // Último recurso: dejar que la routing normal (rewrite catch-all) actúe.
  return undefined;
}
