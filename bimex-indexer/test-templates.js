 #147-Rate-limiting-global-por-IP-en-endpoints-públicos-del-indexer-FIX
import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  tmplAprobacionHTML,
  tmplBienvenida,
  tmplContribucion,
  tmplYieldDisponible,
} from './templates/htmlTemplates.js';

import { tmplBienvenida, tmplContribucion, tmplAprobacionHTML, tmplYieldDisponible } from './templates/htmlTemplates.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 main

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputDir = join(__dirname, 'test-output');

const mockData = {
  nombre: 'Usuario de Prueba',
  proyecto: 'Proyecto Solar Comunitario',
  monto: '5,000.00',
  fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
  yield: '250.00',
  url: 'https://bimex-frontend.vercel.app/proyectos/1',
};

test('email templates render HTML previews', () => {
  if (!existsSync(outputDir)) mkdirSync(outputDir);

  const previews = {
    'bienvenida.html': tmplBienvenida(mockData),
    'contribucion.html': tmplContribucion(mockData),
    'aprobacion.html': tmplAprobacionHTML(mockData),
    'yield-disponible.html': tmplYieldDisponible(mockData),
  };

  for (const [fileName, html] of Object.entries(previews)) {
    assert.match(html, /<html|<!doctype html/i);
    assert.ok(html.length > 500, `${fileName} should render a complete HTML email`);
    writeFileSync(join(outputDir, fileName), html);
  }
});
