import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE = process.env.FRONTEND_URL ?? "https://bimex.fi";

function loadTemplate(templateName, variables = {}) {
  const templatePath = join(__dirname, `${templateName}.html`);
  let html = readFileSync(templatePath, "utf-8");

  const allVars = {
    baseUrl: BASE,
    unsubscribeUrl: `${BASE}/mi-cuenta`,
    tasaCetes: "10.5",
    ...variables,
  };

  Object.entries(allVars).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    html = html.replace(regex, value ?? "");
  });

  return html;
}

export function tmplBienvenida(data) {
  return loadTemplate("bienvenida", data);
}

export function tmplContribucion(data) {
  return loadTemplate("contribucion", data);
}

export function tmplAprobacionHTML(data) {
  return loadTemplate("aprobacion", data);
}

export function tmplYieldDisponible(data) {
  return loadTemplate("yield-disponible", data);
}
