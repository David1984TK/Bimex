import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE = process.env.FRONTEND_URL ?? "https://bimex.fi";

/**
 * Load and process an HTML template with variable substitution
 * @param {string} templateName - Name of the HTML file (without .html extension)
 * @param {object} variables - Object with variables to replace in template
 * @returns {string} Processed HTML
 */
function loadTemplate(templateName, variables = {}) {
  const templatePath = join(__dirname, `${templateName}.html`);
  let html = readFileSync(templatePath, "utf-8");

  // Add default variables
  const allVars = {
    baseUrl: BASE,
    unsubscribeUrl: `${BASE}/mi-cuenta`,
    tasaCetes: "10.5", // Default CETES rate, can be overridden
    ...variables,
  };

  // Replace all {{variable}} placeholders
  Object.entries(allVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    html = html.replace(regex, value ?? "");
  });

  return html;
}

/**
 * Generate welcome email HTML
 * @param {object} data - { nombreProyecto, monto, proyectoUrl }
 */
export function tmplBienvenida(data) {
  return loadTemplate("bienvenida", data);
}

/**
 * Generate contribution received email HTML
 * @param {object} data - { nombreProyecto, monto, progreso, proyectoUrl }
 */
export function tmplContribucion(data) {
  return loadTemplate("contribucion", data);
}

/**
 * Generate project approval email HTML
 * @param {object} data - { nombreProyecto, proyectoUrl }
 */
export function tmplAprobacionHTML(data) {
  return loadTemplate("aprobacion", data);
}

/**
 * Generate yield available email HTML
 * @param {object} data - { nombreProyecto, monto, proyectoUrl, tasaCetes? }
 */
export function tmplYieldDisponible(data) {
  return loadTemplate("yield-disponible", data);
}
