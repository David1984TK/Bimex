import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  obtenerTodosLosProyectos,
  obtenerAportacion,
  calcularYield,
  stroopsAMXNe,
} from "../stellar/contrato";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Config de estado ─────────────────────────────────────────────────────────

const ESTADO_CFG = {
  EtapaInicial: { label: "🌱 Etapa inicial", badgeClass: "badge-muted"  },
  EnProgreso:   { label: "● En progreso",    badgeClass: "badge-teal"   },
  Liberado:     { label: "✓ Liberado",       badgeClass: "badge-amber"  },
  Abandonado:   { label: "⚠️ Abandonado",    badgeClass: "badge-red"    },
  EnRevision:   { label: "⏳ En revisión",   badgeClass: null, customStyle: { background: "rgba(217,119,6,0.10)", color: "#D97706", border: "1px solid rgba(217,119,6,0.20)" } },
  Rechazado:    { label: "✗ Rechazado",      badgeClass: "badge-red"    },
};

function getBadgeCfg(estado) {
  return ESTADO_CFG[estado] ?? ESTADO_CFG.EtapaInicial;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(aportado, meta) {
  const a = Number(aportado ?? 0);
  const m = Number(meta ?? 0);
  return m > 0 ? Math.min((a / m) * 100, 100) : 0;
}

function puedeRetirar(estado) {
  return estado === "Liberado" || estado === "Abandonado";
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={estilos.loadingWrap} role="status" aria-live="polite" aria-label="Cargando">
      <div style={estilos.spinner} aria-hidden="true" />
      <p style={{ color: "var(--muted)", marginTop: 16, fontSize: "0.9rem" }}>Cargando…</p>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const cfg = getBadgeCfg(estado);
  if (cfg.customStyle) {
    return (
      <span className="badge" style={cfg.customStyle}>{cfg.label}</span>
    );
  }
  return <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>;
}

function StatItem({ label, valor, mono }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        fontSize: "0.68rem",
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        fontWeight: 700,
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? "'DM Mono', monospace" : "'Syne', sans-serif",
        fontWeight: 700,
        fontSize: "0.95rem",
        color: "var(--text2)",
      }}>
        {valor}
      </div>
    </div>
  );
}

// ─── Pestaña: Mis proyectos ───────────────────────────────────────────────────

function CardMiProyecto({ proyecto, onVerProyecto }) {
  const progreso = pct(proyecto.aportado, proyecto.meta);

  return (
    <article className="card" style={estilos.card}>
      {/* Header card */}
      <div style={estilos.cardTop}>
        <h3 style={estilos.cardTitulo}>{proyecto.nombre}</h3>
        <EstadoBadge estado={proyecto.estado} />
      </div>

      {/* Barra de progreso */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Financiamiento</span>
          <span style={{
            fontSize: "0.76rem",
            color: "var(--primary)",
            fontFamily: "'DM Mono', monospace",
            fontWeight: 700,
          }}>
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

      {/* Stats */}
      <div style={estilos.statsRow}>
        <div>
          <div style={estilos.statLabel}>Recaudado</div>
          <div style={estilos.statValor}>{stroopsAMXNe(proyecto.aportado)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={estilos.statLabel}>Meta</div>
          <div style={estilos.statValor}>{stroopsAMXNe(proyecto.meta)}</div>
        </div>
      </div>

      {/* CTA */}
      <button
        className="btn btn-secondary"
        style={{ width: "100%", marginTop: 16, justifyContent: "center" }}
        onClick={() => onVerProyecto(proyecto)}
        aria-label={`Ver detalles de ${proyecto.nombre}`}
      >
        Ver detalles →
      </button>
    </article>
  );
}

function TabMisProyectos({ proyectos, direccion, onVerProyecto }) {
  const misProyectos = proyectos.filter((p) => p.dueno === direccion);

  if (misProyectos.length === 0) {
    return (
      <div style={estilos.empty}>
        <span style={{ fontSize: "3rem" }}>🌱</span>
        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginTop: 16 }}>
          Aún no has creado proyectos
        </p>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginTop: 6 }}>
          Cuando crees un proyecto aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div style={estilos.grid} role="list" aria-label="Mis proyectos">
      {misProyectos.map((p) => (
        <CardMiProyecto key={p.id} proyecto={p} onVerProyecto={onVerProyecto} />
      ))}
    </div>
  );
}

