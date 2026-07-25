#!/usr/bin/env node
// Envuelve `npm audit` para que el gate de CI falle ante cualquier
// vulnerabilidad high/critical NUEVA, pero no bloquee indefinidamente por una
// ya evaluada y rastreada en un issue — el equivalente en JS de
// `bimex/audit.toml` del lado del contrato.
//
// Agregar una excepción aquí es una decisión de seguridad, no un trámite:
// requiere justificar por qué el código de la app no ejercita la ruta
// vulnerable, y un issue abierto con seguimiento.
import { execSync } from 'node:child_process';

const ALLOWED_ADVISORIES = {
  // GHSA-qwww-vcr4-c8h2: React Router RSC Mode CSRF Bypass.
  // Este proyecto usa react-router-dom en modo declarativo puro (BrowserRouter
  // + Routes/Route), sin createBrowserRouter/RouterProvider/loader/action ni
  // RSC — el código vulnerable (RSC action handling) no se ejecuta nunca.
  // No existe una versión 7.x sin CVEs superpuestos; la 8.x requiere migrar
  // de react-router-dom a react-router (paquete unificado). Ver issue #270.
  'GHSA-qwww-vcr4-c8h2': 'issue #270 — requiere migración a react-router v8, no un pin de versión',
};

let report;
try {
  execSync('npm audit --audit-level=high --json', { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('npm audit: sin vulnerabilidades high/critical.');
  process.exit(0);
} catch (err) {
  report = JSON.parse(err.stdout.toString());
}

const vulnerabilities = report.vulnerabilities ?? {};

// `via` mezcla objetos de asesoría ({ url, ... }) con strings que son el
// nombre de OTRO paquete vulnerable (ej. react-router-dom -> "react-router").
// Hay que seguir esas referencias para llegar a los GHSA IDs reales.
function collectAdvisoryIds(vulnName, seen = new Set()) {
  if (seen.has(vulnName)) return [];
  seen.add(vulnName);
  const vuln = vulnerabilities[vulnName];
  if (!vuln) return [];
  const ids = [];
  for (const v of vuln.via ?? []) {
    if (typeof v === 'object' && v.url) {
      ids.push(v.url.split('/').pop());
    } else if (typeof v === 'string') {
      ids.push(...collectAdvisoryIds(v, seen));
    }
  }
  return ids;
}

const unexpected = [];
for (const vuln of Object.values(vulnerabilities)) {
  if (vuln.severity !== 'high' && vuln.severity !== 'critical') continue;
  const advisoryIds = collectAdvisoryIds(vuln.name);
  const allAllowed = advisoryIds.length > 0 && advisoryIds.every((id) => id in ALLOWED_ADVISORIES);
  if (!allAllowed) {
    unexpected.push({ name: vuln.name, severity: vuln.severity, advisoryIds });
  }
}

if (unexpected.length > 0) {
  console.error('npm audit encontró vulnerabilidades high/critical NO rastreadas:');
  for (const v of unexpected) {
    console.error(`  - ${v.name} (${v.severity}): ${v.advisoryIds.join(', ')}`);
  }
  console.error('\nCorrige con un override en package.json, o si requiere una migración');
  console.error('mayor, agrégala a ALLOWED_ADVISORIES en scripts/check-audit.mjs con un');
  console.error('issue de seguimiento — no bajes el nivel del audit para taparlo.');
  process.exit(1);
}

console.log('npm audit: solo vulnerabilidades ya rastreadas y justificadas:');
for (const [id, reason] of Object.entries(ALLOWED_ADVISORIES)) {
  console.log(`  - ${id}: ${reason}`);
}
process.exit(0);
