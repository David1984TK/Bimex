#!/usr/bin/env node
/**
 * Auditoría de cobertura i18n (react-i18next) — issue #353.
 *
 * Escanea `bimex-frontend/src/**` en busca de texto en español hardcodeado
 * que NO pase por el sistema de traducción (`t("clave")` / `i18n.t("clave")`).
 *
 * Uso:
 *   node scripts/i18n-audit.mjs          # informe legible (exit 1 si hay hallazgos)
 *   node scripts/i18n-audit.mjs --json   # salida JSON (para el test guard)
 *
 * También lo importa `src/test/i18nCoverage.test.jsx` como test de regresión.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SRC_DIR = path.resolve(__dirname, "..", "src");

/** Archivos eximidos, con la razón por la que no se migran a i18n. */
export const WHITELIST = [
  {
    file: "src/utils/socialPreview.js",
    reason:
      "Se importa desde middleware.js (Vercel Edge Runtime) y /api/og; no puede depender del singleton de i18next (detector de idioma de navegador). Meta tags SEO servidas en español.",
  },
  {
    file: "src/utils/metaTags.js",
    reason: "Compañero de socialPreview.js: inyecta DEFAULT_META en el HTML estático, sin acceso a i18n en runtime.",
  },
  {
    file: "src/stellar/contrato.js",
    reason: "Capa de transporte e integración con Soroban SDK. Los errores técnicos que lanza son atrapados y traducidos al usuario en la UI por parsearError() (src/utils/errores.js).",
  },
];

// ── Señales de texto en español ──────────────────────────────────────────────
const ACENTOS = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
// Palabras inequívocamente españolas (evita anglicismos ambiguos tipo "no")
const PALABRAS =
  /\b(de|del|al|para|con|por|que|qué|tu|tus|desde|hasta|sin|pero|cuando|porque|puedes|puede|está|están|más|aquí|también|proyecto|proyectos|cuenta|cuentas|saldo|capital|rendimiento|aporta|aportar|contribuye|contribuir|conecta|conectar|verifica|verificar|verificados|financia|financiar|financiado|invertir|invierte|inversor|inversores|recupera|recuperar|retira|retirar|deposita|depositar|billetera|documentos|documentación|meta|metas|fecha|nombre|correo|histórico|historial|configuración|notificaciones|notificación|cerrar|siguiente|anterior|aceptar|rechazar|enviar|subir|descargar|copiar|editar|eliminar|crear|nuevos|nuevo|nueva|primero|primera|página|pasos|paso|impacto|comunidad|organización|organizaciones|beneficiario|reporte|reportes|evidencia|evidencias|certificado|cierre|próximamente|agregado|agregada|mejorado|mejorada|corregido|corregida|recompensa|recompensas|nivel|niveles|brote|árbol|selva|guardián|caja|sorpresa|regalo|prueba|solo|conexión|servidor|solicitud|instálalo|bloqueado|bloqueada|permiso|red|diferente|intermediarios|plataforma|usuarios|usuario|contrato|inteligente|cadena|transacción|transacciones|retiro|retiros|aportación|aportaciones|disponible|disponibles|actualmente|pendiente|pendientes|aprobado|aprobada|aprobados|rechazado|rechazada|activo|activa|completado|completada|etapa|gracias|ayuda|información|datos|monto|montos|total|totales)\b/i;

const esEspañol = (texto) => ACENTOS.test(texto) || PALABRAS.test(texto);

const palabras = (t) => t.trim().split(/\s+/).filter(Boolean).length >= 2;

