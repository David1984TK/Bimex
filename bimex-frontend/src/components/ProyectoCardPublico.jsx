import { useTranslation } from "react-i18next";
import { stroopsAMXNe } from "../stellar/contrato";

const ESTADO_CFG = {
  EtapaInicial: { badge: "badge-muted" },
  EnProgreso:   { badge: "badge-teal"  },
  Liberado:     { badge: "badge-amber" },
  Abandonado:   { badge: "badge-red"   },
};

export default function ProyectoCardPublico({ proyecto }) {
  const { t } = useTranslation();
  const meta     = Number(proyecto.meta);
  const aportado = Number(proyecto.aportado);
  const pct      = meta > 0 ? Math.min((aportado / meta) * 100, 100) : 0;
  const estado   = proyecto.estado ?? "EtapaInicial";
  const cfg      = ESTADO_CFG[estado] ?? ESTADO_CFG.EtapaInicial;

  return (
    <article
      className="card"
      role="listitem"
      style={{ display: "flex", flexDirection: "column", opacity: estado === "Abandonado" ? 0.75 : 1 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className={`badge ${cfg.badge}`}>
          <span className="badge-dot" />
          {t(`status.${estado}`)}
        </span>
        {proyecto.doc_hash && (
          <span style={{
            background: "var(--green-dim)", border: "1px solid rgba(22,163,74,0.20)",
            color: "var(--green)", fontSize: "0.7rem", fontWeight: 600,
            padding: "2px 8px", borderRadius: "99px",
          }}>
            {t("transp.verified")}
          </span>
        )}
      </div>

      <h3 style={{ fontSize: "0.98rem", fontWeight: 600, marginBottom: 4, lineHeight: 1.4, color: "var(--text)" }}>
        {proyecto.nombre}
      </h3>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t("transp.funding")}</span>
          <span style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 700 }}>{pct.toFixed(0)}%</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${pct.toFixed(0)}%`}
        >
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {t("transp.locked")}
          </div>
          <div style={{ fontFamily: "'SFMono-Regular','Consolas',monospace", fontSize: "0.82rem", color: "var(--text2)", marginTop: 3, fontWeight: 600 }}>
            {stroopsAMXNe(proyecto.aportado)}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
            {t("transp.goal")}
          </div>
          <div style={{ fontFamily: "'SFMono-Regular','Consolas',monospace", fontSize: "0.82rem", color: "var(--muted)", marginTop: 3, fontWeight: 600 }}>
            {stroopsAMXNe(proyecto.meta)}
          </div>
        </div>
      </div>
    </article>
  );
}
