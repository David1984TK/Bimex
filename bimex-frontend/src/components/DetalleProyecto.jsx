import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  contribuir as contribuirContrato,
  retirarPrincipal as retirarPrincipalContrato,
  reclamarYield as reclamarYieldContrato,
  abandonarProyecto as abandonarProyectoContrato,
  solicitarContinuar as solicitarContinuarContrato,
  obtenerAportacion,
  calcularYield,
  calcularYieldDetallado,
  obtenerProyecto,
  obtenerBalanceMXNe,
  mxneAStroops,
  stroopsAMXNe,
  CONFIG,
} from "../stellar/contrato";

// ─── Config de estados ────────────────────────────────────────────────────────
const ESTADO_CONFIG = {
  EtapaInicial: { labelKey: "status.EtapaInicial", clase: "badge-muted",  icono: "🌱" },
  EnProgreso:   { labelKey: "status.EnProgreso",   clase: "badge-teal",   icono: "🚀" },
  Abandonado:   { labelKey: "status.Abandonado",   clase: "badge-red",    icono: "⚠️" },
  Liberado:     { labelKey: "status.Liberado",     clase: "badge-amber",  icono: "🏆" },
};

// Calcula el yield estimado del dueño usando dual-yield (CETES + AMM)
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

// Calcula el desglose de yield
function estimarYieldDetallado(proyecto) {
  if (!proyecto?.timestamp_inicio || !proyecto?.aportado) {
    return { cetes: BigInt(0), amm: BigInt(0), total: BigInt(0) };
  }
  const ahora = Math.floor(Date.now() / 1000);
  const segundos = Math.max(0, ahora - proyecto.timestamp_inicio);
  const minutos = BigInt(Math.floor(segundos / 60));
  const cetesCap = BigInt(proyecto.capital_en_cetes ?? 0);
  const ammCap   = BigInt(proyecto.capital_en_amm   ?? 0);
  const cetesBps = BigInt(CONFIG.YIELD_CETES_BPS);
  const ammBps   = BigInt(CONFIG.YIELD_AMM_BPS);
  const MINUTOS_ANO = BigInt(525_600);
  const cetes = (cetesCap * cetesBps * minutos) / BigInt(10_000) / MINUTOS_ANO;
  const amm   = (ammCap   * ammBps   * minutos) / BigInt(10_000) / MINUTOS_ANO;
  return { cetes, amm, total: cetes + amm };
}

