 #147-Global-rate-limiting-by-IP-on-public-indexer-endpoints-FIX
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmplBienvenida, tmplContribucion, tmplAprobacionHTML, tmplYieldDisponible } from './templates/htmlTemplates.js';

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
if (!existsSync(outputDir)) mkdirSync(outputDir);

const mockData = {
  nombre: 'Usuario de Prueba',
  proyecto: 'Proyecto Solar Comunitario',
  monto: '5,000.00',
  fecha: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
  yield: '250.00',
  url: 'https://bimex-frontend.vercel.app/proyectos/1',
};

writeFileSync(join(outputDir, 'bienvenida.html'), tmplBienvenida(mockData));
writeFileSync(join(outputDir, 'contribucion.html'), tmplContribucion(mockData));
writeFileSync(join(outputDir, 'aprobacion.html'), tmplAprobacionHTML(mockData));
writeFileSync(join(outputDir, 'yield-disponible.html'), tmplYieldDisponible(mockData));

console.log('Templates generados en test-output/');
console.log('Abre los archivos HTML en tu navegador para previsualizar.');
