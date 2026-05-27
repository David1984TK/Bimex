import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePaginacion, ControlPagina } from "../hooks/usePaginacion.jsx";
import { stroopsAMXNe } from "../stellar/contrato";

const ESTADO_CFG = {
  EtapaInicial: { labelKey: "status.EtapaInicial", badgeClass: "badge-muted"  },
  EnProgreso:   { labelKey: "status.EnProgreso",   badgeClass: "badge-teal"   },
  Liberado:     { labelKey: "status.Liberado",     badgeClass: "badge-amber"  },
  Abandonado:   { labelKey: "status.Abandonado",   badgeClass: "badge-red"    },
  EnRevision:   { labelKey: "status.EnRevision",   badgeClass: null, customStyle: { background: "var(--amber-dim)", color: "var(--amber)", border: "1px solid rgba(217,119,6,0.20)" } },
  Rechazado:    { labelKey: "status.Rechazado",    badgeClass: "badge-red"    },
};

function getBadgeCfg(estado) {
  return ESTADO_CFG[estado] ?? ESTADO_CFG.EtapaInicial;
}

function pct(aportado, meta) {
  const a = Number(aportado ?? 0);
  const m = Number(meta ?? 0);
  return m > 0 ? Math.min((a / m) * 100, 100) : 0;
}

function IconSeedling() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 20c0-5.5 5.5-9 9-9"/>
      <path d="M2 9c0-3.3 2.7-6 6-6 3.3 0 6 2.7 6 6 0 4.4-3 6-6 6-2 0-4-.5-6-2"/>
    </svg>
  );
}

function EstadoBadge({ estado }) {
  const { t } = useTranslation();
  const cfg = getBadgeCfg(estado);
  if (cfg.customStyle) {
    return <span className="badge" style={cfg.customStyle}>{t(cfg.labelKey)}</span>;
  }
  return <span className={`badge ${cfg.badgeClass}`}>{t(cfg.labelKey)}</span>;
}

function CardMiProyecto({ proyecto, onVerProyecto }) {
  const { t } = useTranslation();
  const progreso = pct(proyecto.aportado, proyecto.meta);

  return (
    <article className="card" style={estilos.card}>
      <div style={estilos.cardTop}>
        <h3 style={estilos.cardTitulo}>{proyecto.nombre}</h3>
        <EstadoBadge estado={proyecto.estado} />
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{t("cuenta.funding")}</span>
          <span style={{ fontSize: "0.76rem", color: "var(--navy)", fontWeight: 700 }}>
            {progreso.toFixed(0)}%
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={Math.round(progreso)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${progreso.toFixed(0)}% del objetivo`}
        >
          <div className="progress-fill" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      <div style={estilos.statsRow}>
        <div>
          <div style={estilos.statLabel}>{t("cuenta.raised")}</div>
          <div style={estilos.statValor}>{stroopsAMXNe(proyecto.aportado)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={estilos.statLabel}>{t("cuenta.goal")}</div>
          <div style={estilos.statValor}>{stroopsAMXNe(proyecto.meta)}</div>
        </div>
      </div>

      <button
        className="btn btn-secondary"
        style={{ width: "100%", marginTop: 16, justifyContent: "center" }}
        onClick={() => onVerProyecto(proyecto)}
        aria-label={`${t("cuenta.viewDetails")} ${proyecto.nombre}`}
      >
        {t("cuenta.viewDetails")}
      </button>
    </article>
  );
}

export default function TabMisProyectos({ proyectos, direccion, onVerProyecto, t }) {
  const misProyectos = proyectos.filter((p) => p.dueno === direccion);
  const gridRef = useRef(null);

  const { datosPagina, pagina, setPagina, totalPaginas, cargandoPagina } =
    usePaginacion(misProyectos, [proyectos, direccion]);

  const handlePaginaChange = (nuevaPagina) => {
    setPagina(nuevaPagina);
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (misProyectos.length === 0) {
    return (
      <div style={estilos.empty}>
        <IconSeedling />
        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginTop: 16 }}>
          {t("cuenta.noProjects")}
        </p>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginTop: 6 }}>
          {t("cuenta.noProjectsHint")}
        </p>
      </div>
    );
  }

  return (
    <div ref={gridRef} style={{ opacity: cargandoPagina ? 0.5 : 1, transition: "opacity 0.15s" }}>
      {cargandoPagina && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))", gap: 20, marginBottom: 16 }}>
          {Array.from({ length: Math.min(4, datosPagina.length || 4) }).map((_, i) => (
            <div key={`skeleton-${i}`} className="card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 16, width: "60%", borderRadius: 4, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 8, width: "100%", borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 16, width: "40%", borderRadius: 4, marginTop: 14 }} />
            </div>
          ))}
        </div>
      )}
      {!cargandoPagina && (
        <div className="cuenta-grid" style={estilos.grid} role="list" aria-label={t("cuenta.ariaProjects")}>
          {datosPagina.map((p) => (
            <CardMiProyecto key={p.id} proyecto={p} onVerProyecto={onVerProyecto} />
          ))}
        </div>
      )}
      <ControlPagina pagina={pagina} totalPaginas={totalPaginas} onChange={handlePaginaChange} t={t} />
    </div>
  );
}

const estilos = {
  card: { display: "flex", flexDirection: "column", cursor: "default" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  cardTitulo: { fontSize: "1rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.3, flex: 1 },
  statsRow: { display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1.5px solid var(--border)" },
  statLabel: { fontSize: "0.70rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 3 },
  statValor: { fontSize: "0.84rem", color: "var(--text2)", fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))", gap: 20 },
  empty: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" },
};
