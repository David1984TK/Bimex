import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { crearThrottle } from "../utils/throttle.js";
import {
  obtenerTodosLosProyectos,
  aprobarProyecto,
  rechazarProyecto,
} from "../stellar/contrato";
import { parsearError } from "../utils/errores.js";
import TarjetaProyecto from "./TarjetaProyecto";

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
  const [proyectos,  setProyectos]  = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [toast,      setToast]      = useState(null);
  const throttleAdmin = useRef(crearThrottle(3000)).current;
  const modalRef      = useRef(null);
  const botonAbrioRef = useRef(null);

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

  useEffect(() => { cargarPendientes(); }, []);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    // Capture the element that opened the panel at the moment the panel becomes active
    botonAbrioRef.current = document.activeElement;
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

  function mostrarToast(msg, tipo = "success") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4500);
  }

  async function manejarAprobar(idProyecto) {
    try {
      await throttleAdmin.ejecutar(async () => {
        await aprobarProyecto(direccion, idProyecto);
        mostrarToast(t("admin.toastApproved", { id: idProyecto }));
        await cargarPendientes();
      });
    } catch (err) {
      if (String(err?.message ?? "").toLowerCase().includes("espera")) {
        mostrarToast(err.message, "info");
      } else {
        mostrarToast(parsearError(err), "error");
      }
    }
  }

  async function manejarRechazar(idProyecto, motivo) {
    try {
      await throttleAdmin.ejecutar(async () => {
        await rechazarProyecto(direccion, idProyecto, motivo);
        mostrarToast(t("admin.toastRejected", { id: idProyecto }));
        await cargarPendientes();
      });
    } catch (err) {
      if (String(err?.message ?? "").toLowerCase().includes("espera")) {
        mostrarToast(err.message, "info");
      } else {
        mostrarToast(parsearError(err), "error");
        throw err;
      }
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onCerrar} role="presentation" aria-hidden="false">
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
          <div className="modal-header" style={{ background: "var(--navy)", borderRadius: "var(--radius) var(--radius) 0 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={estilos.iconHeader}><IconShield /></span>
              <div>
                <h2 id="admin-panel-titulo" style={{ fontSize: "1.15rem", color: "#fff", margin: 0 }}>
                  {t("admin.title")}
                </h2>
                <span style={estilos.badgePendientes}>
                  {cargando ? t("admin.loading") : t("admin.pending", { count: proyectos.length })}
                </span>
              </div>
            </div>
            <button className="btn-close" onClick={onCerrar} aria-label={t("admin.closeAria")} style={{ color: "#fff", opacity: 0.8 }}>
              ×
            </button>
          </div>

          <div style={{ padding: "20px 0 4px" }}>
            {cargando && (
              <div style={estilos.centrado}>
                <span style={estilos.spinner} aria-label="Cargando proyectos" />
                <span style={{ color: "var(--muted)", fontSize: "0.88rem", marginLeft: "10px" }}>
                  {t("admin.loading")}
                </span>
              </div>
            )}

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

            {!cargando && proyectos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {proyectos.map((proyecto) => (
                  <TarjetaProyecto
                    key={proyecto.id}
                    proyecto={proyecto}
                    onAprobar={manejarAprobar}
                    onRechazar={manejarRechazar}
                  />
                ))}
              </div>
            )}
          </div>
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = {
  iconHeader: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.15)", borderRadius: "10px",
    padding: "7px 9px", color: "#fff", lineHeight: 1,
  },
  badgePendientes: {
    display: "inline-block", marginTop: "4px",
    fontSize: "0.75rem", color: "rgba(255,255,255,0.75)", fontWeight: 500,
  },
  centrado: {
    display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px",
  },
  spinner: {
    display: "inline-block", width: "20px", height: "20px",
    borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--navy)",
    animation: "spin 0.7s linear infinite",
  },
  estadoVacio: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "40px 20px", background: "var(--green-dim)",
    border: "1.5px solid rgba(22,163,74,0.20)", borderRadius: "var(--radius-sm)",
    textAlign: "center", color: "var(--green)",
  },
};
