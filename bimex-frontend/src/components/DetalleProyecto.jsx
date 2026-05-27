import { useTranslation } from "react-i18next";
import { stroopsAMXNe }   from "../stellar/contrato";
import useProyectoDetalle  from "../hooks/useProyectoDetalle";
import PanelInversion      from "./PanelInversion";

const ESTADO_CONFIG = {
  EtapaInicial: { labelKey: "status.EtapaInicial", clase: "badge-muted" },
  EnProgreso:   { labelKey: "status.EnProgreso",   clase: "badge-teal" },
  Abandonado:   { labelKey: "status.Abandonado",   clase: "badge-red" },
  Liberado:     { labelKey: "status.Liberado",     clase: "badge-amber" },
};

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

function SkeletonDetailLeft() {
  return (
    <div className="detail-main" aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none" }}>
      <div className="detail-header">
        <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 99, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 28, width: "60%", marginBottom: 8 }} />
      </div>
      <div className="detail-section">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 16, width: i % 2 === 0 ? "40%" : "60%", marginBottom: 12 }} />
        ))}
      </div>
    </div>
  );
}

function SkeletonInvestPanel() {
  return (
    <div className="invest-panel" aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none" }}>
      <div className="invest-panel-head">
        <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 20, width: "70%" }} />
      </div>
      <div className="invest-body">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 16, width: `${60 + i * 10}%`, marginBottom: 12 }} />
        ))}
      </div>
    </div>
  );
}

