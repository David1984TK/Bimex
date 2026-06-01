/**
 * Script para probar los templates de email
 * 
 * Uso:
 *   node test-templates.js
 * 
 * Este script genera archivos HTML de prueba en ./test-output/
 * para visualizar los templates en un navegador.
 */

import { writeFileSync, mkdirSync } from "fs";
import { 
  tmplBienvenida, 
  tmplContribucion, 
  tmplAprobacionHTML, 
  tmplYieldDisponible 
} from "./templates/htmlTemplates.js";

const OUTPUT_DIR = "./test-output";

// Crear directorio de salida
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (err) {
  // Directory already exists
}

// Datos de prueba
const testData = {
  bienvenida: {
    nombreProyecto: "Cafetería Sustentable en CDMX",
    monto: "5000",
    proyectoUrl: "https://bimex.fi/?proyecto=demo-123",
  },
  contribucion: {
    nombreProyecto: "Cafetería Sustentable en CDMX",
    monto: "1000",
    progreso: "45",
    proyectoUrl: "https://bimex.fi/?proyecto=demo-123",
  },
  aprobacion: {
    nombreProyecto: "Cafetería Sustentable en CDMX",
    proyectoUrl: "https://bimex.fi/?proyecto=demo-123",
  },
  yieldDisponible: {
    nombreProyecto: "Cafetería Sustentable en CDMX",
    monto: "250.50",
    tasaCetes: "11.2",
    proyectoUrl: "https://bimex.fi/?proyecto=demo-123",
  },
};

// Generar templates
console.log("🎨 Generando templates de prueba...\n");

const templates = [
  { name: "bienvenida", fn: tmplBienvenida, data: testData.bienvenida },
  { name: "contribucion", fn: tmplContribucion, data: testData.contribucion },
  { name: "aprobacion", fn: tmplAprobacionHTML, data: testData.aprobacion },
  { name: "yield-disponible", fn: tmplYieldDisponible, data: testData.yieldDisponible },
];

templates.forEach(({ name, fn, data }) => {
  const html = fn(data);
  const filename = `${OUTPUT_DIR}/${name}.html`;
  writeFileSync(filename, html, "utf-8");
  console.log(`✅ ${name}.html generado`);
});

console.log(`\n✨ Templates generados en ${OUTPUT_DIR}/`);
console.log("📧 Abre los archivos .html en tu navegador para visualizarlos\n");
