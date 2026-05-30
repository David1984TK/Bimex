import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { obtenerTodosLosProyectos, calcularYieldDetallado, stroopsAMXNe } from "../stellar/contrato";
import { parsearError } from "../utils/errores.js";

const ESTADOS_OCULTOS = new Set(["EnRevision", "Rechazado"]);

const ESTADO_CFG = {
  EtapaInicial: { badge: "badge-muted" },
  EnProgreso:   { badge: "badge-teal"  },
  Liberado:     { badge: "badge-amber" },
  Abandonado:   { badge: "badge-red"   },
};

function StatStrip({ label, valor, mono, highlight }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? "'SFMono-Regular', 'Consolas', monospace" : "inherit",
        fontWeight: 700, fontSize: "0.95rem",
        color: highlight ? "var(--green)" : "var(--text2)",
      }}>
        {valor}
      </div>
    </div>
  );
}

export default function Transparencia({ onVolver }) {
  const { t } = useTranslation();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [filtro, setFiltro] = useState("Todos");
  const [totalYield, setTotalYield] = useState(BigInt(0));

  const FILTROS = [
    { key: "Todos",        label: t("filters.all")        },
    { key: "EtapaInicial", label: t("filters.initial")    },
    { key: "EnProgreso",   label: t("filters.inProgress") },
    { key: "Liberado",     label: t("filters.released")   },
    { key: "Abandonado",   label: t("filters.abandoned")  },
  ];

  async function cargar() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await obtenerTodosLosProyectos();
      const publicos = data.filter(p => !ESTADOS_OCULTOS.has(p.estado));
      setProyectos(publicos);

      const yields = await Promise.all(
        publicos.map(p => calcularYieldDetallado(p.id).catch(() => ({ total: BigInt(0) })))
      );
      const sumaYield = yields.reduce((s, y) => {
        try { return s + BigInt(y?.total ?? 0); } catch { return s; }
      }, BigInt(0));
      setTotalYield(sumaYield);
    } catch (e) {
      setErrorCarga(parsearError(e));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const totalBloqueado = proyectos.reduce((s, p) => {
    try { return s + BigInt(p.aportado ?? 0); } catch { return s; }
  }, BigInt(0));
  const enProgreso = proyectos.filter(p => p.estado === "EnProgreso").length;

  const proyectosFiltrados = filtro === "Todos"
    ? proyectos
    : proyectos.filter(p => p.estado === filtro);

  return (
    <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "40px 24px" }}>

      {onVolver && (
        <button
          onClick={onVolver}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--navy)", fontWeight: 500, fontSize: "0.88rem",
            padding: "0 0 20px 0", display: "block",
          }}
        >
          {t("transp.back")}
        </button>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
          {t("transp.title")}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
          {t("transp.subtitle")}
        </p>
      </div>

      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        background: "var(--navy-dim)", border: "1px solid rgba(30,58,95,0.12)",
        borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 24,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--navy)", flexShrink: 0, marginTop: 2 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "var(--text2)" }}>{t("transp.infoTitle")}</strong>{" "}
          {t("transp.infoDesc")}
        </p>
      </div>

      {errorCarga && (
        <div role="alert" style={{
          color: "var(--error, #DC2626)", background: "rgba(220,38,38,0.06)",
          border: "1px solid rgba(220,38,38,0.18)", borderRadius: "var(--radius-sm)",
          padding: "12px 16px", fontSize: "0.86rem", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <span>{t("transp.errorLoad")}</span>
          <button
            onClick={cargar}
            style={{
              background: "none", border: "1px solid rgba(220,38,38,0.30)", cursor: "pointer",
              color: "var(--error, #DC2626)", padding: "4px 12px", borderRadius: "var(--radius-sm)",
              fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "0.82rem", whiteSpace: "nowrap",
            }}
          >
            {t("transp.retry")}
          </button>
        </div>
      )}

      {cargando ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0" }} role="status" aria-live="polite">
          <div style={{ width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} aria-hidden="true" />
          <p style={{ color: "var(--muted)", marginTop: 16, fontSize: "0.9rem" }}>{t("transp.loading")}</p>
        </div>
      ) : (
        <>
          {proyectos.length > 0 && (
            <div className="stats-strip-scroll lista-stats-strip" style={{
              display: "flex", alignItems: "center",
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "16px 24px",
              marginBottom: 20, boxShadow: "var(--shadow-sm)",
            }}>
              <StatStrip label={t("transp.statTotal")} valor={proyectos.length} />
              <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />
              <StatStrip label={t("transp.statLocked")} valor={stroopsAMXNe(totalBloqueado)} mono />
              <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />
              <StatStrip label={t("transp.statProgress")} valor={enProgreso} highlight />
              <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />
              <StatStrip label={t("transp.statYield")} valor={stroopsAMXNe(totalYield)} mono />
            </div>
          )}

          {proyectos.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginRight: 8 }}>
                {t("transp.filterLabel")}
              </span>
            </div>
          )}

          {proyectos.length > 0 && (
            <div className="filtros-row" style={{
              display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20,
            }}>
              {FILTROS.map(f => {
                const activo = filtro === f.key;
                const count = f.key === "Todos"
                  ? proyectos.length
                  : proyectos.filter(p => p.estado === f.key).length;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key)}
                    aria-pressed={activo}
                    style={{
                      padding: "6px 14px", borderRadius: "var(--radius-sm)",
                      fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "0.82rem",
                      cursor: "pointer", transition: "all 0.15s",
                      display: "flex", alignItems: "center", gap: 4,
                      background: activo ? "var(--navy)" : "var(--card)",
                      color: activo ? "#fff" : "var(--text2)",
                      border: `1px solid ${activo ? "var(--navy)" : "var(--border2)"}`,
                    }}
                  >
                    {f.label}
                    <span style={{
                      background: activo ? "rgba(255,255,255,0.22)" : "var(--bg)",
                      color: activo ? "#fff" : "var(--muted)",
                      borderRadius: "99px", padding: "1px 7px",
                      fontSize: "0.72rem", fontWeight: 600, marginLeft: 2,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {proyectos.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--border2)" }}>
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginTop: 16 }}>
                {t("transp.empty")}
              </p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 6 }}>
                {t("transp.emptyHint")}
              </p>
            </div>
          ) : proyectosFiltrados.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--border2)" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginTop: 16 }}>
                {t("transp.noResults")}
              </p>
              <button
                className="btn btn-ghost"
                onClick={() => setFiltro("Todos")}
                style={{ marginTop: 16 }}
              >
                {t("transp.viewAll")}
              </button>
            </div>
          ) : (
            <div className="grid-proyectos" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))",
              gap: 16,
            }} role="list" aria-label={t("transp.title")}>
              {proyectosFiltrados.map(p => (
                <ProyectoCard key={p.id} proyecto={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProyectoCard({ proyecto }) {
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
          <span style={{ fontSize: "0.78rem", color: "var(--green)", fontWeight: 700 }}>
            {pct.toFixed(0)}%
          </span>
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
