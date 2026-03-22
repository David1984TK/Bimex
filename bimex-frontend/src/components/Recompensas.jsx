import { useState, useEffect, useRef } from "react";
import { obtenerTodosLosProyectos, obtenerAportacion, stroopsAMXNe } from "../stellar/contrato";

// ── Niveles de confianza ──────────────────────────────────────────────────────
const NIVELES = [
  {
    id: "semilla",
    nombre: "Semilla",
    icono: "🌱",
    min: 0,
    max: 499,
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.07)",
    border: "rgba(124,58,237,0.18)",
    recompensas: [
      { id: "r1", nombre: "Badge Semilla", desc: "Tu primer paso en Bimex", icono: "🏅", umbral: 0,    desbloqueado: true  },
      { id: "r2", nombre: "Primer aporte", desc: "Contribuiste tu primer MXNe", icono: "💚", umbral: 1,    desbloqueado: false },
    ],
  },
  {
    id: "brote",
    nombre: "Brote",
    icono: "🌿",
    min: 500,
    max: 1999,
    color: "#059669",
    bg: "rgba(5,150,105,0.07)",
    border: "rgba(5,150,105,0.18)",
    recompensas: [
      { id: "r3", nombre: "Inversor Brote",    desc: "Invertiste 500+ MXNe en total",     icono: "🌿", umbral: 500,   desbloqueado: false },
      { id: "r4", nombre: "🎁 Regalo sorpresa", desc: "Desbloquea al llegar a 1,000 MXNe", icono: "🎁", umbral: 1000,  desbloqueado: false },
    ],
  },
  {
    id: "arbol",
    nombre: "Árbol",
    icono: "🌳",
    min: 2000,
    max: 9999,
    color: "#D97706",
    bg: "rgba(217,119,6,0.07)",
    border: "rgba(217,119,6,0.18)",
    recompensas: [
      { id: "r5", nombre: "Árbol de impacto", desc: "Invertiste 2,000+ MXNe",              icono: "🌳", umbral: 2000,  desbloqueado: false },
      { id: "r6", nombre: "🎁 Caja misteriosa", desc: "Acceso exclusivo a proyectos VIP",  icono: "📦", umbral: 5000,  desbloqueado: false },
    ],
  },
  {
    id: "selva",
    nombre: "Selva",
    icono: "🏔️",
    min: 10000,
    max: Infinity,
    color: "#4F46E5",
    bg: "rgba(79,70,229,0.07)",
    border: "rgba(79,70,229,0.18)",
    recompensas: [
      { id: "r7", nombre: "Guardián Selva",    desc: "Invertiste 10,000+ MXNe",             icono: "🏔️", umbral: 10000, desbloqueado: false },
      { id: "r8", nombre: "🎁 NFT exclusivo",  desc: "NFT de colección arte mexicano",       icono: "🎨", umbral: 20000, desbloqueado: false },
    ],
  },
];

function nivelActual(totalMXNe) {
  return NIVELES.slice().reverse().find(n => totalMXNe >= n.min) ?? NIVELES[0];
}

function nivelSiguiente(totalMXNe) {
  return NIVELES.find(n => n.min > totalMXNe) ?? null;
}

