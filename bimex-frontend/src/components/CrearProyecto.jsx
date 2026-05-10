import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { parsearError } from "../utils/errores.js";
import {
  crearProyecto as crearProyectoContrato,
  mxneAStroops,
  hashearDocumentos,
  CONFIG,
} from "../stellar/contrato";
import { subirConFallback } from "../utils/ipfs";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconID() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <circle cx="8" cy="12" r="2"/>
      <path d="M14 9h4M14 12h4M14 15h2"/>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}

function IconPaperclip() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

function IconLightbulb() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="2" x2="12" y2="3"/>
      <path d="M12 6a6 6 0 0 1 6 6c0 2.2-1.2 4.1-3 5.2V19a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1.8C7.2 16.1 6 14.2 6 12a6 6 0 0 1 6-6z"/>
      <line x1="9" y1="22" x2="15" y2="22"/>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function IconIPFS() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ pasos, pasoActual }) {
  return (
    <div style={estilos.pasoIndicador}>
      {pasos.map((p, i) => {
        const completado = pasoActual > p.n;
        const activo     = pasoActual === p.n;
        return (
          <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              ...estilos.pasoBurbuja,
              background: completado ? "var(--green)" : activo ? "var(--navy)" : "var(--border2)",
              color: completado || activo ? "#fff" : "var(--muted)",
            }}>
              {completado ? <IconCheck /> : p.n}
            </div>
            <span style={{
              fontSize: "0.74rem",
              color: activo ? "var(--navy)" : "var(--muted)",
              fontWeight: activo ? 700 : 400,
            }} className="paso-label">
              {p.label}
            </span>
            {i < pasos.length - 1 && (
              <div style={{
                width: 20, height: 1.5,
                background: completado ? "var(--green)" : "var(--border2)",
                margin: "0 4px",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CrearProyecto({ direccion, onCerrar, onCreado, onError }) {
  const { t } = useTranslation();
  const modalRef = useRef(null);
  const botonAbrioRef = useRef(document.activeElement);
  const [paso, setPaso] = useState(1);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    modal.focus();
    function onKeyDown(e) {
      if (e.key === "Escape") { onCerrar(); return; }
      if (e.key !== "Tab") return;
      const focusables = modal.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const primero = focusables[0];
      const ultimo  = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
      } else {
        if (document.activeElement === ultimo)  { e.preventDefault(); primero?.focus(); }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      botonAbrioRef.current?.focus?.();
    };
  }, [onCerrar]);

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
  });

  // ── Paso 2: documentos
  const [docs, setDocs] = useState({ ine: null, plan: null, presupuesto: null });

  // ── Paso 3: CID del documento (IPFS o hex del hash como fallback)
  const [docCid,   setDocCid]   = useState(null);
  const [ipfsCids, setIpfsCids] = useState(null); // { ine, plan, presupuesto } cuando IPFS ok

  const [cargando,  setCargando]  = useState(false);
  const [hasheando, setHasheando] = useState(false);
  const [error,     setError]     = useState("");

  function manejarCambio(e) {
    const { name, value } = e.target;
    if (name === "meta") {
      const raw = value.replace(/[^0-9]/g, "");
      setForma({ ...forma, meta: raw });
    } else if (name === "tiempoMeses") {
      const n = parseInt(value, 10);
      setForma({ ...forma, tiempoMeses: isNaN(n) ? "" : String(Math.min(120, Math.max(1, n))) });
    } else {
      setForma({ ...forma, [name]: value });
    }
  }

  // Valor formateado con comas para mostrar en el input
  const metaFormateada = forma.meta
    ? Number(forma.meta).toLocaleString("es-MX")
    : "";

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
      const [resIne, resPlan, resPres] = await Promise.all([
        subirConFallback(docs.ine),
        subirConFallback(docs.plan),
        subirConFallback(docs.presupuesto),
      ]);

      const allIPFS = !resIne.usedFallback && !resPlan.usedFallback && !resPres.usedFallback;

      if (allIPFS) {
        setIpfsCids({ ine: resIne.cid, plan: resPlan.cid, presupuesto: resPres.cid });
        setDocCid(`${resIne.cid}|${resPlan.cid}|${resPres.cid}`);
      } else {
        setIpfsCids(null);
        const hash = await hashearDocumentos(docs.ine, docs.plan, docs.presupuesto);
        const cid = Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
        setDocCid(cid);
      }
      setPaso(3);
    } catch (err) {
      onError?.(err);
      setError(parsearError(err));
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
      setError(parsearError(err));
      onError?.(err);
    }
    setCargando(false);
  }

  const hexHash = docCid ?? "";

  const APY_INVERSOR = 0.05; // 5% — rendimiento que recibe el inversor
  const yieldEstimado = forma.meta && forma.tiempoMeses
    ? (Number(forma.meta) * APY_INVERSOR * (Number(forma.tiempoMeses) / 12)).toLocaleString("es-MX", { maximumFractionDigits: 0 })
    : null;
  const yieldNote = yieldEstimado
    ? `~5% anual sobre tu inversión · durante ${forma.tiempoMeses} mes${Number(forma.tiempoMeses) !== 1 ? "es" : ""}`
    : null;

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crear-titulo"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id="crear-titulo" style={{ fontWeight: 800, color: "var(--navy)" }}>{t("crear.title")}</h2>
          <button className="btn-close" onClick={onCerrar} aria-label={t("crear.closeAria")}>×</button>
        </div>

        {/* Stepper */}
        <Stepper pasos={PASOS} pasoActual={paso} />

        <form onSubmit={manejarSubmit}>

          {/* ══════════════════════════════════════════════
              PASO 1: Datos del proyecto
          ══════════════════════════════════════════════ */}
          {paso === 1 && (
            <>
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
                  style={estilos.input}
                  onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
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
                  style={{ ...estilos.input, resize: "none" }}
                  onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
                />
              </div>

              {/* Categoría + Tiempo */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="campo" style={{ marginBottom: 0 }}>
                  <label htmlFor="campo-categoria">{t("crear.categoryLabel")}</label>
                  <select
                    id="campo-categoria"
                    className="input"
                    name="categoria"
                    value={forma.categoria}
                    onChange={manejarCambio}
                    style={{ ...estilos.input, cursor: "pointer" }}
                    onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
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
                    style={estilos.input}
                    onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
                  />
                </div>
              </div>

              <div className="campo" style={{ marginTop: 18 }}>
                <label htmlFor="campo-meta">{t("crear.goalLabel")}</label>
                <input
                  id="campo-meta"
                  className="input"
                  name="meta"
                  type="text"
                  inputMode="numeric"
                  value={metaFormateada}
                  onChange={manejarCambio}
                  placeholder="Ej. 10,000"
                  style={estilos.input}
                  onFocus={e => { e.target.style.borderColor = "var(--navy)"; }}
                  onBlur={e => { e.target.style.borderColor = "var(--border2)"; }}
                />
              </div>

              {yieldEstimado && (
                <div style={estilos.yieldResumen}>
                  <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Ganarías como inversor
                  </span>
                  <p style={{ color: "var(--green)", fontWeight: 700, fontSize: "1.15rem", fontVariantNumeric: "tabular-nums", margin: "4px 0" }}>
                    ≈ ${yieldEstimado} MXNe
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>{yieldNote}</p>
                </div>
              )}

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
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
                <IconLock />
                <div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text2)", fontWeight: 700, marginBottom: 4 }}>
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
                icono={<IconID />}
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
                icono={<IconFileText />}
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
                icono={<IconBriefcase />}
                archivo={docs.presupuesto}
                onChange={f => setDoc("presupuesto", f)}
                selectLabel={t("crear.selectFile")}
                maxSizeLabel={t("crear.maxSize")}
              />

              <div style={estilos.docsTip}>
                <IconLightbulb />
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {t("crear.docsTip")}
                </span>
              </div>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
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
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{forma.nombre}</p>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                    {forma.categoria} · Meta: ${Number(forma.meta).toLocaleString("es-MX")} MXNe
                  </p>
                </div>

                {/* Documentos verificados */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  <DocChip nombre={docs.ine?.name} label="INE" />
                  <DocChip nombre={docs.plan?.name} label="Plan" />
                  <DocChip nombre={docs.presupuesto?.name} label="Presupuesto" />
                </div>

                {/* IPFS / Fallback panel */}
                <div style={estilos.hashPanel}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <IconIPFS />
                    <p style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {ipfsCids ? "Documentos en IPFS" : t("crear.hashTitle")}
                    </p>
                  </div>
                  {ipfsCids ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[["INE", ipfsCids.ine], ["Plan", ipfsCids.plan], ["Presupuesto", ipfsCids.presupuesto]].map(([label, cid]) => (
                        <div key={cid} style={{ fontSize: "0.72rem" }}>
                          <span style={{ color: "var(--muted)", marginRight: 6 }}>{label}</span>
                          <a href={`https://ipfs.io/ipfs/${cid}`} target="_blank" rel="noreferrer"
                             style={{ fontFamily: "monospace", color: "var(--navy)", wordBreak: "break-all" }}>
                            {cid.slice(0, 20)}…
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <code style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--navy)", wordBreak: "break-all", lineHeight: 1.6 }}>
                      {hexHash.slice(0, 32)}<br />{hexHash.slice(32)}
                    </code>
                  )}
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 8 }}>
                    {ipfsCids ? "Tus documentos están guardados en IPFS y verificables públicamente." : t("crear.hashNote")}
                  </p>
                </div>
              </div>

              <div style={estilos.infoBanner}>
                <IconInfo />
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  <p style={{ marginBottom: 8 }}>
                    {t("crear.yieldInfoTitle")}
                    <strong style={{ color: "var(--navy)" }}>{t("crear.yieldInfoYou")}</strong>
                    {t("crear.yieldInfoThey")}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={estilos.badgeVerde}>9.45% CETES · Etherfuse</span>
                    <span style={estilos.badgeNavy}>4% AMM · Stellar</span>
                    <span style={estilos.badgeAmber}>= 13.45% anual</span>
                  </div>
                </div>
              </div>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
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
  const [sizeError, setSizeError] = useState(false);
  return (
    <div style={estilos.campoDoc}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={estilos.docIcono}>{icono}</div>
        <div style={{ flex: 1 }}>
          <label htmlFor={id} style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text2)", display: "block", marginBottom: 2 }}>
            {label} <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <p style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: 8 }}>{descripcion}</p>
          <label htmlFor={id} className="file-label-touch" style={estilos.fileLabel}>
            {archivo ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {archivo.name}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                  ({(archivo.size / 1024).toFixed(0)} KB)
                </span>
              </>
            ) : (
              <>
                <IconPaperclip />
                <span style={{ fontSize: "0.8rem", color: "var(--navy)", fontWeight: 600 }}>{selectLabel}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{maxSizeLabel}</span>
              </>
            )}
          </label>
          <input
            id={id}
            type="file"
            accept={accept}
            style={{ display: "none" }}
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 10_000_000) { e.target.value = ""; setSizeError(true); onChange(null); return; }
              setSizeError(false);
              onChange(f);
            }}
          />
          {sizeError && (
            <p style={{ fontSize: "0.74rem", color: "#DC2626", marginTop: 6 }}>
              El archivo supera el límite de 10 MB.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente: Chip de documento confirmado ──────────────────────────────────
function DocChip({ label, nombre }) {
  if (!nombre) return null;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: "var(--green-dim)",
      border: "1px solid rgba(22,163,74,0.25)",
      borderRadius: 99,
      padding: "3px 10px",
      fontSize: "0.72rem",
      color: "var(--green)",
      fontWeight: 600,
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      {label}
    </span>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = {
  pasoIndicador: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 0 18px",
    marginBottom: 4,
    borderBottom: "1.5px solid var(--border)",
    marginTop: -4,
  },
  pasoBurbuja: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
    transition: "all 0.2s",
  },

  // Inputs
  input: {
    borderColor: "var(--border2)",
    outline: "none",
  },

  // Yield estimado
  yieldResumen: {
    background: "var(--green-dim)",
    border: "1.5px solid rgba(22,163,74,0.22)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
    marginTop: 16,
    marginBottom: 4,
    textAlign: "center",
  },

  // Docs privacy banner
  docsBanner: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    background: "var(--navy-dim)",
    border: "1.5px solid rgba(30,58,95,0.14)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
    margin: "14px 0 18px",
  },
  campoDoc: {
    background: "var(--bg)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
    marginBottom: 10,
  },
  docIcono: {
    background: "var(--navy-dim)",
    borderRadius: "var(--radius-sm)",
    padding: "8px",
    flexShrink: 0,
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fileLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1.5px dashed rgba(30,58,95,0.28)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 14px",
    cursor: "pointer",
    background: "#fff",
    transition: "all 0.15s",
  },
  docsTip: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: "8px 12px",
    background: "rgba(0,0,0,0.03)",
    borderRadius: "var(--radius-sm)",
    marginTop: 4,
  },

  // Paso 3
  resumenCard: {
    background: "var(--bg)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 18,
    marginBottom: 16,
  },
  hashPanel: {
    background: "#fff",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
  },
  infoBanner: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "var(--navy-dim)",
    border: "1.5px solid rgba(30,58,95,0.14)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 14px",
    marginTop: 4,
  },
  badgeVerde: {
    background: "var(--green-dim)",
    border: "1px solid rgba(22,163,74,0.25)",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--green)",
  },
  badgeNavy: {
    background: "var(--navy-dim)",
    border: "1px solid rgba(30,58,95,0.20)",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--navy)",
  },
  badgeAmber: {
    background: "var(--amber-dim)",
    border: "1px solid rgba(217,119,6,0.20)",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "var(--amber)",
  },
  error: {
    color: "var(--error, #DC2626)",
    fontSize: "0.83rem",
    background: "rgba(220,38,38,0.06)",
    border: "1px solid rgba(220,38,38,0.18)",
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    marginTop: 12,
  },
};
