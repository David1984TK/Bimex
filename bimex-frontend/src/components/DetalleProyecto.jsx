import { useState, useEffect, useCallback, useRef } from "react";
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
  EtapaInicial: { label: "Etapa inicial",  clase: "badge-muted",  icono: "🌱" },
  EnProgreso:   { label: "● En progreso",  clase: "badge-teal",   icono: "🚀" },
  Abandonado:   { label: "Abandonado",     clase: "badge-red",    icono: "⚠️" },
  Liberado:     { label: "✓ Liberado",     clase: "badge-amber",  icono: "🏆" },
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
  const yieldCetes = (cetesCap * cetesBps * minutos) / BigInt(10_000);
  const yieldAmm   = (ammCap   * ammBps   * minutos) / BigInt(10_000);
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
  const cetes = (cetesCap * cetesBps * minutos) / BigInt(10_000);
  const amm   = (ammCap   * ammBps   * minutos) / BigInt(10_000);
  return { cetes, amm, total: cetes + amm };
}

export default function DetalleProyecto({ proyecto: proyectoInicial, direccion, onCerrar }) {
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
    const msg = err?.message || "Error inesperado.";
    // Trunca mensajes técnicos largos del contrato
    if (msg.includes("HostError") || msg.includes("XDR") || msg.length > 120) {
      return "Error en el contrato. Intenta de nuevo en unos segundos.";
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
    ? "Ingresa una cantidad mayor a 0"
    : superaBalance
    ? `Saldo insuficiente — tienes ${stroopsAMXNe(balanceMXNe)} disponibles`
    : null;

  async function manejarContribuir() {
    if (!cantidadValida || superaBalance) return;
    setCargando(true);
    try {
      await contribuirContrato(direccion, proyecto.id, mxneAStroops(Number(cantidad)));
      mostrarToast(`✅ Contribuiste $${cantidad} MXNe al proyecto`);
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
      mostrarToast(`✅ Retiraste ${stroopsAMXNe(miAportacion)} a tu wallet`);
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
      mostrarToast("El yield solo se puede reclamar cuando el proyecto está liberado (meta alcanzada).", "error");
      return;
    }
    if (yieldDuenoEstimado === BigInt(0)) {
      mostrarToast("Aún no hay yield acumulado. Espera al menos 1 minuto.", "error");
      return;
    }
    setCargando(true);
    try {
      await reclamarYieldContrato(direccion, proyecto.id);
      mostrarToast("✅ Yield reclamado y enviado a tu wallet");
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
      mostrarToast("Proyecto marcado como abandonado");
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
      mostrarToast("¡Ahora eres el nuevo responsable del proyecto!");
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
                  {estadoCfg.label}
                </span>
              </div>
            </div>
            <button className="btn-close" onClick={onCerrar} aria-label="Cerrar detalle del proyecto">×</button>
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
              <span>Documentos verificados en blockchain</span>
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
                Este proyecto fue abandonado. Puedes tomar el control y continuarlo.
              </span>
            </div>
          )}

          {/* Banner liberado */}
          {estado === "Liberado" && (
            <div style={estilos.bannerLiberado}>
              <span>🏆</span>
              <span style={{ fontSize: "0.82rem" }}>
                ¡Meta alcanzada! Lo que metiste, ya lo puedes sacar.
              </span>
            </div>
          )}

          {/* Barra de progreso */}
          <div style={{ margin: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }} id="progreso-label">
                Progreso de financiamiento
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
          <div style={estilos.statsGrid}>
            <StatBox label="Total bloqueado" valor={stroopsAMXNe(proyecto.aportado ?? 0)} color="var(--text)" />
            <StatBox label="Meta"            valor={stroopsAMXNe(proyecto.meta ?? 0)}     color="var(--muted)" />
            <StatBox label="Yield entregado" valor={stroopsAMXNe(proyecto.yield_entregado ?? 0)} color="var(--amber)" />
          </div>

          {/* Yield detallado del dueño — Capa 1 CETES + Capa 2 AMM */}
          {esDueno && !esAbandonado && BigInt(proyecto.aportado ?? 0) > BigInt(0) && yieldDetallado && (
            <div style={estilos.yieldDuenoBanner}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                💰 Yield disponible para reclamar
              </div>
              <div style={{ fontFamily: "'DM Mono'", fontSize: "1.5rem", color: "var(--amber)", fontWeight: 700, marginBottom: "10px" }}>
                {stroopsAMXNe(yieldDuenoEstimado)}
              </div>
              {/* Desglose por capa */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div style={estilos.yieldCapa}>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🏦 Capa 1 · CETES
                  </div>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: "0.85rem", color: "#059669", fontWeight: 700, marginTop: "2px" }}>
                    +{stroopsAMXNe(yieldDetallado.cetes)}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "var(--muted)" }}>vía Etherfuse</div>
                </div>
                <div style={estilos.yieldCapa}>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🌊 Capa 2 · AMM
                  </div>
                  <div style={{ fontFamily: "'DM Mono'", fontSize: "0.85rem", color: "#7C3AED", fontWeight: 700, marginTop: "2px" }}>
                    +{stroopsAMXNe(yieldDetallado.amm)}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "var(--muted)" }}>vía Stellar AMM</div>
                </div>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>
                Capital: {stroopsAMXNe(proyecto.capital_en_cetes ?? 0)} CETES + {stroopsAMXNe(proyecto.capital_en_amm ?? 0)} AMM
              </div>
            </div>
          )}

          {/* Mi posición (backer) */}
          {miAportacion > BigInt(0) && (
            <div style={estilos.miPosicion}>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                Mi posición
              </p>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Tu lana adentro</div>
                  <div style={{ fontFamily: "'DM Mono'", color: "var(--primary)", fontSize: "1.1rem" }}>
                    {stroopsAMXNe(miAportacion)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Yield acumulado (mi parte)</div>
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
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>

                {/* Contribuir */}
                {aceptaFondos && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: "140px", justifyContent: "center" }}
                    onClick={() => setVista("contribuir")}
                    disabled={cargando}
                  >
                    💰 Contribuir
                  </button>
                )}

                {/* Retirar principal — solo cuando Liberado o Abandonado */}
                {miAportacion > BigInt(0) && (estado === "Liberado" || estado === "Abandonado") && (
                  <button
                    className="btn btn-amber"
                    style={{ flex: 1, minWidth: "140px", justifyContent: "center" }}
                    onClick={() => setVista("retirar")}
                    disabled={cargando}
                  >
                    🔓 Retirar principal
                  </button>
                )}

                {/* Principal bloqueado — aviso mientras está activo */}
                {miAportacion > BigInt(0) && (estado === "EtapaInicial" || estado === "EnProgreso") && (
                  <div style={{ flex: 1, minWidth: "140px", background: "var(--primary-dim)", border: "1.5px solid rgba(124,58,237,0.16)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: "0.78rem", color: "var(--primary)", textAlign: "center", lineHeight: 1.4 }}>
                    🔒 Principal bloqueado<br/>
                    <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>Disponible al liberar el proyecto</span>
                  </div>
                )}

                {/* Reclamar yield — dueño con fondos */}
                {esDueno && !esAbandonado && BigInt(proyecto.aportado ?? 0) > BigInt(0) && (
                  <button
                    className="btn btn-amber"
                    style={{ flex: 1, minWidth: "140px", justifyContent: "center" }}
                    onClick={manejarReclamarYield}
                    disabled={cargando || yieldDuenoEstimado === BigInt(0)}
                    title={yieldDuenoEstimado === BigInt(0) ? "Espera al menos 1 minuto" : ""}
                  >
                    {cargando ? "Procesando…" : "🏦 Reclamar yield"}
                  </button>
                )}

                {/* Solicitar continuar — cualquiera en proyectos abandonados */}
                {esAbandonado && !esDueno && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: "180px", justifyContent: "center" }}
                    onClick={manejarSolicitarContinuar}
                    disabled={cargando}
                  >
                    {cargando ? "Procesando…" : "🤝 Tomar control"}
                  </button>
                )}
              </div>

              {/* Abandonar — botón separado abajo, menos prominente */}
              {esDueno && aceptaFondos && !confirmarAbandonar && (
                <button
                  className="btn btn-ghost"
                  style={{ justifyContent: "center", color: "var(--muted)", fontSize: "0.8rem" }}
                  onClick={() => setConfirmarAbandonar(true)}
                  disabled={cargando}
                >
                  Abandonar proyecto
                </button>
              )}

              {/* Confirmación de abandono */}
              {confirmarAbandonar && (
                <div style={estilos.confirmarAbandonar}>
                  <p style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: 600, marginBottom: "12px" }}>
                    ⚠️ ¿Seguro que quieres abandonar este proyecto? Esta acción permite que cualquiera tome el control.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmarAbandonar(false)}>
                      Cancelar
                    </button>
                    <button
                      className="btn"
                      style={{ flex: 1, justifyContent: "center", background: "#DC2626", color: "#fff" }}
                      onClick={manejarAbandonar}
                      disabled={cargando}
                    >
                      {cargando ? "Procesando…" : "Sí, abandonar"}
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
                <label>Cantidad a aportar (MXNe)</label>
                <input
                  className="input"
                  type="number"
                  value={cantidad}
                  onChange={handleCantidadChange}
                  onKeyDown={(e) => { if (["e","E","+","-"].includes(e.key)) e.preventDefault(); }}
                  placeholder="Ej. 100"
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
                    Disponible: {stroopsAMXNe(balanceMXNe)} MXNe
                  </p>
                )}
              </div>

              <div style={estilos.infoBanner}>
                <span>🛡️</span>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  <strong style={{ color: "var(--text)" }}>${cantidad || "X"} MXNe</strong> entran al contrato,
                  no a nuestras manos. Lo que metes, lo sacas cuando el proyecto termina. El yield es el extra que va al creador.
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button className="btn btn-ghost" onClick={() => setVista("info")} style={{ flex: 1 }}>← Atrás</button>
                <button
                  className="btn btn-primary"
                  onClick={manejarContribuir}
                  disabled={cargando || !cantidadValida || !!errorCantidad}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {cargando ? "Procesando…" : "Confirmar aporte"}
                </button>
              </div>
            </div>
          )}

          {/* ── Vista: Retirar ── */}
          {vista === "retirar" && (
            <div style={{ marginTop: "20px" }}>
              <div style={estilos.retiroCard}>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Recibirás en tu wallet</div>
                <div style={{ fontFamily: "'DM Mono'", fontSize: "1.8rem", color: "var(--primary)", fontWeight: 700 }}>
                  {stroopsAMXNe(miAportacion)}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px" }}>
                  Exacto lo que metiste — ni un peso de menos
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button className="btn btn-ghost" onClick={() => setVista("info")} style={{ flex: 1 }}>← Atrás</button>
                <button
                  className="btn btn-amber"
                  onClick={manejarRetirar}
                  disabled={cargando}
                  style={{ flex: 2, justifyContent: "center" }}
                >
                  {cargando ? "Procesando…" : "Confirmar retiro"}
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
