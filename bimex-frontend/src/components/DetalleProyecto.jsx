import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { parsearError } from "../utils/errores.js";
import {
  contribuir as contribuirContrato,
  retirarPrincipal as retirarPrincipalContrato,
  reclamarYield as reclamarYieldContrato,
  abandonarProyecto as abandonarProyectoContrato,
  solicitarContinuar as solicitarContinuarContrato,
  obtenerAportacion,
  calcularYield,
  obtenerProyecto,
  obtenerBalanceMXNe,
  mxneAStroops,
  stroopsAMXNe,
  CONFIG,
} from "../stellar/contrato";

const ESTADO_CONFIG = {
  EtapaInicial: { labelKey: "status.EtapaInicial", clase: "badge-muted" },
  EnProgreso:   { labelKey: "status.EnProgreso",   clase: "badge-teal" },
  Abandonado:   { labelKey: "status.Abandonado",   clase: "badge-red" },
  Liberado:     { labelKey: "status.Liberado",     clase: "badge-amber" },
};

function estimarYieldDueno(proyecto) {
  if (!proyecto?.timestamp_inicio || !proyecto?.aportado) return BigInt(0);
  const ahora = Math.floor(Date.now() / 1000);
  const segundos = Math.max(0, ahora - proyecto.timestamp_inicio);
  const minutos = BigInt(Math.floor(segundos / 60));
  const cetesCap = BigInt(proyecto.capital_en_cetes ?? 0);
  const ammCap   = BigInt(proyecto.capital_en_amm   ?? 0);
  const cetesBps = BigInt(CONFIG.YIELD_CETES_BPS);
  const ammBps   = BigInt(CONFIG.YIELD_AMM_BPS);
  const MINUTOS_ANO = BigInt(525_600);
  const yieldCetes = (cetesCap * cetesBps * minutos) / BigInt(10_000) / MINUTOS_ANO;
  const yieldAmm   = (ammCap   * ammBps   * minutos) / BigInt(10_000) / MINUTOS_ANO;
  return yieldCetes + yieldAmm;
}

function calcProyeccion(cantidadMXNe, meses, modo) {
  const capital = Number(cantidadMXNe) || 0;
  const tasaInversor = modo === "inversor" ? 0.05 : 0;
  const tasaProyecto = modo === "inversor" ? 0.06 : 0.11;
  const fraccion = meses / 12;
  return {
    tuYield:        capital * tasaInversor * fraccion,
    proyectoRecibe: capital * tasaProyecto * fraccion,
    totalRetiras:   capital + capital * tasaInversor * fraccion,
  };
}