/** Quita comentarios respetando strings (evita borrar "https://..." etc.). */
function sinComentarios(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** ¿El match está dentro de una llamada a t(...) / i18n.t(...)? */
function dentroDeT(linea, col) {
  const antes = linea.slice(0, col);
  return /(?:^|[^\w.])(?:i18n\.)?t\(\s*$/.test(antes) || /(?:^|[^\w.])(?:i18n\.)?t\([^)]*$/.test(antes);
}

const PROPS_ATRIBUTO = /\b(aria-label|aria-description|placeholder|alt|title)\s*=\s*(?:"([^"]*)"|\{\s*"([^"]*)"\s*\})/g;
const PROPS_DATO = /\b(nombre|desc|descripcion|titulo|subtitulo|texto|label|etiqueta|cabecera|mensaje|msg|seccion|version|categoria)\s*:\s*"([^"]{3,})"/g;
const LITERAL_ARRAY = /^\s*"([^"]{8,})"\s*[,)]?\s*$/;
const RETURN_STR = /\b(?:return|throw new Error)\s*\(?\s*"([^"]{6,})"/;
const RETURN_TPL = /\b(?:return|throw new Error)\s*\(?\s*`([^`]*[áéíóúñ][^`]*)`/;

function auditarArchivo(absPath, raiz) {
  const rel = path.relative(raiz, absPath).split(path.sep).join("/");
  const src = sinComentarios(fs.readFileSync(absPath, "utf8"));
  const lineas = src.split("\n");
  const hallazgos = [];

  lineas.forEach((linea, idx) => {
    const n = idx + 1;
    const t = linea.trim();
    if (!t) return;

    // 1) Nodo de texto JSX en una línea: >Texto<
    for (const m of linea.matchAll(/>([^<>{}]+)</g)) {
      const txt = m[1].trim();
      if (!txt || /[=;()]/.test(txt) || !palabras(txt) || !esEspañol(txt)) continue;
      if (dentroDeT(linea, m.index)) continue;
      hallazgos.push({ file: rel, line: n, tipo: "JSX-TEXT", texto: txt });
    }

    // 2) Nodo de texto JSX multilínea (línea propia entre > y </)
    const prev = (lineas[idx - 1] ?? "").trim();
    const sig = (lineas[idx + 1] ?? "").trim();
    if (
      prev.endsWith(">") &&
      sig.startsWith("</") &&
      /^[^<>{}=]+$/.test(t) &&
      palabras(t) &&
      esEspañol(t) &&
      !dentroDeT(prev, Math.max(prev.length - 1, 0))
    ) {
      hallazgos.push({ file: rel, line: n, tipo: "JSX-TEXT", texto: t });
    }

    // 3) Atributos con literales: aria-label / placeholder / alt / title
    for (const m of linea.matchAll(PROPS_ATRIBUTO)) {
      const val = m[2] ?? m[3] ?? "";
      if (!val || !esEspañol(val)) continue;
      if (dentroDeT(linea, m.index)) continue;
      hallazgos.push({ file: rel, line: n, tipo: "ATTR", texto: `${m[1]}="${val}"` });
    }

    // 4) Literales de datos: { nombre: "...", desc: "..." }
    for (const m of linea.matchAll(PROPS_DATO)) {
      if (!esEspañol(m[2])) continue;
      hallazgos.push({ file: rel, line: n, tipo: "DATA", texto: `${m[1]}: "${m[2]}"` });
    }

    // 5) Entradas de arrays: "Texto en español…" (changelog, features, …)
    const arr = t.match(LITERAL_ARRAY);
    if (arr && esEspañol(arr[1]) && !/^\s*"[a-z0-9-]+"/.test(t)) {
      hallazgos.push({ file: rel, line: n, tipo: "ARRAY", texto: arr[1] });
    }

    // 6) return/throw de utilidades no-React (errores.js, ipfs.js, contrato.js)
    const ret = t.match(RETURN_STR);
    if (ret && esEspañol(ret[1]) && !dentroDeT(linea, Math.max(linea.indexOf(ret[1]), 0))) {
      hallazgos.push({ file: rel, line: n, tipo: "RETURN", texto: ret[1] });
    }
    const tpl = t.match(RETURN_TPL);
    if (tpl && !dentroDeT(linea, Math.max(linea.indexOf("`"), 0))) {
      hallazgos.push({ file: rel, line: n, tipo: "RETURN", texto: tpl[1] });
    }
  });

  return hallazgos;
}

function listarArchivos(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "test") continue; // los tests viven en español a propósito
      out.push(...listarArchivos(p));
    } else if (/\.jsx?$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

/** Devuelve { hallazgos, excepciones } normalizados contra la whitelist. */
export function auditar(srcDir = SRC_DIR) {
  const raiz = path.dirname(srcDir); // …/bimex-frontend
  const todos = listarArchivos(srcDir).flatMap((f) => auditarArchivo(f, raiz));
  const enWhite = new Set(WHITELIST.map((w) => w.file));

  const hallazgos = [];
  const excepciones = [];
  for (const h of todos) (enWhite.has(h.file) ? excepciones : hallazgos).push(h);

  const por = (a, b) => a.file.localeCompare(b.file) || a.line - b.line;
  hallazgos.sort(por);
  excepciones.sort(por);
  return { hallazgos, excepciones, whitelist: WHITELIST };
}

function main() {
  const { hallazgos, excepciones } = auditar();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ hallazgos, excepciones, whitelist: WHITELIST }, null, 2));
  } else {
    const porArchivo = new Map();
    for (const h of hallazgos) porArchivo.set(h.file, [...(porArchivo.get(h.file) ?? []), h]);

    if (porArchivo.size === 0) {
      console.log("✅ Auditoría i18n: 0 textos en español hardcodeados fuera de i18n.");
    } else {
      console.log("❌ Auditoría i18n — textos en español hardcodeados:\n");
      for (const [file, items] of porArchivo) {
        console.log(`  ${file} → ${items.length}`);
        for (const i of items.slice(0, 12)) {
          console.log(`     L${i.line} [${i.tipo}] ${i.texto.slice(0, 100)}`);
        }
        if (items.length > 12) console.log(`     … +${items.length - 12} más`);
      }
      console.log(`\nTOTAL: ${hallazgos.length} hallazgos en ${porArchivo.size} archivos.`);
    }

    if (WHITELIST.length) {
      console.log(`\nWhitelist (excepciones documentadas en docs/i18n-audit.md):`);
      for (const w of WHITELIST) console.log(`  - ${w.file}: ${w.reason}`);
    }
    if (excepciones.length) console.log(`  (${excepciones.length} textos exentos)`);
  }

  process.exit(hallazgos.length > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

