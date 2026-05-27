import { useTranslation } from "react-i18next";
import { stroopsAMXNe } from "../stellar/contrato";

function fmt(n) {
  return n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function PanelInversion({
  proyecto,
  miAportacion, miYield, balanceMXNe,
  cantidad, cargando,
  modoInversion, vistaRetirar,
  aceptaFondos, esAbandonado, esDueno, plazoVencido, porcentaje,
  errorCantidad, cantidadValida, superaBalance, proyeccion,
  handleCantidadChange,
  setModoInversion, setVistaRetirar,
  manejarContribuir, manejarRetirar, manejarReclamarYield,
  manejarRetiroAnticipado, manejarSolicitarContinuar,
}) {
  const { t } = useTranslation();
  const estado = proyecto.estado ?? "EtapaInicial";

  return (
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

          {/* Mi posición */}
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
                  <strong>${fmt(Number(cantidad) || 0)} MXN</strong>
                </div>
                <div className="calc-row">
                  <span>{t("detalle.calcYield", { pct: modoInversion === "inversor" ? "5%" : "0%" })}</span>
                  <strong style={{ color: "var(--navy)" }}>${fmt(proyeccion.tuYield)} MXN</strong>
                </div>
                <div className="calc-row">
                  <span>{t("detalle.calcProject")}</span>
                  <strong style={{ color: "var(--green)" }}>${fmt(proyeccion.proyectoRecibe)} MXN</strong>
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
              <div className="invest-note">{t("detalle.safetyMsg")}</div>
            </>
          )}

          {/* Capital bloqueado o retiro anticipado */}
          {miAportacion > BigInt(0) && (estado === "EtapaInicial" || estado === "EnProgreso") && (
            plazoVencido ? (
              <div className="detail-banner detail-banner--amber" style={{ marginTop: 8 }}>
                <IconShield />
                <span>{t("detalle.expiredBanner")}</span>
              </div>
            ) : (
              <>
                <div className="locked-notice">
                  <IconShield />
                  <span>{t("detalle.locked")}</span>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ width: "100%", justifyContent: "center", marginTop: 8, fontSize: "0.82rem", color: "var(--muted)" }}
                  onClick={manejarRetiroAnticipado}
                  disabled={cargando}
                  title={t("detalle.earlyWithdrawTitle")}
                >
                  {cargando ? t("detalle.processing") : t("detalle.earlyWithdraw")}
                </button>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", marginTop: 4 }}>
                  {t("detalle.earlyWithdrawNote")}
                </p>
              </>
            )
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

          {/* Reclamar yield (dueño) */}
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

          {/* Tomar control */}
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
  );
}
