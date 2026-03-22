import { useState, useEffect, useRef } from "react";
import {
  obtenerTodosLosProyectos,
  aprobarProyecto,
  rechazarProyecto,
  stroopsAMXNe,
} from "../stellar/contrato";

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

function mensajeCorto(err) {
  const msg = err?.message || "Error inesperado.";
  if (msg.includes("HostError") || msg.includes("XDR") || msg.length > 120) {
    return "Error en el contrato. Intenta de nuevo en unos segundos.";
  }
  return msg;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminPanel({ direccion, adminAddress, onCerrar }) {
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
      mostrarToast("No se pudieron cargar los proyectos: " + mensajeCorto(err), "error");
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
      mostrarToast(`✅ Proyecto #${idProyecto} aprobado`);
      await cargarPendientes();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
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
    const estado = rechazando[idProyecto];
    if (!estado) return;

    setRechazando((prev) => ({
      ...prev,
      [idProyecto]: { ...prev[idProyecto], enviando: true },
    }));

    try {
      await rechazarProyecto(direccion, idProyecto, estado.motivo);
      mostrarToast(`❌ Proyecto #${idProyecto} rechazado`);
      cancelarRechazo(idProyecto);
      await cargarPendientes();
    } catch (err) {
      mostrarToast(mensajeCorto(err), "error");
      setRechazando((prev) => ({
        ...prev,
        [idProyecto]: { ...prev[idProyecto], enviando: false },
      }));
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
            style={{ background: "var(--primary)", borderRadius: "var(--radius) var(--radius) 0 0" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={estilos.emojiHeader}>🛡️</span>
              <div>
                <h2
                  id="admin-panel-titulo"
                  style={{ fontSize: "1.15rem", color: "#fff", margin: 0 }}
                >
                  Panel de Administrador
                </h2>
                <span style={estilos.badgePendientes}>
                  {cargando ? "Cargando…" : `${proyectos.length} proyectos pendientes de revisión`}
                </span>
              </div>
            </div>
            <button
              className="btn-close"
              onClick={onCerrar}
              aria-label="Cerrar panel de administrador"
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
                  Cargando proyectos…
                </span>
              </div>
            )}

            {/* Estado vacío */}
            {!cargando && proyectos.length === 0 && (
              <div style={estilos.estadoVacio}>
                <span style={{ fontSize: "2rem" }}>✓</span>
                <p style={{ margin: "8px 0 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--text)" }}>
                  Todo al día ✓
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--muted)" }}>
                  No hay proyectos pendientes de revisión en este momento.
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
                        <span style={estilos.emojiTarjeta}>📋</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.97rem", color: "var(--text)" }}>
                              {proyecto.nombre}
                            </span>
                            <span style={estilos.badgeRevision}>En revisión</span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "4px", fontFamily: "'DM Mono'" }}>
                            Meta: <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                              {stroopsAMXNe(proyecto.meta ?? 0)}
                            </span>
                          </div>
                        </div>
                        <span style={estilos.idBadge}>#{proyecto.id}</span>
                      </div>

                      {/* Meta info */}
                      <div style={estilos.metaGrid}>
                        <div>
                          <div style={estilos.metaLabel}>Dueño</div>
                          <code style={estilos.metaValor}>
                            {acortarDireccion(proyecto.dueno)}
                          </code>
                        </div>
                        {fingerprint && (
                          <div>
                            <div style={estilos.metaLabel}>Huella documental</div>
                            <div style={estilos.fingerprintBadge}>
                              <span>🔒</span>
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
                            Motivo del rechazo
                          </label>
                          <textarea
                            id={`motivo-${proyecto.id}`}
                            className="input"
                            rows={3}
                            style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: "0.85rem", boxSizing: "border-box" }}
                            placeholder="Describe el motivo para que el creador pueda corregirlo…"
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
                              Cancelar
                            </button>
                            <button
                              className="btn"
                              style={{ flex: 2, justifyContent: "center", background: "#DC2626", color: "#fff" }}
                              onClick={() => confirmarRechazo(proyecto.id)}
                              disabled={estadoRechazo.enviando || !estadoRechazo.motivo.trim()}
                            >
                              {estadoRechazo.enviando ? "Procesando…" : "Confirmar rechazo"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Botones de acción */
                        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, minWidth: "120px", justifyContent: "center" }}
                            onClick={() => manejarAprobar(proyecto.id)}
                          >
                            ✅ Aprobar
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ flex: 1, minWidth: "120px", justifyContent: "center", color: "#DC2626", borderColor: "rgba(220,38,38,0.30)" }}
                            onClick={() => abrirRechazo(proyecto.id)}
                          >
                            ❌ Rechazar
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
  emojiHeader: {
    fontSize: "1.6rem",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "10px",
    padding: "6px 9px",
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
    border: "3px solid var(--border-soft)",
    borderTopColor: "var(--primary)",
    animation: "spin 0.7s linear infinite",
  },
  estadoVacio: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    background: "rgba(5,150,105,0.04)",
    border: "1.5px solid rgba(5,150,105,0.14)",
    borderRadius: "var(--radius-sm)",
    textAlign: "center",
    color: "#059669",
  },
  tarjeta: {
    background: "var(--bg)",
    border: "1.5px solid var(--border-soft)",
    borderRadius: "var(--radius-sm)",
    padding: "16px 18px",
  },
  emojiTarjeta: {
    fontSize: "1.5rem",
    background: "var(--primary-dim)",
    borderRadius: "8px",
    padding: "6px 8px",
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
    background: "var(--border-soft)",
    borderRadius: "4px",
    padding: "2px 6px",
    flexShrink: 0,
  },
  metaGrid: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    padding: "10px 12px",
    background: "rgba(124,58,237,0.04)",
    border: "1px solid rgba(124,58,237,0.10)",
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
    background: "rgba(5,150,105,0.07)",
    border: "1px solid rgba(5,150,105,0.18)",
    borderRadius: "4px",
    padding: "3px 8px",
    fontSize: "0.72rem",
    color: "#059669",
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
