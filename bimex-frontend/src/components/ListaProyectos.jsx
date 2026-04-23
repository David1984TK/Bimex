import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { obtenerTodosLosProyectos, stroopsAMXNe } from "../stellar/contrato";

export default function ListaProyectos({ onSeleccionar, onCrear, refrescar }) {
  const { t } = useTranslation();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("Todos");

  // Estados que NO se muestran en la lista pública
  const ESTADOS_OCULTOS = new Set(["EnRevision", "Rechazado"]);
  const FILTROS = [
    { key: "Todos",        label: t("filters.all")        },
    { key: "EtapaInicial", label: t("filters.initial")    },
    { key: "EnProgreso",   label: t("filters.inProgress") },
    { key: "Liberado",     label: t("filters.released")   },
    { key: "Abandonado",   label: t("filters.abandoned")  },
  ];

  async function cargar() {
    setCargando(true);
    console.log("[Bimex] cargar() iniciado");
    try {
      const data = await obtenerTodosLosProyectos();
      console.log("[Bimex] proyectos obtenidos:", data.length, data);
      setProyectos(data);
    } catch (e) {
      console.error("[Bimex] Error cargando proyectos:", e);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [refrescar]);

  // Proyectos visibles públicamente (sin En Revisión ni Rechazados)
  const proyectosPublicos = proyectos.filter(p => !ESTADOS_OCULTOS.has(p.estado));
  const totalBloqueado = proyectosPublicos.reduce((s, p) => s + BigInt(p.aportado ?? 0), BigInt(0));
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
          <button className="btn btn-ghost" onClick={cargar}
            style={{ padding: "10px 14px", fontSize: "1rem" }}
            title={t("lista.reload")}>↺</button>
          <button className="btn btn-primary" onClick={onCrear}>{t("lista.create")}</button>
        </div>
      </div>

      {/* Stats strip */}
      {proyectosPublicos.length > 0 && (
        <div className="stats-strip-scroll lista-stats-strip" style={estilos.statsStrip}>
          <StatStrip icon="📦" label={t("lista.statTotal")} valor={proyectosPublicos.length} />
          <div style={estilos.statsDivider} />
          <StatStrip icon="🚀" label={t("lista.statProgress")} valor={enProgreso} />
          <div style={estilos.statsDivider} />
          <StatStrip icon="🏆" label={t("lista.statReleased")} valor={liberados} />
          <div style={estilos.statsDivider} />
          <StatStrip icon="💰" label={t("lista.statLocked")} valor={stroopsAMXNe(totalBloqueado)} mono />
        </div>
      )}

      {/* Banner explicativo */}
      <div style={estilos.banner}>
        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💡</span>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text2)" }}>{t("lista.howTitle")}</strong>{" "}
          {t("lista.howDesc")}
        </p>
      </div>

      {/* Filtros de estado */}
      {proyectosPublicos.length > 0 && (
        <div className="filtros-row" style={estilos.filtrosRow}>
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                ...estilos.filtroBtnBase,
                background: filtro === f.key ? "var(--primary)" : "#fff",
                color: filtro === f.key ? "#fff" : "var(--text2)",
                border: `1.5px solid ${filtro === f.key ? "var(--primary)" : "rgba(124,58,237,0.15)"}`,
                boxShadow: filtro === f.key ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
              }}
            >
              {f.label}
              {f.key !== "Todos" && (
                <span style={{
                  background: filtro === f.key ? "rgba(255,255,255,0.25)" : "var(--primary-dim)",
                  color: filtro === f.key ? "#fff" : "var(--primary)",
                  borderRadius: "99px",
                  padding: "1px 7px",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  marginLeft: 4,
                }}>
                  {proyectos.filter(p => p.estado === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {cargando ? (
        <div style={estilos.loading} role="status" aria-live="polite" aria-label={t("lista.loading")}>
          <div style={estilos.spinner} aria-hidden="true" />
          <p style={{ color: "var(--muted)", marginTop: 16, fontSize: "0.9rem" }}>{t("lista.loading")}</p>
        </div>
      ) : proyectos.length === 0 ? (
        <div style={estilos.empty}>
          <span style={{ fontSize: "3rem" }}>🌱</span>
          <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginTop: 16 }}>
            {t("lista.empty")}
          </p>
          <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: 6 }}>
            {t("lista.emptyHint")}
          </p>
          <button className="btn btn-primary" onClick={onCrear} style={{ marginTop: 20 }}>
            {t("lista.create")}
          </button>
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div style={estilos.empty}>
          <span style={{ fontSize: "2.5rem" }}>🔍</span>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", marginTop: 16 }}>
            {t("lista.noResults")}
          </p>
          <button className="btn btn-ghost" onClick={() => setFiltro("Todos")} style={{ marginTop: 16 }}>
            {t("lista.viewAll")}
          </button>
        </div>
      ) : (
        <div className="grid-proyectos" style={estilos.grid} role="list" aria-label={t("lista.ariaList")}>
          {proyectosFiltrados.map((p) => (
            <CardProyecto key={p.id} proyecto={p} onClick={() => onSeleccionar(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat strip item ──────────────────────────────────────────────────────────
function StatStrip({ icon, label, valor, mono }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: mono ? "'DM Mono', monospace" : "inherit", fontWeight: 700, fontSize: "0.95rem", color: "var(--text2)" }}>
        {valor}
      </div>
    </div>
  );
}

// ── Config de estado ─────────────────────────────────────────────────────────
const ESTADO_CFG = {
  EtapaInicial: { badge: "badge-muted",  emoji: "🌱", btnLabelKey: "card.contributeBtn", btnClass: "btn-secondary" },
  EnProgreso:   { badge: "badge-teal",   emoji: "🚀", btnLabelKey: "card.contributeBtn", btnClass: "btn-secondary" },
  Liberado:     { badge: "badge-amber",  emoji: "🏆", btnLabelKey: "card.detailBtn",     btnClass: "btn-secondary" },
  Abandonado:   { badge: "badge-red",    emoji: "⚠️", btnLabelKey: "card.takeControlBtn",btnClass: "btn-ghost"     },
};

// ── Card ─────────────────────────────────────────────────────────────────────
function CardProyecto({ proyecto, onClick }) {
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
      style={{ ...estilos.card, opacity: estado === "Abandonado" ? 0.78 : 1 }}
      onClick={onClick}
      aria-label={`${proyecto.nombre}, ${t(`status.${estado}`)}, ${pct.toFixed(0)}%`}
    >
      {/* Top row */}
      <div style={estilos.cardTop}>
        <span style={estilos.emoji}>{cfg.emoji}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <span className={`badge ${cfg.badge}`}>{t(`status.${estado}`)}</span>
          {proyecto.doc_hash && (
            <span
              style={{ background: "rgba(5,150,105,0.10)", border: "1px solid rgba(5,150,105,0.28)", color: "#059669", fontSize: "0.66rem", fontWeight: 700, padding: "2px 8px", borderRadius: "99px" }}
              title={t("lista.verifiedTitle")}
            >
              {t("lista.verified")}
            </span>
          )}
        </div>
      </div>

      {/* Nombre + dueño */}
      <h3 style={estilos.nombre}>{proyecto.nombre}</h3>
      <p style={{ fontSize: "0.76rem", color: "var(--muted)", fontFamily: "'DM Mono', monospace", marginBottom: 0 }}>
        {proyecto.dueno.slice(0, 6)}…{proyecto.dueno.slice(-4)}
      </p>

      {/* Progreso */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }} id={`prog-label-${proyecto.id}`}>
            {t("lista.funding")}
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontFamily: "'DM Mono'", fontWeight: 700 }}
                aria-hidden="true">
            {pct.toFixed(0)}%
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-labelledby={`prog-label-${proyecto.id}`}
          aria-valuetext={`${pct.toFixed(0)}%`}
        >
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div style={estilos.statsRow}>
        <StatItem label={t("lista.locked")} valor={stroopsAMXNe(proyecto.aportado)} color="var(--text2)" />
        <StatItem label={t("lista.goal")}   valor={stroopsAMXNe(proyecto.meta)}     color="var(--muted)" />
      </div>

      {/* CTA */}
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

function StatItem({ label, valor, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.83rem", color, marginTop: 3, fontWeight: 600 }}>{valor}</div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const estilos = {
  contenedor:   { maxWidth: "1140px", margin: "0 auto", padding: "40px 24px" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  titulo:       { fontSize: "1.9rem", color: "var(--text)", letterSpacing: "-0.02em" },
  statsStrip:   { display: "flex", alignItems: "center", background: "#fff", border: "1.5px solid rgba(124,58,237,0.12)", borderRadius: "var(--radius)", padding: "16px 24px", marginBottom: 24, boxShadow: "0 1px 6px rgba(124,58,237,0.06)" },
  statsDivider: { width: 1, height: 32, background: "rgba(124,58,237,0.10)", flexShrink: 0 },
  banner:       { display: "flex", alignItems: "flex-start", gap: 14, background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(79,70,229,0.04))", border: "1.5px solid rgba(124,58,237,0.12)", borderRadius: "var(--radius)", padding: "14px 20px", marginBottom: 32 },
  grid:         { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))", gap: 20 },
  card:         { cursor: "pointer", display: "flex", flexDirection: "column" },
  cardTop:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  emoji:        { fontSize: "1.8rem", background: "var(--primary-dim)", borderRadius: 10, padding: "7px 9px", lineHeight: 1 },
  nombre:       { fontSize: "1.05rem", fontWeight: 700, marginBottom: 6, lineHeight: 1.3, color: "var(--text)" },
  statsRow:     { display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1.5px solid var(--border-soft)" },
  loading:       { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0" },
  spinner:       { width: 36, height: 36, border: "3px solid rgba(124,58,237,0.15)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty:         { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", textAlign: "center" },
  filtrosRow:    { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 },
  filtroBtnBase: { padding: "7px 14px", borderRadius: "99px", fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.18s", display: "flex", alignItems: "center", gap: 4 },
};
