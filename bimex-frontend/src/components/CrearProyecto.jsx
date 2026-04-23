import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  crearProyecto as crearProyectoContrato,
  mxneAStroops,
  hashearDocumentos,
  CONFIG,
} from "../stellar/contrato";

const PASOS = [
  { n: 1, label: "Datos del proyecto" },
  { n: 2, label: "Documentos"         },
  { n: 3, label: "Confirmar"          },
];

const emojis    = ["🌱", "🤝", "📚", "☀️", "🏥", "🎨", "🏗️", "🌊"];
const categorias = ["Comunidad", "Finanzas", "Educación", "Energía", "Salud", "Arte", "Infraestructura"];

export default function CrearProyecto({ direccion, onCerrar, onCreado }) {
  const { t } = useTranslation();
  const [paso, setPaso] = useState(1);

  const PASOS = [
    { n: 1, label: t("crear.step1") },
    { n: 2, label: t("crear.step2") },
    { n: 3, label: t("crear.step3") },
  ];

  const categorias = Object.keys(t("crear.categories", { returnObjects: true }));

  // ── Paso 1: datos del proyecto
  const [forma, setForma] = useState({
    nombre: "",
    descripcion: "",
    meta: "",
    tiempoMeses: "",
    categoria: "Comunidad",
    emoji: "🌱",
  });

  // ── Paso 2: documentos
  const [docs, setDocs] = useState({ ine: null, plan: null, presupuesto: null });

  // ── Paso 3: CID del documento (IPFS o hex del hash como fallback)
  const [docCid, setDocCid] = useState(null);

  const [cargando,   setCargando]   = useState(false);
  const [hasheando,  setHasheando]  = useState(false);
  const [error,      setError]      = useState("");

  function manejarCambio(e) {
    setForma({ ...forma, [e.target.name]: e.target.value });
  }

  function setDoc(campo, archivo) {
    setDocs(d => ({ ...d, [campo]: archivo ?? null }));
  }

  function avanzarAPaso2() {
    setError("");
    if (!forma.nombre.trim()) { setError(t("crear.errName")); return; }
    if (!forma.meta || Number(forma.meta) <= 0) { setError(t("crear.errGoal")); return; }
    if (forma.tiempoMeses && (Number(forma.tiempoMeses) < 1 || Number(forma.tiempoMeses) > 120)) {
      setError(t("crear.errTime")); return;
    }
    setPaso(2);
  }

  async function avanzarAPaso3() {
    setError("");
    if (!docs.ine || !docs.plan || !docs.presupuesto) {
      setError(t("crear.errDocs"));
      return;
    }
    setHasheando(true);
    try {
      const hash = await hashearDocumentos(docs.ine, docs.plan, docs.presupuesto);
      // Convert hash bytes to hex string as the document CID.
      // Replace with a real IPFS upload when the pinning service is integrated.
      const cid = Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
      setDocCid(cid);
      setPaso(3);
    } catch {
      setError(t("crear.errHash"));
    }
    setHasheando(false);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    if (paso !== 3 || !docCid) return;
    setCargando(true);
    setError("");
    try {
      const metaStroops = mxneAStroops(Number(forma.meta));
      await crearProyectoContrato(direccion, forma.nombre, metaStroops, docCid);
      onCreado();
    } catch (err) {
      console.error("Error al crear proyecto:", err);
      setError(err?.message || t("crear.errCreate"));
    }
    setCargando(false);
  }

  // Hex del CID para mostrar al usuario
  const hexHash = docCid ?? "";

  // Yield estimado con tasas reales: ~9.45% CETES + ~4% AMM = ~13.45% APY
  const APY_CETES = 0.0945;
  const APY_AMM   = 0.04;
  const APY_TOTAL = APY_CETES + APY_AMM;
  const yieldEstimado = forma.meta && forma.tiempoMeses
    ? (Number(forma.meta) * APY_TOTAL * (Number(forma.tiempoMeses) / 12)).toLocaleString("es-MX", { maximumFractionDigits: 0 })
    : null;
  const yieldNote = yieldEstimado
    ? t("crear.yieldNote", { months: forma.tiempoMeses, plural: Number(forma.tiempoMeses) !== 1 ? "s" : "" })
    : null;

  return (
    <div className="modal-overlay" onClick={onCerrar} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crear-titulo"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id="crear-titulo">{t("crear.title")}</h2>
          <button className="btn-close" onClick={onCerrar} aria-label={t("crear.closeAria")}>×</button>
        </div>

        {/* Indicador de pasos */}
        <div style={estilos.pasoIndicador}>
          {PASOS.map((p, i) => (
            <div key={p.n} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                ...estilos.pasoBurbuja,
                background: paso >= p.n ? "var(--primary)" : "var(--border-soft)",
                color: paso >= p.n ? "#fff" : "var(--muted)",
              }}>
                {paso > p.n ? "✓" : p.n}
              </div>
              <span style={{
                fontSize: "0.74rem",
                color: paso === p.n ? "var(--primary)" : "var(--muted)",
                fontWeight: paso === p.n ? 700 : 400,
              }} className="paso-label">
                {p.label}
              </span>
              {i < PASOS.length - 1 && (
                <div style={{ width: "20px", height: "1.5px", background: paso > p.n ? "var(--primary)" : "var(--border-soft)", margin: "0 4px" }} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={manejarSubmit}>

          {/* ══════════════════════════════════════════════
              PASO 1: Datos del proyecto
          ══════════════════════════════════════════════ */}
          {paso === 1 && (
            <>
              {/* Emoji */}
              <div className="campo">
                <label>{t("crear.iconLabel")}</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {emojis.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setForma({ ...forma, emoji: em })}
                      style={{
                        ...estilos.emojiBtn,
                        background: forma.emoji === em ? "var(--primary-dim)" : "var(--bg)",
                        border: `1.5px solid ${forma.emoji === em ? "rgba(124,58,237,0.40)" : "var(--border)"}`,
                        boxShadow: forma.emoji === em ? "0 0 0 3px rgba(124,58,237,0.10)" : "none",
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div className="campo">
                <label htmlFor="campo-nombre">{t("crear.nameLabel")}</label>
                <input
                  id="campo-nombre"
                  className="input"
                  name="nombre"
                  value={forma.nombre}
                  onChange={manejarCambio}
                  placeholder={t("crear.namePlaceholder")}
                  maxLength={60}
                />
              </div>

              <div className="campo">
                <label htmlFor="campo-descripcion">{t("crear.descLabel")}</label>
                <textarea
                  id="campo-descripcion"
                  className="input"
                  name="descripcion"
                  value={forma.descripcion}
                  onChange={manejarCambio}
                  placeholder={t("crear.descPlaceholder")}
                  rows={3}
                  style={{ resize: "none" }}
                />
              </div>

              {/* Categoría + Tiempo */}
              <div className="crear-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="campo" style={{ marginBottom: 0 }}>
                  <label htmlFor="campo-categoria">{t("crear.categoryLabel")}</label>
                  <select
                    id="campo-categoria"
                    className="input"
                    name="categoria"
                    value={forma.categoria}
                    onChange={manejarCambio}
                    style={{ cursor: "pointer", background: "#fff" }}
                  >
                    {categorias.map(c => <option key={c} value={c}>{t(`crear.categories.${c}`)}</option>)}
                  </select>
                </div>
                <div className="campo" style={{ marginBottom: 0 }}>
                  <label htmlFor="campo-tiempo">{t("crear.timeLabel")}</label>
                  <input
                    id="campo-tiempo"
                    className="input"
                    name="tiempoMeses"
                    type="number"
                    value={forma.tiempoMeses}
                    onChange={manejarCambio}
                    placeholder={t("crear.timePlaceholder")}
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div className="campo" style={{ marginTop: "18px" }}>
                <label htmlFor="campo-meta">{t("crear.goalLabel")}</label>
                <input
                  id="campo-meta"
                  className="input"
                  name="meta"
                  type="number"
                  value={forma.meta}
                  onChange={manejarCambio}
                  placeholder={t("crear.goalPlaceholder")}
                  min="1"
                />
              </div>

              {yieldEstimado && (
                <div style={estilos.yieldResumen}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {t("crear.yieldLabel")}
                    </span>
                    <span style={{ fontFamily: "'DM Mono'", color: "var(--amber)", fontWeight: 700, fontSize: "1rem" }}>
                      ≈ ${yieldEstimado} MXNe
                    </span>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>{yieldNote}</p>
                </div>
              )}

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={onCerrar} style={{ flex: 1 }}>
                  {t("crear.cancel")}
                </button>
                <button type="button" className="btn btn-primary" onClick={avanzarAPaso2} style={{ flex: 2, justifyContent: "center" }}>
                  {t("crear.nextDocs")}
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              PASO 2: Documentos oficiales
          ══════════════════════════════════════════════ */}
          {paso === 2 && (
            <>
              <div style={estilos.docsBanner}>
                <span style={{ fontSize: "1.3rem" }}>🔒</span>
                <div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text2)", fontWeight: 700, marginBottom: "4px" }}>
                    {t("crear.docsPrivacyTitle")}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    {t("crear.docsPrivacyDesc")}
                  </p>
                </div>
              </div>

              <CampoDocumento
                id="doc-ine"
                label={t("crear.docIneLabel")}
                descripcion={t("crear.docIneDesc")}
                accept=".pdf,image/jpeg,image/png,image/webp"
                icono="🪪"
                archivo={docs.ine}
                onChange={f => setDoc("ine", f)}
                selectLabel={t("crear.selectFile")}
                maxSizeLabel={t("crear.maxSize")}
              />

              <CampoDocumento
                id="doc-plan"
                label={t("crear.docPlanLabel")}
                descripcion={t("crear.docPlanDesc")}
                accept=".pdf"
                icono="📋"
                archivo={docs.plan}
                onChange={f => setDoc("plan", f)}
                selectLabel={t("crear.selectFile")}
                maxSizeLabel={t("crear.maxSize")}
              />

              <CampoDocumento
                id="doc-presupuesto"
                label={t("crear.docBudgetLabel")}
                descripcion={t("crear.docBudgetDesc")}
                accept=".pdf"
                icono="💼"
                archivo={docs.presupuesto}
                onChange={f => setDoc("presupuesto", f)}
                selectLabel={t("crear.selectFile")}
                maxSizeLabel={t("crear.maxSize")}
              />

              <div style={estilos.docsTip}>
                <span>💡</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {t("crear.docsTip")}
                </span>
              </div>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setPaso(1); setError(""); }} style={{ flex: 1 }}>
                  {t("crear.back")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={avanzarAPaso3}
                  disabled={hasheando}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {hasheando ? t("crear.processing") : t("crear.generateHash")}
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              PASO 3: Confirmar y crear
          ══════════════════════════════════════════════ */}
          {paso === 3 && docCid && (
            <>
              {/* Resumen del proyecto */}
              <div style={estilos.resumenCard}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <span style={{ fontSize: "2rem" }}>{forma.emoji}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{forma.nombre}</p>
                    <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      {forma.categoria} · Meta: ${Number(forma.meta).toLocaleString("es-MX")} MXNe
                    </p>
                  </div>
                </div>

                {/* Documentos verificados */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                  <DocChip nombre={docs.ine?.name} icono="🪪" label="INE" />
                  <DocChip nombre={docs.plan?.name} icono="📋" label="Plan" />
                  <DocChip nombre={docs.presupuesto?.name} icono="💼" label="Presupuesto" />
                </div>

                {/* Hash fingerprint */}
                <div style={estilos.hashPanel}>
                  <p style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    {t("crear.hashTitle")}
                  </p>
                  <code style={{ fontFamily: "'DM Mono'", fontSize: "0.72rem", color: "var(--primary)", wordBreak: "break-all", lineHeight: 1.6 }}>
                    {hexHash.slice(0, 32)}<br />{hexHash.slice(32)}
                  </code>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "8px" }}>
                    {t("crear.hashNote")}
                  </p>
                </div>
              </div>

              <div style={estilos.infoBanner}>
                <span>ℹ️</span>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  <p style={{ marginBottom: "8px" }}>
                    {t("crear.yieldInfoTitle")}
                    <strong style={{ color: "var(--primary)" }}>{t("crear.yieldInfoYou")}</strong>
                    {t("crear.yieldInfoThey")}
                  </p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={estilos.badgeVerde}>🏦 9% CETES · Etherfuse</span>
                    <span style={estilos.badgePurple}>🌊 4% AMM · Stellar</span>
                    <span style={estilos.badgeAmber}>= 13% anual para ti</span>
                  </div>
                </div>
              </div>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setPaso(2); setError(""); }} style={{ flex: 1 }}>
                  {t("crear.back")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={cargando}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {cargando ? t("crear.submitting") : t("crear.submit")}
                </button>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}

// ── Componente: Campo de documento ───────────────────────────────────────────
function CampoDocumento({ id, label, descripcion, accept, icono, archivo, onChange, selectLabel, maxSizeLabel }) {
  return (
    <div style={estilos.campoDoc}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <span style={estilos.docIcono}>{icono}</span>
        <div style={{ flex: 1 }}>
          <label htmlFor={id} style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text2)", display: "block", marginBottom: "2px" }}>
            {label} <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: "8px" }}>{descripcion}</p>
          <label htmlFor={id} className="file-label-touch" style={estilos.fileLabel}>
            {archivo ? (
              <>
                <span style={{ color: "#059669" }}>✓</span>
                <span style={{ fontSize: "0.78rem", color: "#059669", fontWeight: 600, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {archivo.name}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                  ({(archivo.size / 1024).toFixed(0)} KB)
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: "1rem" }}>📎</span>
                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>{selectLabel}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{maxSizeLabel}</span>
              </>
            )}
          </label>
          <input
            id={id}
            type="file"
            accept={accept}
            style={{ display: "none" }}
            onChange={e => onChange(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Componente: Chip de documento confirmado ──────────────────────────────────
function DocChip({ icono, label, nombre }) {
  if (!nombre) return null;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      background: "rgba(5,150,105,0.08)",
      border: "1px solid rgba(5,150,105,0.20)",
      borderRadius: "99px",
      padding: "3px 10px",
      fontSize: "0.72rem",
      color: "#059669",
      fontWeight: 600,
    }}>
      {icono} {label} ✓
    </span>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = {
  pasoIndicador: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 0 18px",
    marginBottom: "4px",
    borderBottom: "1.5px solid var(--border-soft)",
    marginTop: "-4px",
  },
  pasoBurbuja: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
    transition: "all 0.2s",
  },
  emojiBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1.3rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },
  yieldResumen: {
    background: "rgba(217,119,6,0.07)",
    border: "1.5px solid rgba(217,119,6,0.18)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginBottom: "16px",
  },
  docsBanner: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    background: "var(--primary-dim)",
    border: "1.5px solid rgba(124,58,237,0.16)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
    margin: "14px 0 18px",
  },
  campoDoc: {
    background: "var(--bg)",
    border: "1.5px solid var(--border-soft)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
    marginBottom: "10px",
  },
  docIcono: {
    fontSize: "1.6rem",
    background: "var(--primary-dim)",
    borderRadius: "8px",
    padding: "6px 8px",
    lineHeight: 1,
    flexShrink: 0,
    marginTop: "2px",
  },
  fileLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "1.5px dashed rgba(124,58,237,0.30)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 14px",
    cursor: "pointer",
    background: "#fff",
    transition: "all 0.15s",
  },
  docsTip: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "8px 12px",
    background: "rgba(0,0,0,0.03)",
    borderRadius: "var(--radius-sm)",
    marginTop: "4px",
  },
  resumenCard: {
    background: "var(--bg)",
    border: "1.5px solid var(--border-soft)",
    borderRadius: "var(--radius-sm)",
    padding: "18px",
    marginBottom: "16px",
  },
  hashPanel: {
    background: "#fff",
    border: "1.5px solid rgba(124,58,237,0.16)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
  },
  infoBanner: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    background: "var(--primary-dim)",
    border: "1.5px solid rgba(124,58,237,0.14)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginTop: "4px",
  },
  badgeVerde:  { background: "rgba(5,150,105,0.10)", border: "1px solid rgba(5,150,105,0.25)", borderRadius: "6px", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, color: "#059669" },
  badgePurple: { background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.20)", borderRadius: "6px", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" },
  badgeAmber:  { background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.20)", borderRadius: "6px", padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700, color: "var(--amber)" },
  error: {
    color: "var(--error)",
    fontSize: "0.83rem",
    background: "rgba(220,38,38,0.06)",
    border: "1px solid rgba(220,38,38,0.18)",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    marginTop: "12px",
  },
};
