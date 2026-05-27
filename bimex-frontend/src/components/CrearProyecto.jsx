import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useCrearProyecto  from "../hooks/useCrearProyecto";
import PasoInfoProyecto  from "./PasoInfoProyecto";
import PasoDocumentos    from "./PasoDocumentos";
import PasoConfirmar     from "./PasoConfirmar";

// ─── Stepper ──────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

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
  const modalRef     = useRef(null);
  const botonAbrioRef = useRef(document.activeElement);

  const {
    paso, setPaso,
    forma, docs,
    docCid, ipfsCids,
    cargando, hasheando,
    error, setError,
    metaFormateada, yieldEstimado, yieldNote,
    manejarCambio, setDoc,
    avanzarAPaso2, avanzarAPaso3, manejarSubmit,
  } = useCrearProyecto({ direccion, onCerrar, onCreado, onError });

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
        <div className="modal-header">
          <h2 id="crear-titulo" style={{ fontWeight: 800, color: "var(--navy)" }}>{t("crear.title")}</h2>
          <button className="btn-close" onClick={onCerrar} aria-label={t("crear.closeAria")}>×</button>
        </div>

        <Stepper pasos={PASOS} pasoActual={paso} />

        <form onSubmit={manejarSubmit}>
          {paso === 1 && (
            <PasoInfoProyecto
              forma={forma}
              manejarCambio={manejarCambio}
              metaFormateada={metaFormateada}
              yieldEstimado={yieldEstimado}
              yieldNote={yieldNote}
              error={error}
              avanzarAPaso2={avanzarAPaso2}
              onCerrar={onCerrar}
            />
          )}
          {paso === 2 && (
            <PasoDocumentos
              docs={docs}
              setDoc={setDoc}
              error={error}
              hasheando={hasheando}
              avanzarAPaso3={avanzarAPaso3}
              setPaso={setPaso}
              setError={setError}
            />
          )}
          {paso === 3 && docCid && (
            <PasoConfirmar
              forma={forma}
              docs={docs}
              docCid={docCid}
              ipfsCids={ipfsCids}
              cargando={cargando}
              error={error}
              manejarSubmit={manejarSubmit}
              setPaso={setPaso}
              setError={setError}
            />
          )}
        </form>
      </div>
    </div>
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
};
