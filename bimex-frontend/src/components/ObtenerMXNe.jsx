import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CONFIG } from "../stellar/contrato";

const RAMP_URL = "https://app.etherfuse.com/ramp";

export default function ObtenerMXNe({ compact = false, variant = "banner" }) {
  const { t } = useTranslation();
  const [expandido, setExpandido] = useState(false);
  const isTestnet = CONFIG.NETWORK !== "mainnet";
  const toggle = () => setExpandido((prev) => !prev);

  if (variant === "button") {
    return (
      <a
        href={RAMP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: compact ? "6px 14px" : "10px 20px",
          fontSize: compact ? "0.78rem" : "0.84rem",
          fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
        }}
        title={t("obtenerMXNe.buttonTitle")}
        aria-label={t("obtenerMXNe.buttonAria")}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        {t("obtenerMXNe.buttonLabel")}
      </a>
    );
  }

  if (variant === "card") {
    return (
      <div style={{
        background: "var(--card)", border: "1.5px solid var(--border)",
        borderRadius: "var(--radius)", padding: compact ? "16px 18px" : "24px 28px",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "var(--navy-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", margin: "0 0 4px" }}>
              {t("obtenerMXNe.cardTitle")}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", margin: "0 0 12px", lineHeight: 1.55 }}>
              {t("obtenerMXNe.cardDesc")}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <a href={RAMP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "10px 22px", fontSize: "0.84rem", fontWeight: 600, textDecoration: "none" }}>
                {t("obtenerMXNe.cta")}
              </a>
              <button onClick={toggle} className="btn btn-ghost" style={{ padding: "10px 16px", fontSize: "0.82rem", fontWeight: 500, color: "var(--navy)" }} aria-expanded={expandido}>
                {expandido ? t("obtenerMXNe.hideTutorial") : t("obtenerMXNe.showTutorial")}
              </button>
            </div>
            {expandido && <TutorialPasos t={t} isTestnet={isTestnet} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--navy) 0%, #0f2a4a 100%)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: "var(--radius)",
      padding: compact ? "16px 20px" : "24px 28px", color: "#fff",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: "var(--radius-sm)", background: "rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 4px", lineHeight: 1.4 }}>
            {t("obtenerMXNe.bannerTitle")}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.84rem", margin: "0 0 14px", lineHeight: 1.55 }}>
            {t("obtenerMXNe.bannerDesc")}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <a href={RAMP_URL} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: "#fff", color: "var(--navy)", padding: "10px 22px",
              borderRadius: "var(--radius-sm)", fontWeight: 700, fontSize: "0.84rem",
              textDecoration: "none", transition: "opacity 0.15s",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {t("obtenerMXNe.cta")}
            </a>
            <button onClick={toggle} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.20)",
              color: "rgba(255,255,255,0.80)", padding: "9px 16px",
              borderRadius: "var(--radius-sm)", fontWeight: 500, fontSize: "0.82rem",
              cursor: "pointer",
            }} aria-expanded={expandido}>
              {expandido ? t("obtenerMXNe.hideTutorial") : t("obtenerMXNe.showTutorial")}
            </button>
          </div>
        </div>
      </div>
      {expandido && <TutorialPasos t={t} isTestnet={isTestnet} />}
    </div>
  );
}

function TutorialPasos({ t, isTestnet }) {
  const pasos = [
    {
      num: "1",
      titulo: t("obtenerMXNe.paso1Titulo"),
      desc: t("obtenerMXNe.paso1Desc"),
      icono: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
      ),
    },
    {
      num: "2",
      titulo: t("obtenerMXNe.paso2Titulo"),
      desc: t("obtenerMXNe.paso2Desc"),
      icono: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      ),
    },
    {
      num: "3",
      titulo: t("obtenerMXNe.paso3Titulo"),
      desc: t("obtenerMXNe.paso3Desc"),
      icono: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
        {t("obtenerMXNe.tutorialTitle")}
      </p>
      {pasos.map((paso) => (
        <div key={paso.num} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.82rem", color: "rgba(255,255,255,0.85)" }}>
            {paso.num}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
              <span style={{ color: "rgba(255,255,255,0.55)" }}>{paso.icono}</span>
              <strong style={{ fontWeight: 600, fontSize: "0.88rem", color: "#fff" }}>{paso.titulo}</strong>
            </div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.80rem", margin: 0, lineHeight: 1.55 }}>
              {paso.desc}
            </p>
          </div>
        </div>
      ))}
      {isTestnet && (
        <div style={{ marginTop: 4, padding: "10px 14px", background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.25)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--amber)" }}>{t("obtenerMXNe.testnetNoteTitle")}</strong>{" "}
          {t("obtenerMXNe.testnetNote")}
        </div>
      )}
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.70rem", margin: "4px 0 0", lineHeight: 1.5 }}>
        {t("obtenerMXNe.regulatoryNote")}
      </p>
    </div>
  );
}
