import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { parsearError } from "../utils/errores.js";
import { obtenerTodosLosProyectos, obtenerAportacion, calcularYield, stroopsAMXNe } from "../stellar/contrato";
import TabMisProyectos      from "./TabMisProyectos";
import TabMisContribuciones from "./TabMisContribuciones";
import NotificacionesPanel  from "./NotificacionesPanel";
import { SkeletonTableRows } from "./TabMisContribuciones";

// ─── Metro card icons ────────────────────────────────────────────────────────

const IconCapital = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v2m0 8v2M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-2.5 2.5S9.5 13 9.5 14.5a2.5 2.5 0 0 0 5 0"/>
  </svg>
);

const IconRendimiento = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);

const IconProyectos = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
  </svg>
);

// ─── Metric Cards ────────────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, accent }) {
  return (
    <div style={{ ...estilos.metricCard, borderTopColor: accent ?? "var(--navy)" }}>
      <div style={estilos.metricIcon}>{icon}</div>
      <div style={estilos.metricLabel}>{label}</div>
      <div style={{ ...estilos.metricValue, color: accent ?? "var(--navy)" }}>{value}</div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MiCuenta({ direccion, onVerProyecto, onTotalInvertido }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("proyectos");
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorPrincipal, setErrorPrincipal] = useState(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setErrorPrincipal(null);
      try {
        const data = await obtenerTodosLosProyectos();
        setProyectos(data);
      } catch (e) {
        setErrorPrincipal(parsearError(e));
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [direccion]);

  const numCreados = proyectos.filter((p) => p.dueno === direccion).length;

  const [numApoyados,   setNumApoyados]   = useState(null);
  const [totalInvertido, setTotalInvertido] = useState(null);
  const [totalYield,     setTotalYield]     = useState(null);

  useEffect(() => {
    if (proyectos.length === 0) {
      setNumApoyados(0);
      setTotalInvertido(BigInt(0));
      setTotalYield(BigInt(0));
      return;
    }

    let cancelado = false;

    async function calcularResumen() {
      try {
        const resultados = await Promise.all(
          proyectos.map(async (p) => {
            const [aportacion, yieldAcum] = await Promise.all([
              obtenerAportacion(p.id, direccion),
              calcularYield(p.id, direccion),
            ]);
            return { aportacion, yieldAcum };
          })
        );
        if (cancelado) return;
        const positivos = resultados.filter((r) => r.aportacion > BigInt(0));
        const total  = positivos.reduce((acc, r) => acc + r.aportacion, BigInt(0));
        const totalY = positivos.reduce((acc, r) => {
          try { return acc + BigInt(r.yieldAcum ?? 0); } catch { return acc; }
        }, BigInt(0));
        setNumApoyados(positivos.length);
        setTotalInvertido(total);
        setTotalYield(totalY);
        onTotalInvertido?.(total);
      } catch (e) {
        if (!cancelado) {
          setErrorPrincipal(parsearError(e));
          setNumApoyados(0);
          setTotalInvertido(BigInt(0));
          setTotalYield(BigInt(0));
        }
      }
    }

    calcularResumen();
    return () => { cancelado = true; };
  }, [proyectos, direccion, onTotalInvertido]);

  const resumenListo = numApoyados !== null && totalInvertido !== null;

  return (
    <div className="cuenta-contenedor" style={estilos.contenedor}>

      {/* Header */}
      <div style={estilos.header}>
        <div>
          <h2 style={estilos.titulo}>{t("cuenta.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.84rem", marginTop: 4, fontFamily: "monospace" }}>
            {direccion.slice(0, 8)}…{direccion.slice(-6)}
          </p>
        </div>
      </div>

      {/* Error principal */}
      {errorPrincipal && (
        <div role="alert" style={{ color: "var(--error, #DC2626)", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: "0.86rem", marginBottom: 20 }}>
          {errorPrincipal}
        </div>
      )}

      {/* 3 Metric Cards */}
      <div style={estilos.metricsRow}>
        <MetricCard
          icon={<IconCapital />}
          label={t("cuenta.totalInvested")}
          value={resumenListo ? stroopsAMXNe(totalInvertido) : "—"}
          accent="var(--navy)"
        />
        <MetricCard
          icon={<IconRendimiento />}
          label={t("cuenta.yieldAccumulated")}
          value={resumenListo ? stroopsAMXNe(totalYield) : "—"}
          accent="var(--green)"
        />
        <MetricCard
          icon={<IconProyectos />}
          label={t("cuenta.projectsSupported")}
          value={resumenListo ? numApoyados : "—"}
          accent="var(--navy)"
        />
      </div>

      {/* Notificaciones */}
      <NotificacionesPanel direccion={direccion} />

      {/* Tabs */}
      <div className="cuenta-tabs-row" style={estilos.tabsRow} role="tablist" aria-label={t("cuenta.ariaSections")}>
        <button
          role="tab"
          aria-selected={tab === "proyectos"}
          aria-controls="panel-proyectos"
          id="tab-proyectos"
          onClick={() => setTab("proyectos")}
          style={{ ...estilos.tabBtnBase, ...(tab === "proyectos" ? estilos.tabBtnActivo : estilos.tabBtnInactivo) }}
        >
          {t("cuenta.myProjects")}
          {!cargando && numCreados > 0 && (
            <span style={{ ...estilos.tabChip, background: tab === "proyectos" ? "rgba(255,255,255,0.22)" : "var(--navy-dim)", color: tab === "proyectos" ? "#fff" : "var(--navy)" }}>
              {numCreados}
            </span>
          )}
        </button>

        <button
          role="tab"
          aria-selected={tab === "contribuciones"}
          aria-controls="panel-contribuciones"
          id="tab-contribuciones"
          onClick={() => setTab("contribuciones")}
          style={{ ...estilos.tabBtnBase, ...(tab === "contribuciones" ? estilos.tabBtnActivo : estilos.tabBtnInactivo) }}
        >
          {t("cuenta.myContributions")}
          {resumenListo && numApoyados > 0 && (
            <span style={{ ...estilos.tabChip, background: tab === "contribuciones" ? "rgba(255,255,255,0.22)" : "var(--navy-dim)", color: tab === "contribuciones" ? "#fff" : "var(--navy)" }}>
              {numApoyados}
            </span>
          )}
        </button>
      </div>

      {/* Paneles */}
      {cargando ? (
        <div role="status" aria-live="polite" aria-label={t("cuenta.loading")} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={estilos.metricsRow}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ ...estilos.metricCard, borderTop: '3px solid var(--border)' }}>
                <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 4, marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 22, width: '40%' }} />
              </div>
            ))}
          </div>
          <div className="cuenta-tabs-row" style={{ ...estilos.tabsRow, borderBottom: '2px solid var(--border)', marginBottom: 24, gap: 4 }}>
            <div className="skeleton" style={{ height: 38, width: 130, borderRadius: '6px 6px 0 0' }} />
            <div className="skeleton" style={{ height: 38, width: 150, borderRadius: '6px 6px 0 0' }} />
          </div>
          <SkeletonTableRows count={4} />
        </div>
      ) : (
        <>
          <div
            role="tabpanel"
            id="panel-proyectos"
            aria-labelledby="tab-proyectos"
            hidden={tab !== "proyectos"}
          >
            {tab === "proyectos" && (
              <TabMisProyectos
                proyectos={proyectos}
                direccion={direccion}
                onVerProyecto={onVerProyecto}
                t={t}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="panel-contribuciones"
            aria-labelledby="tab-contribuciones"
            hidden={tab !== "contribuciones"}
          >
            {tab === "contribuciones" && (
              <TabMisContribuciones
                proyectos={proyectos}
                direccion={direccion}
                onVerProyecto={onVerProyecto}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = {
  contenedor: {
    maxWidth: "1140px",
    margin: "0 auto",
    padding: "40px 24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  titulo: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "var(--navy)",
    letterSpacing: "-0.02em",
  },

  // Metric cards
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  metricCard: {
    background: "var(--card)",
    border: "1.5px solid var(--border)",
    borderTop: "3px solid var(--navy)",
    borderRadius: "var(--radius)",
    padding: "20px 22px",
    boxShadow: "var(--shadow-sm)",
  },
  metricIcon: { marginBottom: 10 },
  metricLabel: {
    fontSize: "0.7rem",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    fontWeight: 700,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: "1.35rem",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },

  // Tabs
  tabsRow: {
    display: "flex",
    gap: 4,
    marginBottom: 24,
    borderBottom: "2px solid var(--border)",
    paddingBottom: 0,
  },
  tabBtnBase: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 18px",
    borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
    border: "none",
    borderBottom: "2.5px solid transparent",
    transition: "all 0.15s",
    marginBottom: -2,
  },
  tabBtnActivo: {
    background: "var(--navy)",
    color: "#fff",
    borderBottomColor: "var(--navy)",
  },
  tabBtnInactivo: {
    background: "transparent",
    color: "var(--muted)",
    borderBottomColor: "transparent",
  },
  tabChip: {
    borderRadius: "99px",
    padding: "1px 7px",
    fontSize: "0.70rem",
    fontWeight: 700,
  },

};