export default function DetalleProyecto({ proyecto: proyectoInicial, direccion, onCerrar }) {
  const { t } = useTranslation();
  const [proyecto, setProyecto] = useState(proyectoInicial);
  const [cantidad, setCantidad] = useState("");
  const [cargando, setCargando] = useState(false);
  const [vista, setVista] = useState("info");
  const [toast, setToast] = useState(null);
  const [miAportacion, setMiAportacion] = useState(BigInt(0));
  const [miYield, setMiYield] = useState(BigInt(0));
  const [confirmarAbandonar, setConfirmarAbandonar] = useState(false);
  const [balanceMXNe, setBalanceMXNe] = useState(BigInt(0));
  const modalRef = useRef(null);
  const botonAbrioRef = useRef(document.activeElement);

  const estado = proyecto.estado ?? "EtapaInicial";
  const estadoCfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.EtapaInicial;
  const esDueno = direccion === proyecto.dueno;
  const esAbandonado = estado === "Abandonado";
  const aceptaFondos = estado === "EtapaInicial" || estado === "EnProgreso";

  const aportado = Number(proyecto.aportado ?? 0);
  const meta = Number(proyecto.meta ?? 0);
  const porcentaje = meta > 0 ? Math.min((aportado / meta) * 100, 100) : 0;

  const yieldDuenoEstimado = esDueno ? estimarYieldDueno(proyecto) : BigInt(0);
  const yieldDetallado = esDueno ? estimarYieldDetallado(proyecto) : null;

  // Carga datos del usuario y refresca el proyecto desde la red
  const refrescar = useCallback(async () => {
    if (!direccion || proyecto.id == null) return;
    try {
      const [proyActualizado, aport, yld, bal] = await Promise.all([
        obtenerProyecto(proyecto.id).catch(() => null),
        obtenerAportacion(proyecto.id, direccion).catch(() => BigInt(0)),
        calcularYield(proyecto.id, direccion).catch(() => BigInt(0)),
        obtenerBalanceMXNe(direccion).catch(() => BigInt(0)),
      ]);
      if (proyActualizado) setProyecto(proyActualizado);
      setMiAportacion(aport);
      setMiYield(yld);
      setBalanceMXNe(bal);
    } catch { /* ignore */ }
  }, [proyecto.id, direccion]);

  useEffect(() => { refrescar(); }, [refrescar]);

  // Focus trap + Escape para cerrar
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Mueve el foco al modal al abrir
    modal.focus();

    // Cierra con Escape
    function onKeyDown(e) {
      if (e.key === "Escape") { onCerrar(); return; }
      if (e.key !== "Tab") return;

      // Trap: mantén el foco dentro del modal
      const focusables = modal.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const primero = focusables[0];
      const ultimo  = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      } else {
        if (document.activeElement === ultimo)  { e.preventDefault(); primero.focus(); }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Devuelve el foco al elemento que abrió el modal
      botonAbrioRef.current?.focus?.();
    };
  }, [onCerrar]);

  function mostrarToast(msg, tipo = "success") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4500);
  }

  function mensajeCorto(err) {
    const msg = err?.message || t("detalle.errContract");
    if (msg.includes("HostError") || msg.includes("XDR") || msg.length > 120) {
      return t("detalle.errContract");
    }
    return msg;
  }

  // Bug 1 & 2: normaliza el valor del input — bloquea negativos y notación científica
  function handleCantidadChange(e) {
    const raw = e.target.value;
    // Rechaza notación científica (e/E) y signos
    if (/[eE+\-]/.test(raw)) return;
    setCantidad(raw);
  }

  const cantidadNum = Number(cantidad);
  const cantidadValida = cantidad !== "" && !isNaN(cantidadNum) && cantidadNum > 0;
  const superaBalance = cantidadValida && mxneAStroops(cantidadNum) > balanceMXNe;
  const errorCantidad = !cantidadValida && cantidad !== ""
    ? t("detalle.errAmount")
    : superaBalance
    ? t("detalle.errBalance", { balance: stroopsAMXNe(balanceMXNe) })
    : null;

  async function manejarContribuir() {
    if (!cantidadValida || superaBalance) return;
    setCargando(true);
    try {
      await contribuirContrato(direccion, proyecto.id, mxneAStroops(Number(cantidad)));
      mostrarToast(t("detalle.toastContributed", { amount: cantidad }));
      setCantidad("");
      setVista("info");
      await refrescar();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
    }
    setCargando(false);
  }

  async function manejarRetirar() {
    setCargando(true);
    try {
      await retirarPrincipalContrato(direccion, proyecto.id);
      mostrarToast(t("detalle.toastWithdrawn", { amount: stroopsAMXNe(miAportacion) }));
      setMiAportacion(BigInt(0));
      setMiYield(BigInt(0));
      setVista("info");
      await refrescar();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
    }
    setCargando(false);
  }

  async function manejarReclamarYield() {
    if (estado !== "Liberado") {
      mostrarToast(t("detalle.errYieldOnly"), "error");
      return;
    }
    if (yieldDuenoEstimado === BigInt(0)) {
      mostrarToast(t("detalle.errNoYield"), "error");
      return;
    }
    setCargando(true);
    try {
      await reclamarYieldContrato(direccion, proyecto.id);
      mostrarToast(t("detalle.toastYield"));
      setVista("info");
      await refrescar();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
    }
    setCargando(false);
  }

  async function manejarAbandonar() {
    setConfirmarAbandonar(false);
    setCargando(true);
    try {
      await abandonarProyectoContrato(direccion, proyecto.id);
      mostrarToast(t("detalle.toastAbandoned"));
      await refrescar();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
    }
    setCargando(false);
  }

  async function manejarSolicitarContinuar() {
    setCargando(true);
    try {
      await solicitarContinuarContrato(direccion, proyecto.id);
      mostrarToast(t("detalle.toastContinued"));
      await refrescar();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
    }
    setCargando(false);
  }

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onCerrar}
        role="presentation"
        aria-hidden="false"
      >
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-titulo"
          style={{ maxWidth: "520px" }}
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          tabIndex={-1}
        >

          {/* Header */}
          <div className="modal-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={estilos.emoji}>{estadoCfg.icono}</span>
              <div>
                <h2 id="modal-titulo" style={{ fontSize: "1.15rem" }}>{proyecto.nombre}</h2>
                <span className={`badge ${estadoCfg.clase}`} style={{ marginTop: "4px" }}>
                  {t(estadoCfg.labelKey)}
                </span>
              </div>
            </div>
            <button className="btn-close" onClick={onCerrar} aria-label={t("detalle.closeAria")}>×</button>
          </div>

          {/* Badge de verificación documental */}
          {proyecto.doc_hash && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(5,150,105,0.07)",
              border: "1px solid rgba(5,150,105,0.20)",
              borderRadius: "var(--radius-sm)",
              padding: "7px 12px",
              marginTop: "10px",
              fontSize: "0.76rem",
              color: "#059669",
              fontWeight: 600,
            }}>
              <span>🔒</span>
              <span>{t("detalle.docsVerified")}</span>
              <code style={{ fontFamily: "'DM Mono'", fontSize: "0.67rem", opacity: 0.75, marginLeft: "4px" }}>
                {Array.from(proyecto.doc_hash).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8)}…
              </code>
            </div>
          )}

          {/* Banner abandonado */}
          {esAbandonado && (
            <div style={estilos.bannerAbandonado}>
              <span>⚠️</span>
              <span style={{ fontSize: "0.82rem" }}>
                {t("detalle.abandonedBanner")}
              </span>
            </div>
          )}

          {/* Banner liberado */}
          {estado === "Liberado" && (
            <div style={estilos.bannerLiberado}>
              <span>🏆</span>
              <span style={{ fontSize: "0.82rem" }}>
                {t("detalle.releasedBanner")}
              </span>
            </div>
          )}

          {/* Barra de progreso */}
          <div style={{ margin: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }} id="progreso-label">
                {t("detalle.progressLabel")}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontFamily: "'DM Mono'", fontWeight: 700 }}
                    aria-hidden="true">
                {porcentaje.toFixed(0)}%
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={Math.round(porcentaje)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-labelledby="progreso-label"
              aria-valuetext={`${porcentaje.toFixed(0)}% del objetivo alcanzado`}
            >
              <div className="progress-fill" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>

          {/* Stats */}
          <div className="detalle-stats-grid" style={estilos.statsGrid}>
            <StatBox label="Total bloqueado" valor={stroopsAMXNe(proyecto.aportado ?? 0)} color="var(--text)" />
            <StatBox label="Meta"            valor={stroopsAMXNe(proyecto.meta ?? 0)}     color="var(--muted)" />
            <StatBox label="Yield entregado" valor={stroopsAMXNe(proyecto.yield_entregado ?? 0)} color="var(--amber)" />
          </div>

          {/* Yield detallado del dueño — Capa 1 CETES + Capa 2 AMM */}
          {esDueno && !esAbandonado && BigInt(proyecto.aportado ?? 0) > BigInt(0) && yieldDetallado && (
            <div style={estilos.yieldDuenoBanner}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                {t("detalle.yieldAvailable")}
              </div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: "1.5rem", color: "var(--amber)", fontWeight: 700, marginBottom: "10px" }}>
                {stroopsAMXNe(yieldDuenoEstimado)}
              </div>
              {/* Desglose por capa */}
              <div className="detalle-yield-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div style={estilos.yieldCapa}>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("detalle.layer1")}
                  </div>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: "0.85rem", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
                    +{stroopsAMXNe(yieldDetallado.cetes)}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "var(--muted)" }}>{t("detalle.layer1Via")}</div>
                </div>
                <div style={estilos.yieldCapa}>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("detalle.layer2")}
                  </div>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: "0.85rem", color: "#7C3AED", fontWeight: 700, marginTop: "2px" }}>
                    +{stroopsAMXNe(yieldDetallado.amm)}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "var(--muted)" }}>{t("detalle.layer2Via")}</div>
                </div>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
                {t("detalle.capital")}: {stroopsAMXNe(proyecto.capital_en_cetes ?? 0)} CETES + {stroopsAMXNe(proyecto.capital_en_amm ?? 0)} AMM
              </div>
            </div>
          )}

          {/* Mi posición (backer) */}
          {miAportacion > BigInt(0) && (
            <div style={estilos.miPosicion}>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                {t("detalle.myPosition")}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{t("detalle.myCapital")}</div>
                  <div style={{ fontFamily: "'DM Mono'", color: "var(--primary)", fontSize: "1.1rem" }}>
                    {stroopsAMXNe(miAportacion)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{t("detalle.myYield")}</div>
                  <div style={{ fontFamily: "'DM Mono'", color: "var(--amber)", fontSize: "1.1rem" }}>
                    +{stroopsAMXNe(miYield)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Botones principales (vista info) ── */}
          {vista === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>

              {/* Fila principal de acciones */}
              <div className="detalle-acciones" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>

                {/* Contribuir */}
                {aceptaFondos && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: "140px", justifyContent: "center" }}
                    onClick={() => setVista("contribuir")}
                    disabled={cargando}
                  >
                    {t("detalle.contribute")}
                  </button>
                )}

                {miAportacion > BigInt(0) && (estado === "Liberado" || estado === "Abandonado") && (
                  <button
                    className="btn btn-amber"
                    style={{ flex: 1, minWidth: "140px", justifyContent: "center" }}
                    onClick={() => setVista("retirar")}
                    disabled={cargando}
                  >
                    {t("detalle.withdraw")}
                  </button>
                )}

                {miAportacion > BigInt(0) && (estado === "EtapaInicial" || estado === "EnProgreso") && (
                  <div style={{ flex: 1, minWidth: "140px", background: "var(--primary-dim)", border: "1.5px solid rgba(124,58,237,0.16)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.78rem", color: "var(--primary)", textAlign: "center", lineHeight: 1.4 }}>
                    {t("detalle.locked")}<br/>
                    <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{t("detalle.lockedHint")}</span>
                  </div>
                )}

                {esDueno && !esAbandonado && BigInt(proyecto.aportado ?? 0) > BigInt(0) && (
                  <button
                    className="btn btn-amber"
                    style={{ flex: 1, minWidth: "140px", justifyContent: "center" }}
                    onClick={manejarReclamarYield}
                    disabled={cargando || yieldDuenoEstimado === BigInt(0)}
                    title={yieldDuenoEstimado === BigInt(0) ? t("detalle.waitYield") : ""}
                  >
                    {cargando ? t("detalle.processing") : t("detalle.claimYield")}
                  </button>
                )}

                {esAbandonado && !esDueno && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: "180px", justifyContent: "center" }}
                    onClick={manejarSolicitarContinuar}
                    disabled={cargando}
                  >
                    {cargando ? t("detalle.processing") : t("detalle.takeControl")}
                  </button>
                )}
              </div>

              {esDueno && aceptaFondos && !confirmarAbandonar && (
                <button
                  className="btn btn-ghost"
                  style={{ justifyContent: "center", color: "var(--muted)", fontSize: "0.8rem" }}
                  onClick={() => setConfirmarAbandonar(true)}
                  disabled={cargando}
                >
                  {t("detalle.abandon")}
                </button>
              )}

              {confirmarAbandonar && (
                <div style={estilos.confirmarAbandonar}>
                  <p style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: 600, marginBottom: "12px" }}>
                    {t("detalle.abandonConfirm")}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
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

          {/* ── Vista: Contribuir ── */}
          {vista === "contribuir" && (
            <div style={{ marginTop: "20px" }}>
              <div className="campo">
                <label>{t("detalle.contributeLabel")}</label>
                <input
                  className="input"
                  type="number"
                  value={cantidad}
                  onChange={handleCantidadChange}
                  onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                  placeholder={t("detalle.contributePlaceholder")}
                  min="1"
                  step="1"
                  autoFocus
                  style={{ borderColor: errorCantidad ? "var(--error)" : undefined }}
                />
                {errorCantidad && (
                  <p style={{ fontSize: "0.78rem", color: "var(--error)", marginTop: "6px", fontWeight: 600 }}>
                    ⚠ {errorCantidad}
                  </p>
                )}
                {cantidadValida && !superaBalance && (
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "6px" }}>
                    {t("detalle.available")}: {stroopsAMXNe(balanceMXNe)} MXNe
                  </p>
                )}
              </div>

              <div style={estilos.infoBanner}>
                <span>🛡️</span>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  <strong style={{ color: "var(--text)" }}>${cantidad || "X"} MXNe</strong> {t("detalle.safetyMsg")}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button className="btn btn-ghost" onClick={() => setVista("info")} style={{ flex: 1 }}>{t("detalle.back")}</button>
                <button
                  className="btn btn-primary"
                  onClick={manejarContribuir}
                  disabled={cargando || !cantidadValida || !!errorCantidad}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {cargando ? t("detalle.processing") : t("detalle.confirmContribute")}
                </button>
              </div>
            </div>
          )}

          {/* ── Vista: Retirar ── */}
          {vista === "retirar" && (
            <div style={{ marginTop: "20px" }}>
              <div style={estilos.retiroCard}>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>{t("detalle.youWillReceive")}</div>
                <div style={{ fontFamily: "'DM Mono'", fontSize: "1.8rem", color: "var(--primary)", fontWeight: 700 }}>
                  {stroopsAMXNe(miAportacion)}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px" }}>
                  {t("detalle.exactAmount")}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button className="btn btn-ghost" onClick={() => setVista("info")} style={{ flex: 1 }}>{t("detalle.back")}</button>
                <button
                  className="btn btn-amber"
                  onClick={manejarRetirar}
                  disabled={cargando}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {cargando ? t("detalle.processing") : t("detalle.confirmWithdraw")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div
          className={`toast ${toast.tipo}`}
          role={toast.tipo === "error" ? "alert" : "status"}
          aria-live={toast.tipo === "error" ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}

function StatBox({ label, valor, color }) {
  return (
    <div style={estilos.statBox}>
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'DM Mono'", fontSize: "1rem", color, marginTop: "4px" }}>
        {valor}
      </div>
    </div>
  );
}

const estilos = {
  emoji: {
    fontSize: "2rem",
    background: "var(--primary-dim)",
    borderRadius: "10px",
    padding: "8px 10px",
    lineHeight: 1,
  },
  bannerAbandonado: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    background: "rgba(220,38,38,0.05)",
    border: "1px solid rgba(220,38,38,0.18)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    marginTop: "12px",
    color: "#B91C1C",
    fontSize: "0.82rem",
  },
  bannerLiberado: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    background: "rgba(217,119,6,0.06)",
    border: "1px solid rgba(217,119,6,0.22)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    marginTop: "12px",
    color: "#B45309",
    fontSize: "0.82rem",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },
  statBox: {
    background: "var(--bg)",
    border: "1.5px solid var(--border-soft)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
    textAlign: "center",
  },
  yieldDuenoBanner: {
    background: "rgba(217,119,6,0.06)",
    border: "1.5px solid rgba(217,119,6,0.20)",
    borderRadius: "var(--radius-sm)",
    padding: "14px 16px",
    marginTop: "14px",
    textAlign: "center",
  },
  yieldCapa: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 10px",
    textAlign: "center",
  },
  miPosicion: {
    background: "var(--primary-dim)",
    border: "1.5px solid rgba(124,58,237,0.16)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    marginTop: "16px",
  },
  infoBanner: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    background: "var(--bg)",
    border: "1.5px solid var(--border-soft)",
    borderRadius: "var(--radius-sm)",
    padding: "12px",
  },
  retiroCard: {
    background: "var(--primary-dim)",
    border: "1.5px solid rgba(124,58,237,0.18)",
    borderRadius: "var(--radius)",
    padding: "24px",
    textAlign: "center",
  },
  confirmarAbandonar: {
    background: "rgba(220,38,38,0.04)",
    border: "1.5px solid rgba(220,38,38,0.20)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
  },
};
