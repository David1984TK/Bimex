import { Resend } from "resend";
import {
  tmplAprobado,
  tmplRechazado,
  tmplFinanciado,
  tmplYield,
  tmplRetiro,
  tmplBienvenida,
  tmplContribucion,
  tmplAprobacionHTML,
  tmplYieldDisponible,
} from "./templates/index.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM ?? "Bimex <notificaciones@bimex.fi>";
const BASE   = process.env.FRONTEND_URL ?? "https://bimex.fi";

const TEMPLATES = {
  // Legacy templates (simple HTML)
  proyecto_aprobado:  { subject: "✅ Tu proyecto Bimex ha sido aprobado",          html: tmplAprobado  },
  proyecto_rechazado: { subject: "❌ Tu proyecto Bimex ha sido rechazado",          html: tmplRechazado },
  meta_alcanzada:     { subject: "🎉 ¡Tu proyecto alcanzó su meta de financiamiento!", html: tmplFinanciado },
  yield_disponible:   { subject: "💰 Tienes yield disponible para reclamar",        html: tmplYield     },
  retiro_principal:   { subject: "🏦 Se realizó un retiro de principal en tu proyecto", html: tmplRetiro },

  // New HTML templates (professional design)
  bienvenida:             { subject: "🎉 ¡Bienvenido a Bimex!",                       html: tmplBienvenida },
  nueva_contribucion:     { subject: "💰 Nueva contribución recibida en tu proyecto", html: tmplContribucion },
  proyecto_aprobado_html: { subject: "✅ Tu proyecto Bimex ha sido aprobado",         html: tmplAprobacionHTML },
  yield_disponible_html:  { subject: "💰 Tienes yield disponible para reclamar",      html: tmplYieldDisponible },
};

/**
 * Send a notification email for a given event.
 * @param {string} eventType  - One of the keys in TEMPLATES
 * @param {string} toEmail    - Recipient email address
 * @param {object} data       - Template data (nombreProyecto, idProyecto, monto?, progreso?, etc.)
 */
export async function enviarNotificacion(eventType, toEmail, data) {
  const tpl = TEMPLATES[eventType];
  if (!tpl) throw new Error(`Tipo de evento desconocido: ${eventType}`);

  const proyectoUrl = data.proyectoUrl ?? `${BASE}/?proyecto=${data.idProyecto}`;
  const html = tpl.html({ ...data, proyectoUrl });

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      toEmail,
    subject: tpl.subject,
    html,
  });

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}
