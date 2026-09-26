#!/usr/bin/env node
/**
 * Guardia del proxy `/api` del indexer en vercel.json — issue #338.
 *
 * Previene que se commitee un placeholder/host falso en el rewrite de
 * producción (el PR #260 se cerró por exactamente eso).
 *
 * Uso:
 *   node scripts/check-vercel-proxy.mjs          # informe legible (exit 1 si hay placeholders)
 *   node scripts/check-vercel-proxy.mjs --json   # salida JSON (para el test guard)
 *
 * También lo importa `src/test/vercelProxy.test.js` como test de regresión.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const VERCEL_JSON = path.resolve(__dirname, "..", "vercel.json");

/** Hosts que nunca deben aparecer como destino de un rewrite /api. */
const P_FAKE = /(localhost|127\.0\.0\.1|example\.com|example\.vercel\.app|\.test\b|REPLACE|PLACEHOLDER|TODO|PENDING|<[^>]+>|placeholder|fake|hack|\.local\b)/i;

/** Host del frontend que ya tiene rewrite productivo cableado en staging. */
const HOST_STAGING = "bimex-staging.vercel.app";

function revisarRewrites(rewrites) {
  const api = rewrites.filter((r) => String(r.source ?? "").startsWith("/api"));
  const hallazgos = [];
  const avisos = [];

  const hostsUsados = new Set(
    api.flatMap((r) => (r.has ?? []).filter((h) => h.type === "host").map((h) => h.value)),
  );

  if (api.length === 0 || Array.from(hostsUsados).every((h) => h === HOST_STAGING)) {
    avisos.push({
      tipo: "SIN_REWRITE_PRODUCCION",
      texto:
        "No hay rewrite /api productivo (solo staging). Es el paso pendiente de #338; ver docs/activar-proxy-indexer-produccion.md.",
    });
  }

  for (const r of api) {
    const destino = r.destination ?? "";
    if (!destino) {
      hallazgos.push({ tipo: "SIN_DESTINO", texto: r.source });
      continue;
    }
    if (P_FAKE.test(destino)) {
      hallazgos.push({ tipo: "HOST_FALSO", texto: destino });
    }
    const hosts = (r.has ?? []).filter((h) => h.type === "host").map((h) => h.value);
    if (hosts.length === 0) {
      avisos.push({
        tipo: "SIN_CONDICION_HOST",
        texto: `${r.source} → ${destino} no filtra por host; puede chocar con el rewrite de staging.`,
      });
    }
  }

  return { hallazgos, avisos };
}

/** Devuelve { hallazgos, avisos } desde un objeto de configuración Vercel. */
export function verificarConfig(config) {
  const rewrites = Array.isArray(config?.rewrites) ? config.rewrites : [];
  return revisarRewrites(rewrites);
}

/** Devuelve { hallazgos, avisos } desde el vercel.json en disco. */
export function verificarProxy(vercelPath = VERCEL_JSON) {
  try {
    const config = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
    return verificarConfig(config);
  } catch (err) {
    return { hallazgos: [{ tipo: "PARSE_ERROR", texto: err.message }], avisos: [] };
  }
}

function main() {
  const { hallazgos, avisos } = verificarProxy();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ hallazgos, avisos }, null, 2));
    process.exit(hallazgos.length > 0 ? 1 : 0);
  }

  if (hallazgos.length === 0) {
    console.log("✅ check-vercel-proxy: sin placeholders ni hosts falsos en rewrites /api.");
  } else {
    console.log("❌ check-vercel-proxy — rewrites /api inválidos:\n");
    for (const h of hallazgos) console.log(`  [${h.tipo}] ${h.texto}`);
  }
  if (avisos.length) {
    console.log(`\nAvisos (no bloqueantes):`);
    for (const a of avisos) console.log(`  [${a.tipo}] ${a.texto}`);
  }
  process.exit(hallazgos.length > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}