// ─── Pestaña: Mis contribuciones ──────────────────────────────────────────────

function CardContribucion({ proyecto, aportacion, yieldAcum, onVerProyecto }) {
  const puedeRet = puedeRetirar(proyecto.estado);

  return (
    <article className="card" style={estilos.card}>
      {/* Header */}
      <div style={estilos.cardTop}>
        <h3 style={estilos.cardTitulo}>{proyecto.nombre}</h3>
        <EstadoBadge estado={proyecto.estado} />
      </div>

      {/* Métricas */}
      <div style={estilos.contribMetrics}>
        {/* Aportación */}
        <div style={estilos.metricBox}>
          <div style={estilos.metricLabel}>Tu aportación</div>
          <div style={estilos.metricValor}>{stroopsAMXNe(aportacion)}</div>
        </div>

        {/* Yield */}
        <div style={estilos.metricBox}>
          <div style={estilos.metricLabel}>Yield acumulado</div>
          <div style={{ ...estilos.metricValor, color: "var(--amber)" }}>
            {stroopsAMXNe(yieldAcum)}
          </div>
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={() => onVerProyecto(proyecto)}
          aria-label={`Ver detalles de ${proyecto.nombre}`}
        >
          Ver detalles
        </button>
        {puedeRet && (
          <button
            className="btn btn-amber"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onVerProyecto(proyecto)}
            aria-label={`Retirar fondos de ${proyecto.nombre}`}
          >
            Retirar
          </button>
        )}
      </div>
    </article>
  );
}

