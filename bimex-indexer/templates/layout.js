const BASE = process.env.FRONTEND_URL ?? "https://bimex.fi";

export function layout(content, proyectoUrl) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Bimex</title>
</head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.10);">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1E0A3C,#2D1B69);padding:28px 32px;">
          <span style="font-size:1.4rem;font-weight:800;color:#C4B5FD;letter-spacing:-0.02em;">Bimex</span>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          ${content}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding:20px 32px;border-top:1px solid #ede9fe;background:#faf8ff;">
          <p style="margin:0;font-size:0.75rem;color:#9CA3AF;line-height:1.6;">
            Recibiste este correo porque tienes notificaciones activas en Bimex.<br/>
            <a href="${BASE}/mi-cuenta" style="color:#7C3AED;">Gestionar preferencias</a>
            &nbsp;·&nbsp;
            <a href="${BASE}" style="color:#7C3AED;">Ir a Bimex</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function btnPrimary(url, label) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:linear-gradient(135deg,#7C3AED,#6D28D9);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:0.9rem;">${label}</a>`;
}

export function projectTitle(nombre) {
  return `<p style="margin:0 0 8px;font-size:0.75rem;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Proyecto</p>
<p style="margin:0 0 20px;font-size:1.15rem;font-weight:700;color:#1C1633;">${nombre}</p>`;
}