export default function DetalleProyecto({ proyecto: proyectoInicial, direccion, onCerrar, onError, onToast }) {
  const { t } = useTranslation();

  const {
    proyecto, estado, esDueno, esAbandonado, aceptaFondos,
    plazoVencido, fechaVencimiento, porcentaje, yieldDueno,
    miAportacion, miYield, balanceMXNe,
    cargando, cargandoInicial,
    cantidad, modoInversion, vistaRetirar, confirmarAbandonar,
    cantidadValida, superaBalance, errorCantidad, proyeccion,
    handleCantidadChange,
    setModoInversion, setVistaRetirar, setConfirmarAbandonar,
    manejarContribuir, manejarRetirar, manejarReclamarYield,
    manejarRetiroAnticipado, manejarSolicitarContinuar, manejarAbandonar,
  } = useProyectoDetalle({ proyectoInicial, direccion, onError, onToast });

  const estadoCfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.EtapaInicial;

  const DOC_LABELS = [t("detalle.docINE"), t("detalle.docPlan"), t("detalle.docPresupuesto")];
  const docs = proyecto.doc_hash ? proyecto.doc_hash.split("|").filter(Boolean) : [];

  return (
    <>
      <div className="detail-page">
        <button className="back-link" onClick={onCerrar}>
          <IconArrowLeft />
          {t("detalle.backToProjects")}
        </button>

        <div className="detail-grid">
          {cargandoInicial ? (
            <>
              <SkeletonDetailLeft />
              <SkeletonInvestPanel />
            </>
          ) : (
            <>
              {/* ── LEFT: project info ── */}
              <div className="detail-main">
                <div className="detail-header">
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <span className={`badge ${estadoCfg.clase}`}>
                      <span className="badge-dot" />
                      {t(estadoCfg.labelKey)}
                    </span>
                  </div>
                  <h1>{proyecto.nombre}</h1>
                </div>

                {esAbandonado && (
                  <div className="detail-banner detail-banner--red">
                    <IconShield /><span>{t("detalle.abandonedBanner")}</span>
                  </div>
                )}
                {estado === "Liberado" && (
                  <div className="detail-banner detail-banner--amber">
                    <IconShield /><span>{t("detalle.releasedBanner")}</span>
                  </div>
                )}

                <div className="detail-section">
                  <h3>{t("detalle.projectInfo")}</h3>
                  <div className="info-grid">
                    <div className="info-cell"><label>{t("detalle.goal")}</label><span>{stroopsAMXNe(proyecto.meta ?? 0)}</span></div>
                    <div className="info-cell"><label>{t("detalle.raised")}</label><span className="green">{stroopsAMXNe(proyecto.aportado ?? 0)}</span></div>
                    <div className="info-cell"><label>{t("detalle.yieldDelivered")}</label><span>{stroopsAMXNe(proyecto.yield_entregado ?? 0)}</span></div>
                    <div className="info-cell">
                      <label>{t("detalle.owner")}</label>
                      <span style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                        {proyecto.dueno ? `${proyecto.dueno.slice(0, 6)}…${proyecto.dueno.slice(-4)}` : "—"}
                      </span>
                    </div>
                    {esDueno && BigInt(proyecto.aportado ?? 0) > BigInt(0) && (
                      <div className="info-cell" style={{ gridColumn: "1 / -1" }}>
                        <label>{t("detalle.yieldAvailable")}</label>
                        <span className="green" style={{ fontFamily: "monospace", fontSize: "1.1rem" }}>{stroopsAMXNe(yieldDueno)}</span>
                      </div>
                    )}
                    {fechaVencimiento && (
                      <div className="info-cell" style={{ gridColumn: "1 / -1" }}>
                        <label>{t("detalle.deadline")}</label>
                        <span style={{ fontFamily: "monospace", fontSize: "0.9rem", color: plazoVencido ? "var(--error)" : "var(--text)" }}>
                          {fechaVencimiento}
                          {plazoVencido && <span style={{ marginLeft: 8, fontSize: "0.78rem", color: "var(--error)", fontWeight: 600 }}>{t("detalle.expired")}</span>}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

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

                {docs.length > 0 && (
                  <div className="detail-section">
                    <h3>{t("detalle.verifiedDocs")}</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {docs.map((cid, i) => (
                        <div key={cid} className="doc-row">
                          <span style={{ color: "var(--muted)" }}><IconFile /></span>
                          <span style={{ fontSize: "0.85rem", flex: 1 }}>{DOC_LABELS[i] ?? `Documento ${i + 1}`}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>IPFS: {cid.slice(0, 8)}…</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {esDueno && aceptaFondos && (
                  <div className="detail-section">
                    {!confirmarAbandonar ? (
                      <button className="btn btn-ghost" style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                        onClick={() => setConfirmarAbandonar(true)} disabled={cargando}>
                        {t("detalle.abandon")}
                      </button>
                    ) : (
                      <div className="confirm-box confirm-box--red">
                        <p style={{ fontSize: "0.85rem", color: "#B91C1C", fontWeight: 600, marginBottom: 12 }}>{t("detalle.abandonConfirm")}</p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmarAbandonar(false)}>{t("detalle.cancel")}</button>
                          <button className="btn" style={{ flex: 1, justifyContent: "center", background: "#DC2626", color: "#fff" }}
                            onClick={manejarAbandonar} disabled={cargando}>
                            {cargando ? t("detalle.processing") : t("detalle.confirmAbandon")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── RIGHT: invest panel ── */}
              <PanelInversion
                proyecto={proyecto}
                miAportacion={miAportacion}
                miYield={miYield}
                balanceMXNe={balanceMXNe}
                cantidad={cantidad}
                cargando={cargando}
                modoInversion={modoInversion}
                vistaRetirar={vistaRetirar}
                aceptaFondos={aceptaFondos}
                esAbandonado={esAbandonado}
                esDueno={esDueno}
                plazoVencido={plazoVencido}
                porcentaje={porcentaje}
                errorCantidad={errorCantidad}
                cantidadValida={cantidadValida}
                superaBalance={superaBalance}
                proyeccion={proyeccion}
                handleCantidadChange={handleCantidadChange}
                setModoInversion={setModoInversion}
                setVistaRetirar={setVistaRetirar}
                manejarContribuir={manejarContribuir}
                manejarRetirar={manejarRetirar}
                manejarReclamarYield={manejarReclamarYield}
                manejarRetiroAnticipado={manejarRetiroAnticipado}
                manejarSolicitarContinuar={manejarSolicitarContinuar}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
