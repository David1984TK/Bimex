import { useTranslation } from "react-i18next";
import { stroopsAMXNe } from "../stellar/contrato";

const ESTADO_CFG = {
  EtapaInicial: { badge: "badge-muted",  btnLabelKey: "card.contributeBtn", btnClass: "btn-secondary" },
  EnProgreso:   { badge: "badge-teal",   btnLabelKey: "card.contributeBtn", btnClass: "btn-secondary" },
  Liberado:     { badge: "badge-amber",  btnLabelKey: "card.detailBtn",     btnClass: "btn-secondary" },
  Abandonado:   { badge: "badge-red",    btnLabelKey: "card.takeControlBtn",btnClass: "btn-ghost"     },
};

function StatItem({ label, valor, muted }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "'SFMono-Regular','Consolas',monospace", fontSize: "0.82rem", color: muted ? "var(--muted)" : "var(--text2)", marginTop: 3, fontWeight: 600 }}>{valor}</div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <article className="card" aria-hidden="true" style={{ ...estilos.card, pointerEvents: "none", userSelect: "none" }}>
      <div style={estilos.cardTop}>
        <div className="skeleton" style={{ height: 22, width: 90, borderRadius: 99 }} />
      </div>
      <div className="skeleton" style={{ height: 20, width: "70%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: "40%", marginBottom: 18 }} />
      <div className="skeleton" style={{ height: 8, borderRadius: 4, marginBottom: 8 }} />
      <div style={estilos.statsRow}>
        <div className="skeleton" style={{ height: 14, width: 70 }} />
        <div className="skeleton" style={{ height: 14, width: 70 }} />
      </div>
      <div className="skeleton" style={{ height: 36, marginTop: 16, borderRadius: 6 }} />
    </article>
  );
}

export default function CardProyecto({ proyecto, onClick }) {
  const { t } = useTranslation();
  const meta     = Number(proyecto.meta);
  const aportado = Number(proyecto.aportado);
  const pct      = meta > 0 ? Math.min((aportado / meta) * 100, 100) : 0;
  const estado   = proyecto.estado ?? "EtapaInicial";
  const cfg      = ESTADO_CFG[estado] ?? ESTADO_CFG.EtapaInicial;
  const btnLabel = t(cfg.btnLabelKey);

  return (
    <article
      className="card"
      role="listitem"
      style={{ ...estilos.card, opacity: estado === "Abandonado" ? 0.75 : 1 }}
      onClick={onClick}
      aria-label={`${proyecto.nombre}, ${t(`status.${estado}`)}, ${pct.toFixed(0)}%`}
    >
      <div style={estilos.cardTop}>
        <span className={`badge ${cfg.badge}`}>
          <span className="badge-dot" />
          {t(`status.${estado}`)}
        </span>
        {proyecto.doc_cid && (
          <span style={{
            background: "var(--green-dim)", border: "1px solid rgba(22,163,74,0.20)",
            color: "var(--green)", fontSize: "0.7rem", fontWeight: 600,
            padding: "2px 8px", borderRadius: "99px",
          }}>
            Verificado
          </span>
        )}
      </div>

      <h3 style={estilos.nombre}>{proyecto.nombre}</h3>
      <p style={{ fontSize: "0.75rem", color: "var(--subtle)", fontFamily: "'SFMono-Regular','Consolas',monospace", marginBottom: 0 }}>
        {proyecto.dueno.slice(0, 6)}...{proyecto.dueno.slice(-4)}
      </p>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{t("lista.funding")}</span>
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

      <div style={estilos.statsRow}>
        <StatItem label={t("lista.locked")} valor={stroopsAMXNe(proyecto.aportado)} />
        <StatItem label={t("lista.goal")}   valor={stroopsAMXNe(proyecto.meta)}     muted />
      </div>

      <button
        className={`btn ${cfg.btnClass}`}
        style={{ width: "100%", marginTop: 16, justifyContent: "center" }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        aria-label={`${btnLabel} ${proyecto.nombre}`}
      >
        {btnLabel}
      </button>
    </article>
  );
}

const estilos = {
  card:     { cursor: "pointer", display: "flex", flexDirection: "column" },
  cardTop:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  nombre:   { fontSize: "0.98rem", fontWeight: 600, marginBottom: 4, lineHeight: 1.4, color: "var(--text)" },
  statsRow: { display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" },
};