function calcularRecompensas(totalMXNe) {
  return NIVELES.flatMap(n =>
    n.recompensas.map(r => ({ ...r, desbloqueado: totalMXNe >= r.umbral }))
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Recompensas({ direccion }) {
  const [abierto,    setAbierto]    = useState(false);
  const [totalMXNe,  setTotalMXNe]  = useState(0);
  const [cargando,   setCargando]   = useState(true);
  const [sorpresa,   setSorpresa]   = useState(null);
  const panelRef = useRef(null);
  const botonRef = useRef(null);

  // Carga el total invertido sumando todas las aportaciones del usuario
  useEffect(() => {
    if (!direccion) return;
    (async () => {
      setCargando(true);
      try {
        const proyectos = await obtenerTodosLosProyectos();
        const aportaciones = await Promise.all(
          proyectos.map(p => obtenerAportacion(p.id, direccion).catch(() => BigInt(0)))
        );
        const totalStroops = aportaciones.reduce((s, a) => s + BigInt(a), BigInt(0));
        setTotalMXNe(Number(totalStroops) / 10_000_000);
      } catch {
        setTotalMXNe(0);
      } finally {
        setCargando(false);
      }
    })();
  }, [direccion]);

  // Cierra con Escape o clic fuera
  useEffect(() => {
    if (!abierto) return;
    function onKey(e) { if (e.key === "Escape") { setAbierto(false); botonRef.current?.focus(); } }
    function onOutside(e) { if (panelRef.current && !panelRef.current.contains(e.target) && !botonRef.current.contains(e.target)) setAbierto(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onOutside); };
  }, [abierto]);

  const nivel     = nivelActual(totalMXNe);
  const siguiente = nivelSiguiente(totalMXNe);
  const recompensas = calcularRecompensas(totalMXNe);
  const pct = siguiente
    ? Math.min(((totalMXNe - nivel.min) / (siguiente.min - nivel.min)) * 100, 100)
    : 100;
  const desbloqueadas = recompensas.filter(r => r.desbloqueado).length;

  function abrirSorpresa(r) {
    if (!r.desbloqueado) return;
    setSorpresa(r);
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Botón navbar */}
      <button
        ref={botonRef}
        onClick={() => setAbierto(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={`Recompensas — nivel ${nivel.nombre}, ${desbloqueadas} desbloqueadas`}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          background: abierto ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.22)",
          color: "#E9D5FF",
          padding: "7px 14px",
          borderRadius: 99,
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: "0.82rem",
          cursor: "pointer",
          transition: "all 0.18s",
          position: "relative",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: "1rem" }}>{nivel.icono}</span>
        <span>{nivel.nombre}</span>
        {desbloqueadas > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            background: "#F59E0B", color: "#1C1633",
            borderRadius: "50%", width: 18, height: 18,
            fontSize: "0.65rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #1E0A3C",
          }} aria-hidden="true">
            {desbloqueadas}
          </span>
        )}
      </button>

      {/* Panel de recompensas */}
      {abierto && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Panel de recompensas"
          style={st.panel}
        >
          {/* Header */}
          <div style={st.panelHeader}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Tus recompensas
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--text)", marginTop: 2 }}>
                Nivel {nivel.icono} {nivel.nombre}
              </div>
            </div>
            <button onClick={() => setAbierto(false)} aria-label="Cerrar panel de recompensas" style={st.cerrar}>×</button>
          </div>

          {/* Total invertido */}
          <div style={{ ...st.totalCard, background: nivel.bg, border: `1.5px solid ${nivel.border}` }}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total invertido en Bimex
            </div>
            {cargando ? (
              <div style={{ fontFamily: "'DM Mono'", fontSize: "1.6rem", color: nivel.color, marginTop: 4 }}>Cargando…</div>
            ) : (
              <div style={{ fontFamily: "'DM Mono'", fontSize: "1.6rem", color: nivel.color, fontWeight: 700, marginTop: 4 }}>
                {totalMXNe.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXNe
              </div>
            )}
          </div>

          {/* Barra de progreso al siguiente nivel */}
          {siguiente && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.75rem" }}>
                <span style={{ color: "var(--muted)" }}>Progreso al nivel {siguiente.icono} {siguiente.nombre}</span>
                <span style={{ color: nivel.color, fontWeight: 700, fontFamily: "'DM Mono'" }}>
                  {totalMXNe.toFixed(0)} / {siguiente.min.toLocaleString("es-MX")} MXNe
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso al siguiente nivel: ${pct.toFixed(0)}%`}
                style={{ height: 8, background: "rgba(124,58,237,0.10)", borderRadius: 99, overflow: "hidden" }}
              >
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${nivel.color}, #A78BFA)`, borderRadius: 99, transition: "width 0.6s ease" }} />
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }}>
                Te faltan {Math.max(0, siguiente.min - totalMXNe).toLocaleString("es-MX", { maximumFractionDigits: 2 })} MXNe para subir de nivel
              </p>
            </div>
          )}
          {!siguiente && (
            <div style={{ textAlign: "center", padding: "12px 0", marginBottom: 16 }}>
              <span style={{ fontSize: "1.4rem" }}>🏆</span>
              <p style={{ fontSize: "0.82rem", color: nivel.color, fontWeight: 700, marginTop: 4 }}>¡Nivel máximo alcanzado!</p>
            </div>
          )}

          {/* Grid de recompensas */}
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Recompensas ({desbloqueadas}/{recompensas.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {recompensas.map(r => (
              <button
                key={r.id}
                onClick={() => abrirSorpresa(r)}
                disabled={!r.desbloqueado}
                aria-label={r.desbloqueado ? `Ver recompensa: ${r.nombre}` : `Recompensa bloqueada: ${r.nombre}. Requiere ${r.umbral.toLocaleString("es-MX")} MXNe`}
                style={{
                  ...st.recompensaBtn,
                  opacity: r.desbloqueado ? 1 : 0.45,
                  cursor: r.desbloqueado ? "pointer" : "not-allowed",
                  border: r.desbloqueado ? "1.5px solid rgba(124,58,237,0.22)" : "1.5px dashed rgba(124,58,237,0.15)",
                  background: r.desbloqueado ? "var(--primary-dim)" : "var(--bg)",
                }}
              >
                <span style={{ fontSize: "1.4rem", marginBottom: 4, filter: r.desbloqueado ? "none" : "grayscale(1)" }}>{r.icono}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: r.desbloqueado ? "var(--text)" : "var(--muted)", lineHeight: 1.3, textAlign: "center" }}>
                  {r.desbloqueado ? r.nombre : "🔒 Bloqueado"}
                </span>
                {!r.desbloqueado && (
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 2 }}>
                    {r.umbral >= 1000
                      ? `${(r.umbral / 1000).toFixed(r.umbral % 1000 === 0 ? 0 : 1)}k MXNe`
                      : `${r.umbral} MXNe`}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Info */}
          <div style={{ marginTop: 16, padding: "10px 12px", background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(79,70,229,0.04))", borderRadius: "var(--radius-sm)", border: "1px solid rgba(124,58,237,0.10)" }}>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5, margin: 0 }}>
              💡 Las recompensas se calculan sobre el total de MXNe aportado en todos los proyectos Bimex. Los regalos sorpresa se envían a tu wallet Stellar.
            </p>
          </div>
        </div>
      )}

      {/* Modal de recompensa desbloqueada */}
      {sorpresa && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Recompensa desbloqueada: ${sorpresa.nombre}`}
          onClick={() => setSorpresa(null)}
        >
          <div className="modal" style={{ maxWidth: 360, textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>{sorpresa.icono}</div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>{sorpresa.nombre}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 20 }}>{sorpresa.desc}</p>
            <div style={{ padding: "14px", background: "var(--primary-dim)", border: "1.5px solid rgba(124,58,237,0.18)", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
              <p style={{ fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600, margin: 0 }}>
                ✅ Recompensa desbloqueada en tu perfil Bimex.<br/>
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>Los regalos físicos/NFT se gestionarán próximamente.</span>
              </p>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setSorpresa(null)}>
              ¡Genial! Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const st = {
  panel: {
    position: "absolute",
    top: "calc(100% + 12px)",
    right: 0,
    width: 340,
    background: "#fff",
    border: "1.5px solid rgba(124,58,237,0.14)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 12px 40px rgba(28,22,51,0.16), 0 4px 12px rgba(0,0,0,0.06)",
    zIndex: 200,
    animation: "slideUp 0.2s ease",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16,
  },
  cerrar: {
    background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem",
    cursor: "pointer", padding: "2px 6px", borderRadius: 6, lineHeight: 1,
  },
  totalCard: {
    borderRadius: 12, padding: "14px 16px", marginBottom: 16,
  },
  recompensaBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "14px 8px", borderRadius: 12,
    fontFamily: "Syne, sans-serif", transition: "all 0.18s",
    gap: 4,
  },
};
