import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = import.meta.env.VITE_SUPABASE_URL
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

export default function NotificacionesPanel({ direccion }) {
  const [email,   setEmail]   = useState("");
  const [enabled, setEnabled] = useState(true);
  const [estado,  setEstado]  = useState("idle");
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!direccion || !supabase) return;
    supabase
      .from("user_notifications")
      .select("email, notifications_enabled")
      .eq("wallet_address", direccion)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setEmail(data.email); setEnabled(data.notifications_enabled); }
        setCargado(true);
      })
      .catch(() => setCargado(true));
  }, [direccion]);

  async function guardar(e) {
    e.preventDefault();
    if (!email || !supabase) return;
    setEstado("saving");
    const { error } = await supabase
      .from("user_notifications")
      .upsert({ wallet_address: direccion, email, notifications_enabled: enabled }, { onConflict: "wallet_address" });
    setEstado(error ? "error" : "ok");
    setTimeout(() => setEstado("idle"), 3000);
  }

  if (!cargado) return null;

  return (
    <div style={estilos.notiPanel}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBell />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>
              Notificaciones por email
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: 2 }}>
              Recibe alertas cuando tu proyecto sea aprobado, financiado o tenga yield disponible.
            </div>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
            background: enabled ? "var(--navy)" : "var(--border2)",
            position: "relative", flexShrink: 0, transition: "background 0.2s",
          }}
          aria-label={enabled ? "Desactivar notificaciones" : "Activar notificaciones"}
        >
          <span style={{
            position: "absolute", top: 3,
            left: enabled ? 22 : 3,
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff", transition: "left 0.2s",
          }} />
        </button>
      </div>

      {enabled && (
        <form onSubmit={guardar} style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              flex: 1, padding: "9px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--border2)",
              fontFamily: "inherit", fontSize: "0.88rem",
              outline: "none", color: "var(--text)",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
            onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
            aria-label="Email para notificaciones"
          />
          <button
            type="submit"
            disabled={estado === "saving"}
            className="btn btn-primary"
            style={{ whiteSpace: "nowrap", padding: "9px 18px" }}
          >
            {estado === "saving" ? "…" : estado === "ok" ? "Guardado" : estado === "error" ? "Error" : "Guardar"}
          </button>
        </form>
      )}
    </div>
  );
}

const estilos = {
  notiPanel: {
    background: "var(--card)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "20px 24px",
    marginBottom: 28,
    boxShadow: "var(--shadow-sm)",
  },
};