function TabMisContribuciones({ proyectos, direccion, onVerProyecto }) {
  const [contribuciones, setContribuciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (proyectos.length === 0) {
      setCargando(false);
      return;
    }

    async function cargarContribuciones() {
      setCargando(true);
      try {
        const resultados = await Promise.all(
          proyectos.map(async (p) => {
            const [aportacion, yieldAcum] = await Promise.all([
              obtenerAportacion(p.id, direccion),
              calcularYield(p.id, direccion),
            ]);
            return { proyecto: p, aportacion, yieldAcum };
          })
        );
        setContribuciones(resultados.filter((r) => r.aportacion > BigInt(0)));
      } catch (e) {
        console.error("Error cargando contribuciones:", e);
      } finally {
        setCargando(false);
      }
    }

    cargarContribuciones();
  }, [proyectos, direccion]);

  if (cargando) return <Spinner />;

  const totalInvertido = contribuciones.reduce(
    (acc, { aportacion }) => acc + BigInt(aportacion),
    BigInt(0)
  );

  if (contribuciones.length === 0) {
    return (
      <div style={estilos.empty}>
        <span style={{ fontSize: "3rem" }}>💸</span>
        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", marginTop: 16 }}>
          Aún no has apoyado ningún proyecto
        </p>
        <p style={{ fontSize: "0.86rem", color: "var(--muted)", marginTop: 6 }}>
          Explora los proyectos activos y contribuye para verlos aquí.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Total invertido */}
      <div style={estilos.totalInvertidoBanner}>
        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>💰</span>
        <div>
          <div style={{ fontSize: "0.74rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Total invertido
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "var(--primary)",
            marginTop: 2,
          }}>
            {stroopsAMXNe(totalInvertido)}
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: "var(--muted)" }}>
          en {contribuciones.length} proyecto{contribuciones.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Grid de contribuciones */}
      <div style={estilos.grid} role="list" aria-label="Mis contribuciones">
        {contribuciones.map(({ proyecto, aportacion, yieldAcum }) => (
          <CardContribucion
            key={proyecto.id}
            proyecto={proyecto}
            aportacion={aportacion}
            yieldAcum={yieldAcum}
            onVerProyecto={onVerProyecto}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Notificaciones ───────────────────────────────────────────────────────────

function NotificacionesPanel({ direccion }) {
  const [email,    setEmail]    = useState("");
  const [enabled,  setEnabled]  = useState(true);
  const [estado,   setEstado]   = useState("idle"); // idle | saving | ok | error
  const [cargado,  setCargado]  = useState(false);

  useEffect(() => {
    if (!direccion) return;
    supabase
      .from("user_notifications")
      .select("email, notifications_enabled")
      .eq("wallet_address", direccion)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setEmail(data.email); setEnabled(data.notifications_enabled); }
        setCargado(true);
      });
  }, [direccion]);

  async function guardar(e) {
    e.preventDefault();
    if (!email) return;
    setEstado("saving");
    const { error } = await supabase
      .from("user_notifications")
      .upsert({ wallet_address: direccion, email, notifications_enabled: enabled }, { onConflict: "wallet_address" });
    setEstado(error ? "error" : "ok");
    setTimeout(() => setEstado("idle"), 3000);
  }

  if (!cargado) return null;

  return (
    <div style={{ background: "#faf8ff", border: "1.5px solid rgba(124,58,237,0.12)", borderRadius: "var(--radius)", padding: "20px 24px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>🔔 Notificaciones por email</div>
          <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: 2 }}>Recibe alertas cuando tu proyecto sea aprobado, financiado o tenga yield disponible.</div>
        </div>
        {/* Toggle */}
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(v => !v)}
          style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: enabled ? "#7C3AED" : "#D1D5DB", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
          aria-label={enabled ? "Desactivar notificaciones" : "Activar notificaciones"}
        >
          <span style={{ position: "absolute", top: 3, left: enabled ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </button>
      </div>

      {enabled && (
        <form onSubmit={guardar} style={{ display: "flex", gap: 8 }}>
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "1.5px solid rgba(124,58,237,0.20)", fontFamily: "inherit", fontSize: "0.88rem", outline: "none", color: "var(--text)" }}
            aria-label="Email para notificaciones"
          />
          <button
            type="submit"
            disabled={estado === "saving"}
            className="btn btn-primary"
            style={{ whiteSpace: "nowrap", padding: "9px 18px" }}
          >
            {estado === "saving" ? "…" : estado === "ok" ? "✓ Guardado" : estado === "error" ? "✗ Error" : "Guardar"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MiCuenta({ direccion, onVerProyecto }) {
  const [tab, setTab] = useState("proyectos");
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const data = await obtenerTodosLosProyectos();
        setProyectos(data);
      } catch (e) {
        console.error("Error cargando proyectos:", e);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [direccion]);

  // Cálculos del summary strip (sólo con proyectos ya cargados)
  const numCreados = proyectos.filter((p) => p.dueno === direccion).length;

  // Contribuciones: conteo básico no requiere RPC adicional aquí —
  // se calcula dentro de TabMisContribuciones; exponemos el conteo desde el estado
  // de esa pestaña mediante un estado elevado ligero para el strip.
  const [numApoyados, setNumApoyados] = useState(null);
  const [totalInvertido, setTotalInvertido] = useState(null);

  useEffect(() => {
    if (proyectos.length === 0) {
      setNumApoyados(0);
      setTotalInvertido(BigInt(0));
      return;
    }

    let cancelado = false;

    async function calcularResumen() {
      try {
        const resultados = await Promise.all(
          proyectos.map((p) => obtenerAportacion(p.id, direccion))
        );
        if (cancelado) return;
        const positivos = resultados.filter((a) => a > BigInt(0));
        setNumApoyados(positivos.length);
        setTotalInvertido(positivos.reduce((acc, a) => acc + a, BigInt(0)));
      } catch (e) {
        console.error("Error calculando resumen:", e);
        if (!cancelado) {
          setNumApoyados(0);
          setTotalInvertido(BigInt(0));
        }
      }
    }

    calcularResumen();
    return () => { cancelado = true; };
  }, [proyectos, direccion]);

  const resumenListo = numApoyados !== null && totalInvertido !== null;

  return (
    <div style={estilos.contenedor}>

      {/* Header */}
      <div style={estilos.header}>
        <div>
          <h2 style={estilos.titulo}>Mi cuenta</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.86rem", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
            {direccion.slice(0, 8)}…{direccion.slice(-6)}
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div style={estilos.summaryStrip}>
        <StatItem
          label="Total invertido"
          valor={resumenListo ? stroopsAMXNe(totalInvertido) : "—"}
          mono
        />
        <div style={estilos.stripDivider} />
        <StatItem
          label="Proyectos creados"
          valor={cargando ? "—" : numCreados}
        />
        <div style={estilos.stripDivider} />
        <StatItem
          label="Proyectos apoyados"
          valor={resumenListo ? numApoyados : "—"}
        />
      </div>

      {/* Notificaciones */}
      <NotificacionesPanel direccion={direccion} />

      {/* Tabs */}
      <div style={estilos.tabsRow} role="tablist" aria-label="Secciones de mi cuenta">
        <button
          role="tab"
          aria-selected={tab === "proyectos"}
          aria-controls="panel-proyectos"
          id="tab-proyectos"
          onClick={() => setTab("proyectos")}
          style={{
            ...estilos.tabBtnBase,
            ...(tab === "proyectos" ? estilos.tabBtnActivo : estilos.tabBtnInactivo),
          }}
        >
          Mis proyectos
          {!cargando && numCreados > 0 && (
            <span style={{
              ...estilos.tabChip,
              background: tab === "proyectos" ? "rgba(255,255,255,0.22)" : "var(--primary-dim)",
              color:      tab === "proyectos" ? "#fff" : "var(--primary)",
            }}>
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
          style={{
            ...estilos.tabBtnBase,
            ...(tab === "contribuciones" ? estilos.tabBtnActivo : estilos.tabBtnInactivo),
          }}
        >
          Mis contribuciones
          {resumenListo && numApoyados > 0 && (
            <span style={{
              ...estilos.tabChip,
              background: tab === "contribuciones" ? "rgba(255,255,255,0.22)" : "var(--primary-dim)",
              color:      tab === "contribuciones" ? "#fff" : "var(--primary)",
            }}>
              {numApoyados}
            </span>
          )}
        </button>
      </div>

      {/* Paneles */}
      {cargando ? (
        <Spinner />
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
    fontSize: "1.9rem",
    color: "var(--text)",
    letterSpacing: "-0.02em",
    fontFamily: "'Syne', sans-serif",
  },

  // Summary strip
  summaryStrip: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1.5px solid rgba(124,58,237,0.12)",
    borderRadius: "var(--radius)",
    padding: "16px 24px",
    marginBottom: 28,
    boxShadow: "0 1px 6px rgba(124,58,237,0.06)",
    gap: 0,
  },
  stripDivider: {
    width: 1,
    height: 32,
    background: "rgba(124,58,237,0.10)",
    flexShrink: 0,
    margin: "0 20px",
  },

  // Tabs
  tabsRow: {
    display: "flex",
    gap: 8,
    marginBottom: 28,
    borderBottom: "2px solid rgba(124,58,237,0.08)",
    paddingBottom: 0,
  },
  tabBtnBase: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 18px",
    borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
    border: "none",
    borderBottom: "2.5px solid transparent",
    transition: "all 0.18s",
    marginBottom: -2,
  },
  tabBtnActivo: {
    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
    color: "#fff",
    borderBottomColor: "var(--primary)",
    boxShadow: "0 2px 10px rgba(124,58,237,0.22)",
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

  // Grid de cards
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(285px, 1fr))",
    gap: 20,
  },

  // Card individual
  card: {
    display: "flex",
    flexDirection: "column",
    cursor: "default",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 4,
  },
  cardTitulo: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text)",
    lineHeight: 1.3,
    fontFamily: "'Syne', sans-serif",
    flex: 1,
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1.5px solid var(--border-soft)",
  },
  statLabel: {
    fontSize: "0.70rem",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 700,
    marginBottom: 3,
  },
  statValor: {
    fontFamily: "'DM Mono', monospace",
    fontSize: "0.82rem",
    color: "var(--text2)",
    fontWeight: 600,
  },

  // Contribuciones
  contribMetrics: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1.5px solid var(--border-soft)",
  },
  metricBox: {
    background: "var(--primary-dim)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
  },
  metricLabel: {
    fontSize: "0.68rem",
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    fontWeight: 700,
    marginBottom: 4,
  },
  metricValor: {
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
    fontSize: "0.85rem",
    color: "var(--primary)",
  },

  // Banner total invertido
  totalInvertidoBanner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "linear-gradient(135deg, rgba(124,58,237,0.07), rgba(79,70,229,0.04))",
    border: "1.5px solid rgba(124,58,237,0.13)",
    borderRadius: "var(--radius)",
    padding: "16px 22px",
    marginBottom: 24,
  },

  // Estado vacío
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "80px 0",
    textAlign: "center",
  },

  // Carga
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "80px 0",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid rgba(124,58,237,0.15)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
