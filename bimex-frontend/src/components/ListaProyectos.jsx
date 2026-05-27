import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { obtenerTodosLosProyectos, stroopsAMXNe } from "../stellar/contrato";
import { parsearError } from "../utils/errores.js";
import CardProyecto, { SkeletonCard } from "./CardProyecto";

export default function ListaProyectos({ onSeleccionar, onCrear, refrescar }) {
  const { t } = useTranslation();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("Todos");
  const [visibles, setVisibles] = useState(12);
  const [errorCarga, setErrorCarga] = useState(null);
  const cargandoRef = useRef(false);

  const ESTADOS_OCULTOS = new Set(["EnRevision", "Rechazado"]);
  const FILTROS = [
    { key: "Todos",        label: t("filters.all"),        dot: null            },
    { key: "EtapaInicial", label: t("filters.initial"),    dot: "var(--muted)"  },
    { key: "EnProgreso",   label: t("filters.inProgress"), dot: "var(--green)"  },
    { key: "Liberado",     label: t("filters.released"),   dot: "var(--amber)"  },
    { key: "Abandonado",   label: t("filters.abandoned"),  dot: "var(--error)"  },
  ];

  async function cargar() {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await obtenerTodosLosProyectos();
      setProyectos(data);
    } catch (e) {
      setErrorCarga(parsearError(e));
    } finally {
      setCargando(false);
      cargandoRef.current = false;
    }
  }

  useEffect(() => { cargar(); }, [refrescar]);
  useEffect(() => { setVisibles(12); }, [filtro]);

  useEffect(() => {
    const url = import.meta.env.VITE_INDEXER_URL;
    if (!url) return;
    const es = new EventSource(`${url}/sse`);
    const recargar = () => cargar();
    es.addEventListener('proyecto_actualizado', recargar);
    es.addEventListener('nueva_contribucion', recargar);
    es.addEventListener('yield_reclamado', recargar);
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const proyectosPublicos = proyectos.filter(p => !ESTADOS_OCULTOS.has(p.estado));
  const totalBloqueado = proyectosPublicos.reduce((s, p) => {
    try { return s + BigInt(p.aportado ?? 0); } catch { return s; }
  }, BigInt(0));
  const enProgreso = proyectosPublicos.filter(p => p.estado === "EnProgreso").length;
  const liberados  = proyectosPublicos.filter(p => p.estado === "Liberado").length;

  const proyectosFiltrados = filtro === "Todos"
    ? proyectosPublicos
    : proyectosPublicos.filter(p => p.estado === filtro);

  return (
    <div className="lista-contenedor" style={estilos.contenedor}>

      {/* Header */}
      <div className="lista-header" style={estilos.header}>
        <div>
          <h2 style={estilos.titulo}>{t("lista.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
            {t("lista.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={cargar}
            style={{ padding: "9px 14px" }}
            title={t("lista.reload")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          <button className="btn btn-primary" onClick={onCrear}>{t("lista.create")}</button>
        </div>
      </div>

      {/* Stats strip */}
      {proyectosPublicos.length > 0 && (
        <div className="stats-strip-scroll lista-stats-strip" style={estilos.statsStrip}>
          <StatStrip label={t("lista.statTotal")} valor={proyectosPublicos.length} />
          <div style={estilos.statsDivider} />
          <StatStrip label={t("lista.statProgress")} valor={enProgreso} highlight />
          <div style={estilos.statsDivider} />
          <StatStrip label={t("lista.statReleased")} valor={liberados} />
          <div style={estilos.statsDivider} />
          <StatStrip label={t("lista.statLocked")} valor={stroopsAMXNe(totalBloqueado)} mono />
        </div>
      )}

      {/* Banner explicativo */}
      <div style={estilos.banner}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--navy)", flexShrink: 0, marginTop: 2 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text2)" }}>{t("lista.howTitle")}</strong>{" "}
          {t("lista.howDesc")}
        </p>
      </div>

      {/* Filtros */}
      {proyectosPublicos.length > 0 && (
        <div className="filtros-row" style={estilos.filtrosRow}>
          {FILTROS.map(f => {
            const activo = filtro === f.key;
            const count = f.key === "Todos"
              ? proyectosPublicos.length
              : proyectosPublicos.filter(p => p.estado === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                aria-pressed={activo}
                style={{
                  ...estilos.filtroBtnBase,
                  background: activo ? "var(--navy)" : "var(--card)",
                  color: activo ? "#fff" : "var(--text2)",
                  border: `1px solid ${activo ? "var(--navy)" : "var(--border2)"}`,
                }}
              >
                {/* dot de estado */}
                {f.dot && (
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: activo ? "rgba(255,255,255,0.8)" : f.dot,
                    flexShrink: 0,
                  }} />
                )}
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

      {/* Error de carga */}
      {errorCarga && (
        <div className="error-mensaje" role="alert" style={{ color: "var(--error, #DC2626)", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: "0.86rem", marginBottom: 20 }}>
          {errorCarga}
        </div>
      )}

      {/* Grid / estados */}
      {cargando ? (
        <div className="grid-proyectos" style={estilos.grid} role="status" aria-live="polite" aria-label={t("lista.loading")}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : proyectos.length === 0 ? (
        <div style={estilos.empty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--border2)" }}>
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginTop: 16 }}>
            {t("lista.empty")}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 6 }}>
            {t("lista.emptyHint")}
          </p>
          <button className="btn btn-primary" onClick={onCrear} style={{ marginTop: 20 }}>
            {t("lista.create")}
          </button>
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div style={estilos.empty}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--border2)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", marginTop: 16 }}>
            {t("lista.noResults")}
          </p>
          <button className="btn btn-ghost" onClick={() => setFiltro("Todos")} style={{ marginTop: 16 }}>
            {t("lista.viewAll")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid-proyectos" style={estilos.grid} role="list" aria-label={t("lista.ariaList")}>
            {proyectosFiltrados.slice(0, visibles).map((p) => (
              <CardProyecto key={p.id} proyecto={p} onClick={() => onSeleccionar(p)} />
            ))}
          </div>
          {proyectosFiltrados.length > visibles && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setVisibles(v => v + 12)}
              >
                {t("lista.loadMore")} ({proyectosFiltrados.length - visibles} {t("lista.remaining")})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Stat strip item ──────────────────────────────────────────────────────────
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

// ── Estilos ──────────────────────────────────────────────────────────────────
const estilos = {
  contenedor:    { maxWidth: "1140px", margin: "0 auto", padding: "40px 24px" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  titulo:        { fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" },
  statsStrip:    { display: "flex", alignItems: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 24px", marginBottom: 20, boxShadow: "var(--shadow-sm)" },
  statsDivider:  { width: 1, height: 28, background: "var(--border)", flexShrink: 0 },
  banner:        { display: "flex", alignItems: "flex-start", gap: 12, background: "var(--navy-dim)", border: "1px solid rgba(30,58,95,0.12)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 24 },
  grid:          { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))", gap: 16 },
  card:          { cursor: "pointer", display: "flex", flexDirection: "column" },
  cardTop:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  nombre:        { fontSize: "0.98rem", fontWeight: 600, marginBottom: 4, lineHeight: 1.4, color: "var(--text)" },
  statsRow:      { display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" },
  loading:       { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0" },
  spinner:       { width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--navy)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty:         { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" },
  filtrosRow:    { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 },
  filtroBtnBase: { padding: "6px 14px", borderRadius: "var(--radius-sm)", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 },
};
