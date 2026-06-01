import { useState } from "react";
import { useTranslation } from "react-i18next";
import { stroopsAMXNe } from "../stellar/contrato";
import { parsearError } from "../utils/errores.js";

function acortarDireccion(dir) {
  if (!dir || dir.length < 10) return dir;
  return `${dir.slice(0, 6)}…${dir.slice(-4)}`;
}

function acortarCid(cid) {
  if (!cid) return null;
  try {
    const s = cid.toString();
    if (s.length <= 24) return s;
    return `${s.slice(0, 12)}…${s.slice(-6)}`;
  } catch {
    return null;
  }
}

const IconFileText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconLock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function TarjetaProyecto({ proyecto, onAprobar, onRechazar }) {
  const { t } = useTranslation();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const fingerprint = proyecto.doc_cid ? acortarCid(proyecto.doc_cid) : null;

  async function handleConfirmarRechazo() {
    if (!motivo.trim()) return;
    setEnviando(true);
    try {
      await onRechazar(proyecto.id, motivo);
      setRechazando(false);
      setMotivo("");
      setEnviando(false);
    } catch (err) {
      setEnviando(false);
      const msg = parsearError(err);
      window.alert(msg);
      // keep the reject form open so admin can retry or edit
    }
  }

  return (
    <div style={estilos.tarjeta}>
      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
        <span style={estilos.iconTarjeta}><IconFileText /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.97rem", color: "var(--text)" }}>
              {proyecto.nombre}
            </span>
            <span style={estilos.badgeRevision}>{t("admin.inReview")}</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px", fontFamily: "'DM Mono'" }}>
            Meta: <span style={{ color: "var(--navy)", fontWeight: 600 }}>{stroopsAMXNe(proyecto.meta ?? 0)}</span>
          </div>
        </div>
        <span style={estilos.idBadge}>#{proyecto.id}</span>
      </div>

      {/* Meta info */}
      <div style={estilos.metaGrid}>
        <div>
          <div style={estilos.metaLabel}>{t("admin.owner")}</div>
          <code style={estilos.metaValor}>{acortarDireccion(proyecto.dueno)}</code>
        </div>
        {fingerprint && (
          <div>
            <div style={estilos.metaLabel}>{t("admin.docHash")}</div>
            <div style={estilos.fingerprintBadge}>
              <IconLock />
              <code style={{ fontFamily: "'DM Mono'", fontSize: "0.72rem" }}>{fingerprint}</code>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de rechazo inline */}
      {rechazando ? (
        <div style={estilos.rechazoForm}>
          <label
            htmlFor={`motivo-${proyecto.id}`}
            style={{ fontSize: "0.82rem", color: "#B91C1C", fontWeight: 600, marginBottom: "6px", display: "block" }}
          >
            {t("admin.rejectReason")}
          </label>
          <textarea
            id={`motivo-${proyecto.id}`}
            className="input"
            rows={3}
            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: "0.85rem", boxSizing: "border-box" }}
            placeholder={t("admin.rejectPlaceholder")}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            autoFocus
            disabled={enviando}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => { setRechazando(false); setMotivo(""); }}
              disabled={enviando}
            >
              {t("admin.cancel")}
            </button>
            <button
              className="btn"
              style={{ flex: 2, justifyContent: "center", background: "#DC2626", color: "#fff" }}
              onClick={handleConfirmarRechazo}
              disabled={enviando || !motivo.trim()}
            >
              {enviando ? t("admin.processing") : t("admin.confirmReject")}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-acciones" style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, minWidth: "120px", justifyContent: "center" }}
            onClick={() => onAprobar(proyecto.id)}
          >
            {t("admin.approve")}
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, minWidth: "120px", justifyContent: "center", color: "#DC2626", borderColor: "rgba(220,38,38,0.30)" }}
            onClick={() => setRechazando(true)}
          >
            {t("admin.reject")}
          </button>
        </div>
      )}
    </div>
  );
}

const estilos = {
  tarjeta: { background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "16px 18px" },
  iconTarjeta: { display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy-dim)", color: "var(--navy)", borderRadius: "8px", padding: "7px 8px", lineHeight: 1, flexShrink: 0 },
  badgeRevision: { display: "inline-block", background: "rgba(217,119,6,0.10)", color: "#B45309", border: "1px solid rgba(217,119,6,0.25)", borderRadius: "4px", padding: "1px 7px", fontSize: "0.70rem", fontWeight: 700, letterSpacing: "0.03em" },
  idBadge: { fontSize: "0.72rem", color: "var(--muted)", fontFamily: "'DM Mono'", background: "var(--border)", borderRadius: "4px", padding: "2px 6px", flexShrink: 0 },
  metaGrid: { display: "flex", gap: "20px", flexWrap: "wrap", padding: "10px 12px", background: "var(--navy-dim)", border: "1px solid rgba(30,58,95,0.12)", borderRadius: "var(--radius-sm)" },
  metaLabel: { fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: "3px" },
  metaValor: { fontFamily: "'DM Mono'", fontSize: "0.80rem", color: "var(--text)" },
  fingerprintBadge: { display: "inline-flex", alignItems: "center", gap: "5px", background: "var(--green-dim)", border: "1px solid rgba(22,163,74,0.22)", borderRadius: "4px", padding: "3px 8px", fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 },
  rechazoForm: { marginTop: "14px", background: "rgba(220,38,38,0.04)", border: "1.5px solid rgba(220,38,38,0.18)", borderRadius: "var(--radius-sm)", padding: "14px" },
};