function fmt(n) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// SVG icons
const IconArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconFile = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function DetalleProyecto({ proyecto: proyectoInicial, direccion, onCerrar, onError, onToast }) {
  const { t } = useTranslation();
  const montadoRef = useRef(true);
  useEffect(() => () => { montadoRef.current = false; }, []);
  const [proyecto,          setProyecto]          = useState(proyectoInicial);
  const [cantidad,          setCantidad]          = useState("");
  const [cargando,          setCargando]          = useState(false);
  const [modoInversion,     setModoInversion]     = useState("inversor");
  const [vistaRetirar,      setVistaRetirar]      = useState(false);
  const [confirmarAbandonar,setConfirmarAbandonar]= useState(false);
  const [miAportacion,      setMiAportacion]      = useState(BigInt(0));
  const [miYield,           setMiYield]           = useState(BigInt(0));
  const [balanceMXNe,       setBalanceMXNe]       = useState(null);

  const estado    = proyecto.estado ?? "EtapaInicial";
  const estadoCfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.EtapaInicial;
  const esDueno      = direccion === proyecto.dueno;
  const esAbandonado = estado === "Abandonado";
  const aceptaFondos = estado === "EtapaInicial" || estado === "EnProgreso";

  const aportado   = Number(proyecto.aportado ?? 0);
  const meta       = Number(proyecto.meta ?? 0);
  const porcentaje = meta > 0 ? Math.min((aportado / meta) * 100, 100) : 0;

  const yieldDueno = esDueno ? estimarYieldDueno(proyecto) : BigInt(0);

  // Documentos IPFS: "CID1|CID2|CID3" → array
  const DOC_LABELS = [
    t("detalle.docINE"),
    t("detalle.docPlan"),
    t("detalle.docPresupuesto"),
  ];
  const docs = proyecto.doc_hash
    ? proyecto.doc_hash.split("|").filter(Boolean)
    : [];

  const refrescar = useCallback(async () => {
    if (!direccion || proyecto.id == null) return;
    try {
      const [proyActualizado, aport, yld, bal] = await Promise.all([
        obtenerProyecto(proyecto.id).catch(() => null),
        obtenerAportacion(proyecto.id, direccion).catch(() => BigInt(0)),
        calcularYield(proyecto.id, direccion).catch(() => BigInt(0)),
        obtenerBalanceMXNe(direccion).catch(() => null),
      ]);
      if (!montadoRef.current) return;
      if (proyActualizado) setProyecto(proyActualizado);
      setMiAportacion(aport);
      setMiYield(yld);
      setBalanceMXNe(bal);
    } catch (e) {
      if (montadoRef.current) onError?.(parsearError(e));
    }
  }, [proyecto.id, direccion, onError]);

  useEffect(() => { refrescar(); }, [refrescar]);

  // Escape → volver
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onCerrar(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  function mensajeCorto(err) {
    const msg = err?.message || t("detalle.errContract");
    if (msg.includes("HostError") || msg.includes("XDR") || msg.length > 120) return t("detalle.errContract");
    return msg;
  }

  function handleCantidadChange(e) {
    const raw = e.target.value;
    if (/[eE+\-]/.test(raw)) return;
    setCantidad(raw);
  }

  const cantidadNum    = Number(cantidad);
  const cantidadValida = cantidad !== "" && !isNaN(cantidadNum) && cantidadNum > 0;
  const superaBalance  = cantidadValida && balanceMXNe !== null && mxneAStroops(cantidadNum) > balanceMXNe;
  const errorCantidad  = !cantidadValida && cantidad !== ""
    ? t("detalle.errAmount")
    : superaBalance
    ? t("detalle.errBalance", { balance: stroopsAMXNe(balanceMXNe) })
    : null;

  const proyeccion = calcProyeccion(cantidadNum, 12, modoInversion);

  async function manejarContribuir() {
    if (!cantidadValida || superaBalance) return;
    setCargando(true);
    try {
      await contribuirContrato(direccion, proyecto.id, mxneAStroops(Number(cantidad)));
      onToast?.(t("detalle.toastContributed", { amount: cantidad }));
      setCantidad("");
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarRetirar() {
    setCargando(true);
    try {
      await retirarPrincipalContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastWithdrawn", { amount: stroopsAMXNe(miAportacion) }));
      setMiAportacion(BigInt(0));
      setMiYield(BigInt(0));
      setVistaRetirar(false);
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarReclamarYield() {
    if (estado !== "Liberado") { onError?.(t("detalle.errYieldOnly")); return; }
    if (miYield === BigInt(0)) { onError?.(t("detalle.errNoYield")); return; }
    setCargando(true);
    try {
      await reclamarYieldContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastYield"));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarAbandonar() {
    setConfirmarAbandonar(false);
    setCargando(true);
    try {
      await abandonarProyectoContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastAbandoned"));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarSolicitarContinuar() {
    setCargando(true);
    try {
      await solicitarContinuarContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastContinued"));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  return (
    <>
      <div className="detail-page">

        {/* Back link */}
        <button className="back-link" onClick={onCerrar}>
          <IconArrowLeft />
          {t("detalle.backToProjects")}
        </button>

        {/* 2-column grid */}
        <div className="detail-grid">

          {/* ── LEFT: Project info ── */}
          <div className="detail-main">

            {/* Header */}
            <div className="detail-header">
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                <span className={`badge ${estadoCfg.clase}`}>
                  <span className="badge-dot" />
                  {t(estadoCfg.labelKey)}
                </span>
              </div>
              <h1>{proyecto.nombre}</h1>
            </div>

            {/* Banners de estado */}
            {esAbandonado && (
              <div className="detail-banner detail-banner--red">
                <IconShield />
                <span>{t("detalle.abandonedBanner")}</span>
              </div>
            )}
            {estado === "Liberado" && (
              <div className="detail-banner detail-banner--amber">
                <IconShield />
                <span>{t("detalle.releasedBanner")}</span>
              </div>
            )}

            {/* Info grid */}
            <div className="detail-section">
              <h3>{t("detalle.projectInfo")}</h3>
              <div className="info-grid">
                <div className="info-cell">
                  <label>{t("detalle.goal")}</label>
                  <span>{stroopsAMXNe(proyecto.meta ?? 0)}</span>
                </div>
                <div className="info-cell">
                  <label>{t("detalle.raised")}</label>
                  <span className="green">{stroopsAMXNe(proyecto.aportado ?? 0)}</span>
                </div>
                <div className="info-cell">
                  <label>{t("detalle.yieldDelivered")}</label>
                  <span>{stroopsAMXNe(proyecto.yield_entregado ?? 0)}</span>
                </div>
                <div className="info-cell">
                  <label>{t("detalle.owner")}</label>
                  <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                    {proyecto.dueno ? `${proyecto.dueno.slice(0, 6)}…${proyecto.dueno.slice(-4)}` : "—"}
                  </span>
                </div>
                {esDueno && BigInt(proyecto.aportado ?? 0) > BigInt(0) && (
                  <div className="info-cell" style={{ gridColumn: "1 / -1" }}>
                    <label>{t("detalle.yieldAvailable")}</label>
                    <span className="green" style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>
                      {stroopsAMXNe(yieldDueno)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Distribución del rendimiento */}
            <div className="detail-section">
              <h3>{t("detalle.yieldSplit")}</h3>
              <div className="split-table">
                <div className="split-row">
                  <span className="split-name" style={{ color: "var(--green)", fontWeight: 600 }}>{t("detalle.splitProject")}</span>
                  <div className="split-bar-wrap" role="progressbar" aria-valuenow={45} aria-valuemin={0} aria-valuemax={100} aria-valuetext="6.00%"><div className="split-bar" style={{ width: "44.6%", background: "var(--green)" }} /></div>
                  <span className="split-pct" style={{ color: "var(--green)" }}>6.00%</span>
                </div>
                <div className="split-row">
                  <span className="split-name" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("detalle.splitInvestor")}</span>
                  <div className="split-bar-wrap" role="progressbar" aria-valuenow={37} aria-valuemin={0} aria-valuemax={100} aria-valuetext="5.00%"><div className="split-bar" style={{ width: "37.2%", background: "var(--navy)" }} /></div>
                  <span className="split-pct" style={{ color: "var(--navy)" }}>5.00%</span>
                </div>
                <div className="split-row" style={{ background: "var(--bg)" }}>
                  <span className="split-name" style={{ color: "var(--muted)" }}>{t("detalle.splitPlatform")}</span>
                  <div className="split-bar-wrap" role="progressbar" aria-valuenow={18} aria-valuemin={0} aria-valuemax={100} aria-valuetext="2.45%"><div className="split-bar" style={{ width: "18.2%", background: "var(--subtle)" }} /></div>
                  <span className="split-pct" style={{ color: "var(--muted)" }}>2.45%</span>
                </div>
                <div style={{ padding: "12px 18px", background: "var(--bg)", borderTop: "2px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("detalle.totalYield")}</span>
                  <strong style={{ color: "var(--text)" }}>13.45% {t("detalle.perYear")}</strong>
                </div>
              </div>
            </div>

            {/* Documentos IPFS */}
            {docs.length > 0 && (
              <div className="detail-section">
                <h3>{t("detalle.verifiedDocs")}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {docs.map((cid, i) => (
                    <div key={cid} className="doc-row">
                      <span style={{ color: "var(--muted)" }}><IconFile /></span>
                      <span style={{ fontSize: "0.85rem", flex: 1 }}>{DOC_LABELS[i] ?? `Documento ${i + 1}`}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>
                        IPFS: {cid.slice(0, 8)}…
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acciones del dueño (izquierda, secundarias) */}
            {esDueno && aceptaFondos && (
              <div className="detail-section">
                {!confirmarAbandonar ? (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                    onClick={() => setConfirmarAbandonar(true)}
                    disabled={cargando}
                  >
                    {t("detalle.abandon")}
                  </button>
                ) : (
                  <div className="confirm-box confirm-box--red">
                    <p style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: 600, marginBottom: 12 }}>
                      {t("detalle.abandonConfirm")}
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmarAbandonar(false)}>
                        {t("detalle.cancel")}
                      </button>
                      <button
                        className="btn"
                        style={{ flex: 1, justifyContent: "center", background: "#DC2626", color: "#fff" }}
                        onClick={manejarAbandonar}
                        disabled={cargando}
                      >
                        {cargando ? t("detalle.processing") : t("detalle.confirmAbandon")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Invest panel ── */}
          <div>
            <div className="invest-panel">
              <div className="invest-panel-head">
                <p>{t("detalle.investIn")}</p>
                <h3>{proyecto.nombre}</h3>
              </div>

              <div className="invest-body">

                {/* Barra de progreso */}
                <div className="progress-section">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--muted)" }}>{t("detalle.raised")}</span>
                    <span>
                      <strong style={{ color: "var(--text)" }}>{stroopsAMXNe(proyecto.aportado ?? 0)}</strong>
                      {" / "}
                      {stroopsAMXNe(proyecto.meta ?? 0)}
                    </span>
                  </div>
                  <div
                    className="progress-section__bar"
                    role="progressbar"
                    aria-valuenow={Math.round(porcentaje)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuetext={`${porcentaje.toFixed(0)}%`}
                  >
                    <div className="progress-section__fill" style={{ width: `${porcentaje}%` }} />
                  </div>
                  <div className="progress-meta">
                    <span>{porcentaje.toFixed(0)}% {t("detalle.completed")}</span>
                  </div>
                </div>

                {/* Mi posición (si ya contribuí) */}
                {miAportacion > BigInt(0) && (
                  <div className="my-position">
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 10 }}>
                      {t("detalle.myPosition")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t("detalle.myCapital")}</div>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--navy)", fontSize: "1rem" }}>
                          {stroopsAMXNe(miAportacion)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t("detalle.myYield")}</div>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--green)", fontSize: "1rem" }}>
                          +{stroopsAMXNe(miYield)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Forma de contribuir */}
                {aceptaFondos && (
                  <>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: 8 }}>
                      {t("detalle.mode")}
                    </div>
                    <div className="mode-selector">
                      <button
                        className={`mode-btn${modoInversion === "inversor" ? " active" : ""}`}
                        onClick={() => setModoInversion("inversor")}
                        aria-pressed={modoInversion === "inversor"}
                      >
                        <h4>{t("detalle.modeInversor")}</h4>
                        <p>{t("detalle.modeInversorDesc")}</p>
                      </button>
                      <button
                        className={`mode-btn${modoInversion === "mecenas" ? " active" : ""}`}
                        onClick={() => setModoInversion("mecenas")}
                        aria-pressed={modoInversion === "mecenas"}
                      >
                        <h4>{t("detalle.modeMecenas")}</h4>
                        <p>{t("detalle.modeMecenasDesc")}</p>
                      </button>
                    </div>

                    <div className="input-group">
                      <label>{t("detalle.contributeLabel")}</label>
                      <div className={`input-wrap${errorCantidad ? " input-wrap--error" : ""}`}>
                        <span className="input-prefix">MXNe</span>
                        <input
                          type="number"
                          value={cantidad}
                          onChange={handleCantidadChange}
                          onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                          placeholder={t("detalle.contributePlaceholder")}
                          min="1"
                          step="1"
                        />
                      </div>
                      {errorCantidad && (
                        <p style={{ fontSize: "0.78rem", color: "var(--error)", marginTop: 6, fontWeight: 600 }}>
                          {errorCantidad}
                        </p>
                      )}
                      {cantidadValida && !superaBalance && balanceMXNe !== null && (
                        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 5 }}>
                          {t("detalle.available")}: {stroopsAMXNe(balanceMXNe)}
                        </p>
                      )}
                    </div>

                    {/* Calculadora */}
                    <div className="calc-result">
                      <div className="calc-row">
                        <span>{t("detalle.calcCapital")}</span>
                        <strong>${fmt(cantidadNum || 0)} MXN</strong>
                      </div>
                      <div className="calc-row">
                        <span>{t("detalle.calcYield", { pct: modoInversion === "inversor" ? "5%" : "0%" })}</span>
                        <strong style={{ color: "var(--navy)" }}>
                          ${fmt(proyeccion.tuYield)} MXN
                        </strong>
                      </div>
                      <div className="calc-row">
                        <span>{t("detalle.calcProject")}</span>
                        <strong style={{ color: "var(--green)" }}>
                          ${fmt(proyeccion.proyectoRecibe)} MXN
                        </strong>
                      </div>
                      <div className="calc-row total" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                        <span>{t("detalle.calcTotal")}</span>
                        <strong>${fmt(proyeccion.totalRetiras)} MXN</strong>
                      </div>
                    </div>

                    <button
                      className="invest-btn"
                      onClick={manejarContribuir}
                      disabled={cargando || !cantidadValida || !!errorCantidad}
                    >
                      {cargando ? t("detalle.processing") : t("detalle.confirmContribute")}
                    </button>
                    <div className="invest-note">
                      {t("detalle.safetyMsg")}
                    </div>
                  </>
                )}

                {/* Capital bloqueado (no se puede retirar aún) */}
                {miAportacion > BigInt(0) && (estado === "EtapaInicial" || estado === "EnProgreso") && (
                  <div className="locked-notice">
                    <IconShield />
                    <span>{t("detalle.locked")}</span>
                  </div>
                )}

                {/* Retirar capital */}
                {miAportacion > BigInt(0) && (estado === "Liberado" || estado === "Abandonado") && (
                  <>
                    {!vistaRetirar ? (
                      <button
                        className="btn btn-amber"
                        style={{ width: "100%", justifyContent: "center", marginTop: aceptaFondos ? 0 : 4 }}
                        onClick={() => setVistaRetirar(true)}
                        disabled={cargando}
                      >
                        {t("detalle.withdraw")}
                      </button>
                    ) : (
                      <div className="withdraw-confirm">
                        <div style={{ textAlign: "center", marginBottom: 14 }}>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 4 }}>{t("detalle.youWillReceive")}</div>
                          <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)" }}>
                            {stroopsAMXNe(miAportacion)}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 4 }}>{t("detalle.exactAmount")}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setVistaRetirar(false)}>
                            {t("detalle.cancel")}
                          </button>
                          <button
                            className="btn btn-amber"
                            style={{ flex: 2, justifyContent: "center" }}
                            onClick={manejarRetirar}
                            disabled={cargando}
                          >
                            {cargando ? t("detalle.processing") : t("detalle.confirmWithdraw")}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Reclamar yield (dueño, solo cuando proyecto liberado) */}
                {esDueno && estado === "Liberado" && BigInt(proyecto.aportado ?? 0) > BigInt(0) && (
                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                    onClick={manejarReclamarYield}
                    disabled={cargando || miYield === BigInt(0)}
                    title={miYield === BigInt(0) ? t("detalle.waitYield") : ""}
                  >
                    {cargando ? t("detalle.processing") : t("detalle.claimYield")}
                  </button>
                )}

                {/* Tomar control (proyecto abandonado, no eres dueño) */}
                {esAbandonado && !esDueno && (
                  <button
                    className="invest-btn"
                    style={{ marginTop: 8 }}
                    onClick={manejarSolicitarContinuar}
                    disabled={cargando}
                  >
                    {cargando ? t("detalle.processing") : t("detalle.takeControl")}
                  </button>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>

    </>
  );
}
