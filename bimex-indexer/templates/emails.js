import { layout, btnPrimary, projectTitle } from "./layout.js";

export function tmplAprobado({ nombreProyecto, proyectoUrl }) {
  return layout(`
    <p style="font-size:2rem;margin:0 0 16px;">✅</p>
    <h1 style="margin:0 0 8px;font-size:1.3rem;color:#1C1633;">Tu proyecto ha sido aprobado</h1>
    <p style="margin:0 0 20px;color:#6B7280;line-height:1.7;">¡Buenas noticias! El equipo de Bimex revisó tu proyecto y lo aprobó. Ya está visible para que los backers puedan contribuir.</p>
    ${projectTitle(nombreProyecto)}
    ${btnPrimary(proyectoUrl, "Ver mi proyecto →")}
  `, proyectoUrl);
}

export function tmplRechazado({ nombreProyecto, motivo, proyectoUrl }) {
  return layout(`
    <p style="font-size:2rem;margin:0 0 16px;">❌</p>
    <h1 style="margin:0 0 8px;font-size:1.3rem;color:#1C1633;">Tu proyecto no fue aprobado</h1>
    <p style="margin:0 0 20px;color:#6B7280;line-height:1.7;">Después de revisar tu proyecto, el equipo de Bimex no pudo aprobarlo en esta ocasión.</p>
    ${projectTitle(nombreProyecto)}
    ${motivo ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:0.85rem;color:#991B1B;"><strong>Motivo:</strong> ${motivo}</p>
    </div>` : ""}
    <p style="color:#6B7280;font-size:0.88rem;line-height:1.7;">Puedes corregir los documentos y crear un nuevo proyecto.</p>
    ${btnPrimary(proyectoUrl, "Ver detalles →")}
  `, proyectoUrl);
}

export function tmplFinanciado({ nombreProyecto, proyectoUrl }) {
  return layout(`
    <p style="font-size:2rem;margin:0 0 16px;">🎉</p>
    <h1 style="margin:0 0 8px;font-size:1.3rem;color:#1C1633;">¡Tu proyecto alcanzó su meta!</h1>
    <p style="margin:0 0 20px;color:#6B7280;line-height:1.7;">El total de contribuciones alcanzó la meta de financiamiento. El yield comenzará a acumularse y podrás reclamarlo desde tu cuenta.</p>
    ${projectTitle(nombreProyecto)}
    ${btnPrimary(proyectoUrl, "Ir a mi proyecto →")}
  `, proyectoUrl);
}

export function tmplYield({ nombreProyecto, monto, proyectoUrl }) {
  return layout(`
    <p style="font-size:2rem;margin:0 0 16px;">💰</p>
    <h1 style="margin:0 0 8px;font-size:1.3rem;color:#1C1633;">Tienes yield disponible</h1>
    <p style="margin:0 0 20px;color:#6B7280;line-height:1.7;">Tu proyecto ha acumulado rendimiento (CETES + AMM) que puedes reclamar ahora.</p>
    ${projectTitle(nombreProyecto)}
    ${monto ? `<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:0.85rem;color:#166534;"><strong>Yield disponible:</strong> ${monto} MXNe</p>
    </div>` : ""}
    ${btnPrimary(proyectoUrl, "Reclamar yield →")}
  `, proyectoUrl);
}

export function tmplRetiro({ nombreProyecto, monto, proyectoUrl }) {
  return layout(`
    <p style="font-size:2rem;margin:0 0 16px;">🏦</p>
    <h1 style="margin:0 0 8px;font-size:1.3rem;color:#1C1633;">Retiro de principal registrado</h1>
    <p style="margin:0 0 20px;color:#6B7280;line-height:1.7;">Un backer retiró su principal de tu proyecto. Puedes ver el estado actualizado del financiamiento.</p>
    ${projectTitle(nombreProyecto)}
    ${monto ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:0.85rem;color:#1E40AF;"><strong>Monto retirado:</strong> ${monto} MXNe</p>
    </div>` : ""}
    ${btnPrimary(proyectoUrl, "Ver mi proyecto →")}
  `, proyectoUrl);
}
