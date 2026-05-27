import { useState } from "react";
import { mintearMXNePrueba } from "../stellar/contrato";

// ── Logo SVG ────────────────────────────────────────────────────────────────
export function LogoSVG({ size = 36, light = false }) {
  const c1 = light ? "rgba(255,255,255,0.85)" : "#1E3A5F";
  const c2 = light ? "rgba(255,255,255,0.60)" : "#16A34A";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="8" cy="11" r="3.5" stroke={c1} strokeWidth="1.8"/>
      <circle cx="8" cy="20" r="3.5" stroke={c1} strokeWidth="1.8"/>
      <circle cx="8" cy="29" r="3.5" stroke={c1} strokeWidth="1.8"/>
      <line x1="11.5" y1="11" x2="18" y2="11" stroke={c1} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="11.5" y1="20" x2="18" y2="15" stroke={c2} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="11.5" y1="29" x2="18" y2="29" stroke={c2} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ── Botón faucet ────────────────────────────────────────────────────────────
export function BtnFaucet({ direccion }) {
  const [estado, setEstado] = useState("idle");

  async function pedir() {
    setEstado("loading");
    try {
      await mintearMXNePrueba(direccion);
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 4000);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado("idle"), 3000);
    }
  }

  const labels = { idle: "100 MXNe", loading: "...", ok: "Listo", error: "Error" };

  return (
    <button
      onClick={pedir}
      disabled={estado === "loading"}
      title="Obtener 100 MXNe de prueba (solo testnet)"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border2)",
        color: estado === "ok" ? "var(--green)" : estado === "error" ? "var(--error)" : "var(--text2)",
        padding: "6px 14px", borderRadius: "var(--radius-sm)",
        fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "0.78rem",
        cursor: estado === "loading" ? "not-allowed" : "pointer",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {labels[estado]}
    </button>
  );
}

// ── Toast Container ──────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      maxWidth: 380, width: "calc(100vw - 32px)",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.tipo === "error" ? "#FEF2F2" : "#F0FDF4",
          border: `1px solid ${t.tipo === "error" ? "rgba(220,38,38,0.20)" : "rgba(22,163,74,0.20)"}`,
          borderLeft: `4px solid ${t.tipo === "error" ? "#DC2626" : "var(--green)"}`,
          borderRadius: "var(--radius-sm)",
          padding: "12px 14px",
          boxShadow: "var(--shadow-md)",
          display: "flex", alignItems: "flex-start", gap: 10,
          animation: "slideInRight 0.22s ease",
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            {t.tipo === "error" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, margin: 0, color: t.tipo === "error" ? "#991B1B" : "#166534" }}>
              {t.tipo === "error" ? "Error" : "Éxito"}
            </p>
            <p style={{ fontSize: "0.79rem", margin: "3px 0 0", lineHeight: 1.5, color: t.tipo === "error" ? "#7F1D1D" : "#14532D", wordBreak: "break-word" }}>
              {t.msg}
            </p>
          </div>
          <button onClick={() => onRemove(t.id)} aria-label="Cerrar notificación"
            style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: t.tipo === "error" ? "#DC2626" : "var(--green)", padding: "1px 3px", lineHeight: 1, fontSize: "0.85rem", opacity: 0.7, marginTop: -1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}