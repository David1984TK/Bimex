import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  obtenerTodosLosProyectos,
  aprobarProyecto,
  rechazarProyecto,
  stroopsAMXNe,
} from "../stellar/contrato";
import { parsearError } from "../utils/errores.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function acortarDireccion(dir) {
  if (!dir || dir.length < 10) return dir;
  return `${dir.slice(0, 6)}…${dir.slice(-4)}`;
}

function docHashHex(docHash) {
  if (!docHash) return null;
  const bytes =
    docHash instanceof Uint8Array
      ? docHash
      : new Uint8Array(Object.values(docHash));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16) + "…";
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

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

const IconCheckCircle = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminPanel({ direccion, adminAddress, onCerrar }) {
  const { t } = useTranslation();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [toast, setToast] = useState(null);
  // rechazando: { [idProyecto]: { motivo: string, enviando: boolean } }
  const [rechazando, setRechazando] = useState({});

  const modalRef = useRef(null);
  const botonAbrioRef = useRef(document.activeElement);

  // Carga proyectos en revisión
  async function cargarPendientes() {
    setCargando(true);
    try {
      const todos = await obtenerTodosLosProyectos();
      setProyectos(todos.filter((p) => p.estado === "EnRevision"));
    } catch (err) {
      mostrarToast(parsearError(err), "error");
    }
    setCargando(false);
  }

  useEffect(() => {
    cargarPendientes();
  }, []);

  // Focus trap + Escape
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    modal.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = modal.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === primero) {
          e.preventDefault();
          ultimo?.focus();
        }
      } else {
        if (document.activeElement === ultimo) {
          e.preventDefault();
          primero?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      botonAbrioRef.current?.focus?.();
    };
  }, [onCerrar]);

  function mostrarToast(msg, tipo = "success") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4500);
  }

  // ── Aprobar ──────────────────────────────────────────────────────────────────

  async function manejarAprobar(idProyecto) {
    try {
      await aprobarProyecto(direccion, idProyecto);
      mostrarToast(t("admin.toastApproved", { id: idProyecto }));
      await cargarPendientes();
    } catch (err) {
      mostrarToast(parsearError(err), "error");
    }
  }

  // ── Rechazo: abrir formulario inline ─────────────────────────────────────────

  function abrirRechazo(idProyecto) {
    setRechazando((prev) => ({
      ...prev,
      [idProyecto]: { motivo: "", enviando: false },
    }));
  }

  function cancelarRechazo(idProyecto) {
    setRechazando((prev) => {
      const copia = { ...prev };
      delete copia[idProyecto];
      return copia;
    });
  }

  function actualizarMotivo(idProyecto, valor) {
    setRechazando((prev) => ({
      ...prev,
      [idProyecto]: { ...prev[idProyecto], motivo: valor },
    }));
  }

  async function confirmarRechazo(idProyecto) {
    const estadoActual = rechazando[idProyecto];
    if (!estadoActual || !estadoActual.motivo.trim()) return;

    const motivo = estadoActual.motivo;
    setRechazando((prev) => ({ ...prev, [idProyecto]: { ...prev[idProyecto], enviando: true } }));

    try {
      await rechazarProyecto(direccion, idProyecto, motivo);
      mostrarToast(t("admin.toastRejected", { id: idProyecto }));
      cancelarRechazo(idProyecto);
      await cargarPendientes();
    } catch (err) {
      mostrarToast(parsearError(err), "error");
      setRechazando((prev) => ({ ...prev, [idProyecto]: { ...prev[idProyecto], enviando: false } }));
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

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
          aria-labelledby="admin-panel-titulo"
          style={{ maxWidth: "700px", width: "100%" }}
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          tabIndex={-1}
        >
          {/* Header */}
          <div
            className="modal-header"
            style={{ background: "var(--navy)", borderRadius: "var(--radius) var(--radius) 0 0" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={estilos.iconHeader}><IconShield /></span>
              <div>
                <h2
                  id="admin-panel-titulo"
                  style={{ fontSize: "1.15rem", color: "#fff", margin: 0 }}
                >
                  {t("admin.title")}
                </h2>
                <span style={estilos.badgePendientes}>
                  {cargando ? t("admin.loading") : t("admin.pending", { count: proyectos.length })}
                </span>
              </div>
            </div>
            <button
              className="btn-close"
              onClick={onCerrar}
              aria-label={t("admin.closeAria")}
              style={{ color: "#fff", opacity: 0.8 }}
            >
              ×
            </button>
          </div>

          {/* Cuerpo */}
          <div style={{ padding: "20px 0 4px" }}>

            {/* Estado de carga */}
            {cargando && (
              <div style={estilos.centrado}>
                <span style={estilos.spinner} aria-label="Cargando proyectos" />
                <span style={{ color: "var(--muted)", fontSize: "0.88rem", marginLeft: "10px" }}>
                  {t("admin.loading")}
                </span>
              </div>
            )}

            {/* Estado vacío */}
            {!cargando && proyectos.length === 0 && (
              <div style={estilos.estadoVacio}>
                <span style={{ color: "var(--green)" }}><IconCheckCircle /></span>
                <p style={{ margin: "8px 0 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                  {t("admin.allClear")}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                  {t("admin.allClearHint")}
                </p>
              </div>
            )}

            {/* Lista de tarjetas */}
            {!cargando && proyectos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {proyectos.map((proyecto) => {
                  const estadoRechazo = rechazando[proyecto.id];
                  const fingerprint = docHashHex(proyecto.doc_hash);

                  return (
                    <div key={proyecto.id} style={estilos.tarjeta}>
                      {/* Cabecera de tarjeta */}
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
                            Meta: <span style={{ color: "var(--navy)", fontWeight: 600 }}>
                              {stroopsAMXNe(proyecto.meta ?? 0)}
                            </span>
                          </div>
                        </div>
                        <span style={estilos.idBadge}>#{proyecto.id}</span>
                      </div>

                      {/* Meta info */}
                      <div className="admin-meta-grid" style={estilos.metaGrid}>
                        <div>
                          <div style={estilos.metaLabel}>{t("admin.owner")}</div>
                          <code style={estilos.metaValor}>
                            {acortarDireccion(proyecto.dueno)}
                          </code>
                        </div>
                        {fingerprint && (
                          <div>
                            <div style={estilos.metaLabel}>{t("admin.docHash")}</div>
                            <div style={estilos.fingerprintBadge}>
                              <IconLock />
                              <code style={{ fontFamily: "'DM Mono'", fontSize: "0.72rem" }}>
                                {fingerprint}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Formulario de rechazo inline */}
                      {estadoRechazo ? (
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
                            value={estadoRechazo.motivo}
                            onChange={(e) => actualizarMotivo(proyecto.id, e.target.value)}
                            autoFocus
                            disabled={estadoRechazo.enviando}
                          />
                          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                            <button
                              className="btn btn-ghost"
                              style={{ flex: 1, justifyContent: "center" }}
                              onClick={() => cancelarRechazo(proyecto.id)}
                              disabled={estadoRechazo.enviando}
                            >
                              {t("admin.cancel")}
                            </button>
                            <button
                              className="btn"
                              style={{ flex: 2, justifyContent: "center", background: "#DC2626", color: "#fff" }}
                              onClick={() => confirmarRechazo(proyecto.id)}
                              disabled={estadoRechazo.enviando || !estadoRechazo.motivo.trim()}
                            >
                              {estadoRechazo.enviando ? t("admin.processing") : t("admin.confirmReject")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Botones de acción */
                        <div className="admin-acciones" style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, minWidth: "120px", justifyContent: "center" }}
                            onClick={() => manejarAprobar(proyecto.id)}
                          >
                            {t("admin.approve")}
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ flex: 1, minWidth: "120px", justifyContent: "center", color: "#DC2626", borderColor: "rgba(220,38,38,0.30)" }}
                            onClick={() => abrirRechazo(proyecto.id)}
                          >
                            {t("admin.reject")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = {
  iconHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "10px",
    padding: "7px 9px",
    color: "#fff",
    lineHeight: 1,
  },
  badgePendientes: {
    display: "inline-block",
    marginTop: "4px",
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 500,
  },
  centrado: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  spinner: {
    display: "inline-block",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "3px solid var(--border)",
    borderTopColor: "var(--navy)",
    animation: "spin 0.7s linear infinite",
  },
  estadoVacio: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    background: "var(--green-dim)",
    border: "1.5px solid rgba(22,163,74,0.20)",
    borderRadius: "var(--radius-sm)",
    textAlign: "center",
    color: "var(--green)",
  },
  tarjeta: {
    background: "var(--bg)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px 18px",
  },
  iconTarjeta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--navy-dim)",
    color: "var(--navy)",
    borderRadius: "8px",
    padding: "7px 8px",
    lineHeight: 1,
    flexShrink: 0,
  },
  badgeRevision: {
    display: "inline-block",
    background: "rgba(217,119,6,0.10)",
    color: "#B45309",
    border: "1px solid rgba(217,119,6,0.25)",
    borderRadius: "4px",
    padding: "1px 7px",
    fontSize: "0.70rem",
    fontWeight: 700,
    letterSpacing: "0.03em",
  },
  idBadge: {
    fontSize: "0.72rem",
    color: "var(--muted)",
    fontFamily: "'DM Mono'",
    background: "var(--border)",
    borderRadius: "4px",
    padding: "2px 6px",
    flexShrink: 0,
  },
  metaGrid: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    padding: "10px 12px",
    background: "var(--navy-dim)",
    border: "1px solid rgba(30,58,95,0.12)",
    borderRadius: "var(--radius-sm)",
  },
  metaLabel: {
    fontSize: "0.68rem",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 700,
    marginBottom: "3px",
  },
  metaValor: {
    fontFamily: "'DM Mono'",
    fontSize: "0.80rem",
    color: "var(--text)",
  },
  fingerprintBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "var(--green-dim)",
    border: "1px solid rgba(22,163,74,0.22)",
    borderRadius: "4px",
    padding: "3px 8px",
    fontSize: "0.72rem",
    color: "var(--green)",
    fontWeight: 600,
  },
  rechazoForm: {
    marginTop: "14px",
    background: "rgba(220,38,38,0.04)",
    border: "1.5px solid rgba(220,38,38,0.18)",
    borderRadius: "var(--radius-sm)",
    padding: "14px",
  },
};
