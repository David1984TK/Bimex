import { useState } from "react";
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
  const [paso, setPaso] = useState(1);

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

  // ── Paso 3: resultado del hash
  const [docHashBytes, setDocHashBytes] = useState(null);

  const [cargando,   setCargando]   = useState(false);
  const [hasheando,  setHasheando]  = useState(false);
  const [error,      setError]      = useState("");

  function manejarCambio(e) {
    setForma({ ...forma, [e.target.name]: e.target.value });
  }

  function setDoc(campo, archivo) {
    setDocs(d => ({ ...d, [campo]: archivo ?? null }));
  }

  // ── Validación paso 1
  function avanzarAPaso2() {
    setError("");
    if (!forma.nombre.trim()) { setError("El nombre del proyecto es obligatorio."); return; }
    if (!forma.meta || Number(forma.meta) <= 0) { setError("La meta debe ser mayor a 0."); return; }
    if (forma.tiempoMeses && (Number(forma.tiempoMeses) < 1 || Number(forma.tiempoMeses) > 120)) {
      setError("El tiempo estimado debe estar entre 1 y 120 meses."); return;
    }
    setPaso(2);
  }

  // ── Hash de documentos y avance a paso 3
  async function avanzarAPaso3() {
    setError("");
    if (!docs.ine || !docs.plan || !docs.presupuesto) {
      setError("Debes subir los tres documentos antes de continuar.");
      return;
    }
    setHasheando(true);
    try {
      const hash = await hashearDocumentos(docs.ine, docs.plan, docs.presupuesto);
      setDocHashBytes(hash);
      setPaso(3);
    } catch {
      setError("Error al procesar los documentos. Intenta de nuevo.");
    }
    setHasheando(false);
  }

  // ── Envío final
  async function manejarSubmit(e) {
    e.preventDefault();
    if (paso !== 3 || !docHashBytes) return;
    setCargando(true);
    setError("");
    try {
      const metaStroops = mxneAStroops(Number(forma.meta));
      await crearProyectoContrato(direccion, forma.nombre, metaStroops, docHashBytes);
      onCreado();
    } catch (err) {
      console.error("Error al crear proyecto:", err);
      setError(err?.message || "Error al crear el proyecto. Intenta de nuevo.");
    }
    setCargando(false);
  }

  // Hex del hash para mostrar al usuario
  const hexHash = docHashBytes
    ? Array.from(docHashBytes).map(b => b.toString(16).padStart(2, "0")).join("")
    : "";

  // Yield estimado con tasas reales: ~9.45% CETES + ~4% AMM = ~13.45% APY
  const APY_CETES = 0.0945;
  const APY_AMM   = 0.04;
  const APY_TOTAL = APY_CETES + APY_AMM;
  const yieldEstimado = forma.meta && forma.tiempoMeses
    ? (Number(forma.meta) * APY_TOTAL * (Number(forma.tiempoMeses) / 12)).toLocaleString("es-MX", { maximumFractionDigits: 0 })
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
          <h2 id="crear-titulo">Registrar proyecto</h2>
          <button className="btn-close" onClick={onCerrar} aria-label="Cerrar formulario de creación">×</button>
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
                <label>Ícono del proyecto</label>
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
                <label htmlFor="campo-nombre">Nombre del proyecto</label>
                <input
                  id="campo-nombre"
                  className="input"
                  name="nombre"
                  value={forma.nombre}
                  onChange={manejarCambio}
                  placeholder="Ej. Huerto comunitario CDMX"
                  maxLength={60}
                />
              </div>

              {/* Descripción */}
              <div className="campo">
                <label htmlFor="campo-descripcion">Descripción breve</label>
                <textarea
                  id="campo-descripcion"
                  className="input"
                  name="descripcion"
                  value={forma.descripcion}
                  onChange={manejarCambio}
                  placeholder="¿Qué hace tu proyecto y para quién?"
                  rows={3}
                  style={{ resize: "none" }}
                />
              </div>

              {/* Categoría + Tiempo */}
              <div className="crear-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div className="campo" style={{ marginBottom: 0 }}>
                  <label htmlFor="campo-categoria">Categoría</label>
                  <select
                    id="campo-categoria"
                    className="input"
                    name="categoria"
                    value={forma.categoria}
                    onChange={manejarCambio}
                    style={{ cursor: "pointer", background: "#fff" }}
                  >
                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="campo" style={{ marginBottom: 0 }}>
                  <label htmlFor="campo-tiempo">Tiempo estimado (meses)</label>
                  <input
                    id="campo-tiempo"
                    className="input"
                    name="tiempoMeses"
                    type="number"
                    value={forma.tiempoMeses}
                    onChange={manejarCambio}
                    placeholder="Ej. 6"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              {/* Meta */}
              <div className="campo" style={{ marginTop: "18px" }}>
                <label htmlFor="campo-meta">Meta de financiamiento (MXNe)</label>
                <input
                  id="campo-meta"
                  className="input"
                  name="meta"
                  type="number"
                  value={forma.meta}
                  onChange={manejarCambio}
                  placeholder="Ej. 10000"
                  min="1"
                />
              </div>

              {/* Yield estimado */}
              {yieldEstimado && (
                <div style={estilos.yieldResumen}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Yield estimado al finalizar
                    </span>
                    <span style={{ fontFamily: "'DM Mono'", color: "var(--amber)", fontWeight: 700, fontSize: "1rem" }}>
                      ≈ ${yieldEstimado} MXNe
                    </span>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "4px" }}>
                    ~9.45% CETES + ~4% AMM · con la meta al 100% durante {forma.tiempoMeses} mes{Number(forma.tiempoMeses) !== 1 ? "es" : ""}
                  </p>
                </div>
              )}

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={onCerrar} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={avanzarAPaso2} style={{ flex: 2, justifyContent: "center" }}>
                  Siguiente: Documentos →
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
                    Tus documentos nunca salen de tu dispositivo
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>
                    Solo se sube una huella digital (SHA-256) a la blockchain. Esto protege tu privacidad
                    y garantiza a los backers que el proyecto tiene un responsable identificado.
                  </p>
                </div>
              </div>

              {/* INE */}
              <CampoDocumento
                id="doc-ine"
                label="INE / Identificación oficial"
                descripcion="Del responsable del proyecto (imagen o PDF)"
                accept=".pdf,image/jpeg,image/png,image/webp"
                icono="🪪"
                archivo={docs.ine}
                onChange={f => setDoc("ine", f)}
              />

              {/* Plan del proyecto */}
              <CampoDocumento
                id="doc-plan"
                label="Plan del proyecto"
                descripcion="Descripción detallada, objetivos y cronograma (PDF)"
                accept=".pdf"
                icono="📋"
                archivo={docs.plan}
                onChange={f => setDoc("plan", f)}
              />

              {/* Presupuesto */}
              <CampoDocumento
                id="doc-presupuesto"
                label="Presupuesto detallado"
                descripcion="Desglose de gastos y justificación del monto (PDF)"
                accept=".pdf"
                icono="💼"
                archivo={docs.presupuesto}
                onChange={f => setDoc("presupuesto", f)}
              />

              <div style={estilos.docsTip}>
                <span>💡</span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  Puedes subir borradores — lo importante es que el proyecto sea real y trazable.
                </span>
              </div>

              {error && <p style={estilos.error}>{error}</p>}

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setPaso(1); setError(""); }} style={{ flex: 1 }}>
                  ← Atrás
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={avanzarAPaso3}
                  disabled={hasheando}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {hasheando ? "Procesando documentos…" : "Generar huella digital →"}
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              PASO 3: Confirmar y crear
          ══════════════════════════════════════════════ */}
          {paso === 3 && docHashBytes && (
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
                    🔐 Huella digital de tus documentos (SHA-256)
                  </p>
                  <code style={{ fontFamily: "'DM Mono'", fontSize: "0.72rem", color: "var(--primary)", wordBreak: "break-all", lineHeight: 1.6 }}>
                    {hexHash.slice(0, 32)}<br />{hexHash.slice(32)}
                  </code>
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "8px" }}>
                    Esta huella se almacenará en la blockchain de Stellar. Nadie puede falsificarla.
                  </p>
                </div>
              </div>

              {/* Info yield */}
              <div style={estilos.infoBanner}>
                <span>ℹ️</span>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }}>
                  <p style={{ marginBottom: "8px" }}>
                    Tus backers aportan capital, no lo donan — eso genera mayor confianza.
                    <strong style={{ color: "var(--primary)" }}> Tú recibes el yield</strong>,
                    ellos sacan lo que metieron cuando el proyecto termina.
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
                  ← Atrás
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={cargando}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {cargando ? "Enviando…" : "📬 Mandar a revisión"}
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
function CampoDocumento({ id, label, descripcion, accept, icono, archivo, onChange }) {
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
                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>Seleccionar archivo</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>(máx. 10 MB)</span>
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
