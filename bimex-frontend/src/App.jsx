import { useState, useEffect } from "react";
import { setAllowed } from "@stellar/freighter-api";
import ConectarWallet   from "./components/ConectarWallet";
import ListaProyectos   from "./components/ListaProyectos";
import CrearProyecto    from "./components/CrearProyecto";
import DetalleProyecto  from "./components/DetalleProyecto";
import MiCuenta         from "./components/MiCuenta";
import AdminPanel       from "./components/AdminPanel";
import Recompensas      from "./components/Recompensas";
import { getStorage }   from "./utils/storage";
import { obtenerTotalProyectos, obtenerTodosLosProyectos, stroopsAMXNe, mintearMXNePrueba } from "./stellar/contrato";
import { useCetesRate } from "./hooks/useCetesRate";
import "./index.css";

const KEY_SESION_WALLET = "bimex.wallet.session";
const storageSesion     = getStorage("session");
const ADMIN_ADDRESS     = import.meta.env.VITE_ADMIN_ADDRESS ?? "GD2FLYXZMEGSSYZGC4LKFGCH6SOZR57UB64ECPEEJ4IEKAT6VZU3SLGS";

function leerAutoConectarInicial() {
  return storageSesion.getItem(KEY_SESION_WALLET) === "1";
}

// ── Logo SVG (fuera del componente para HMR) ────────────────────────────────
function LogoSVG({ size = 36, light = false }) {
  const c  = light ? "#C4B5FD" : "#7C3AED";
  const c2 = "#A78BFA";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="8" cy="11" r="3.5" stroke={c}  strokeWidth="1.8"/>
      <circle cx="8" cy="20" r="3.5" stroke={c}  strokeWidth="1.8"/>
      <circle cx="8" cy="29" r="3.5" stroke={c}  strokeWidth="1.8"/>
      <line x1="11.5" y1="11" x2="18" y2="11" stroke={c}  strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="11.5" y1="20" x2="18" y2="15" stroke={c2} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="11.5" y1="29" x2="18" y2="29" stroke={c2} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ── Datos estáticos de landing ──────────────────────────────────────────────
const FEATURES = [
  {
    titulo: "Tu capital siempre es recuperable",
    desc: "Tu MXNe entra al smart contract y permanece ahí, protegido por código. Cuando el proyecto concluye, recuperas exactamente lo que aportaste. El rendimiento es del proyecto, el capital es tuyo.",
    color: "#7C3AED", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.15)",
  },
  {
    titulo: "Doble rendimiento: CETES + AMM Stellar",
    desc: "Tu capital genera rendimiento en dos capas: CETES vía Etherfuse (deuda soberana mexicana) y fees del AMM de Stellar. El creador del proyecto recibe ese rendimiento mientras tú mantienes tu capital intacto.",
    color: "#D97706", bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.18)",
  },
  {
    titulo: "100% on-chain, sin intermediarios",
    desc: "Cada proyecto requiere documentos verificados con SHA-256 almacenado en la blockchain. El código es público, auditable y autónomo. Nadie puede acceder a tu capital fuera del contrato.",
    color: "#4F46E5", bg: "rgba(79,70,229,0.06)", border: "rgba(79,70,229,0.15)",
  },
];

const PASOS = [
  { num: "01", titulo: "Conecta tu wallet", desc: "Abre Freighter en Stellar Testnet y conecta con un clic. Sin registro, sin KYC, sin que nadie te llame.", color: "#7C3AED" },
  { num: "02", titulo: "Deposita MXNe en un proyecto", desc: "Tu capital entra al smart contract y permanece ahí. Cuando el proyecto concluye, recuperas exactamente lo que depositaste.", color: "#4F46E5" },
  { num: "03", titulo: "El rendimiento financia el proyecto", desc: "Cada momento que tu capital está dentro, acumula rendimiento (CETES + AMM) que va al creador del proyecto. Tu aportación la recuperas íntegra al finalizar.", color: "#D97706" },
];

// ── Hook: estadísticas en vivo del contrato ────────────────────────────────
function useLiveStats() {
  const [stats, setStats] = useState({ totalProyectos: "—", totalBloqueado: "—", enProgreso: "—" });
  useEffect(() => {
    obtenerTodosLosProyectos()
      .then(proyectos => {
        const totalBloqueado = proyectos.reduce((s, p) => s + BigInt(p.aportado ?? 0), BigInt(0));
        const enProgreso = proyectos.filter(p => p.estado === "EnProgreso").length;
        setStats({
          totalProyectos: proyectos.length.toString(),
          totalBloqueado: stroopsAMXNe(totalBloqueado),
          enProgreso: enProgreso.toString(),
        });
      })
      .catch(() => {});
  }, []);
  return stats;
}

// ── Botón faucet ────────────────────────────────────────────────────────────
function BtnFaucet({ direccion }) {
  const [estado, setEstado] = useState("idle"); // idle | loading | ok | error

  async function pedir() {
    setEstado("loading");
    try {
      await mintearMXNePrueba(direccion);
      setEstado("ok");
      setTimeout(() => setEstado("idle"), 4000);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado("idle"), 3000);
    }
  }

  const labels = { idle: "100 MXNe", loading: "…", ok: "✓", error: "✗" };
  const colors = { idle: "rgba(255,255,255,0.12)", loading: "rgba(255,255,255,0.08)", ok: "rgba(34,197,94,0.25)", error: "rgba(239,68,68,0.25)" };

  return (
    <button
      onClick={pedir}
      disabled={estado === "loading"}
      title="Obtener 100 MXNe de prueba (solo testnet)"
      style={{
        background: colors[estado], border: "1px solid rgba(255,255,255,0.20)",
        color: "#E9D5FF", padding: "6px 14px", borderRadius: 8,
        fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "0.78rem",
        cursor: estado === "loading" ? "not-allowed" : "pointer",
        transition: "all 0.2s", whiteSpace: "nowrap",
      }}
    >
      {labels[estado]}
    </button>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [refrescar,      setRefrescar]      = useState(0);
  const [direccion,      setDireccion]      = useState(null);
  const [proyectoActivo, setProyectoActivo] = useState(null);
  const [modalCrear,     setModalCrear]     = useState(false);
  const [vistaActual,    setVistaActual]    = useState("proyectos"); // "proyectos" | "micuenta"
  const [adminPanel,     setAdminPanel]     = useState(false);
  const [autoConectar,   setAutoConectar]   = useState(leerAutoConectarInicial);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [totalInvertido, setTotalInvertido] = useState(null);

  const esAdmin = direccion === ADMIN_ADDRESS;

  function formatearDir(dir) {
    if (!dir) return "";
    return `${dir.slice(0, 5)}...${dir.slice(-4)}`;
  }

  function desconectarLocal() {
    storageSesion.removeItem(KEY_SESION_WALLET);
    setAutoConectar(false);
    setDireccion(null);
    setProyectoActivo(null);
    setModalCrear(false);
    setVistaActual("proyectos");
    setAdminPanel(false);
  }

  async function cerrarSesionWallet() {
    setCerrandoSesion(true);
    try { await setAllowed(false); } catch {}
    finally { desconectarLocal(); setCerrandoSesion(false); }
  }

  function manejarConectado(addr) {
    if (addr) {
      storageSesion.setItem(KEY_SESION_WALLET, "1");
      setDireccion(addr);
      setAutoConectar(true);
    } else {
      desconectarLocal();
    }
  }

  function refrescarLista() { setRefrescar(r => r + 1); }

  // ── PANTALLA: Landing ──────────────────────────────────────
  if (!direccion) {
    return <Landing autoConectar={autoConectar} onConectado={manejarConectado} />;
  }

  // ── PANTALLA: Dashboard ────────────────────────────────────
  return (
    <div>
      <nav className="navbar" aria-label="Navegación principal">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoSVG size={24} light />
          <span className="navbar-logo">Bimex</span>
        </div>

        {/* Tabs de navegación */}
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", padding: "4px" }}>
          <button
            onClick={() => setVistaActual("proyectos")}
            style={{ ...st.navTab, background: vistaActual === "proyectos" ? "rgba(255,255,255,0.15)" : "transparent", color: vistaActual === "proyectos" ? "#fff" : "rgba(255,255,255,0.55)" }}
          >
            Proyectos
          </button>
          <button
            onClick={() => setVistaActual("micuenta")}
            style={{ ...st.navTab, background: vistaActual === "micuenta" ? "rgba(255,255,255,0.15)" : "transparent", color: vistaActual === "micuenta" ? "#fff" : "rgba(255,255,255,0.55)" }}
          >
            Mi cuenta
          </button>
        </div>

        <div className="navbar-actions">
          <span className="navbar-hide-tablet" style={st.testnetBadge}>⚡ Testnet</span>

          {/* Faucet */}
          <BtnFaucet direccion={direccion} />

          {/* Admin panel */}
          {esAdmin && (
            <button className="navbar-btn-admin"
              onClick={() => setAdminPanel(true)}
            >
              Admin
            </button>
          )}

          <Recompensas direccion={direccion} refrescar={refrescar} totalInvertido={totalInvertido} />

          <div className="wallet-chip">
            <span className="wallet-dot" aria-hidden="true" />
            <span aria-label={`Wallet conectada: ${direccion}`}>{formatearDir(direccion)}</span>
          </div>

          <button className="navbar-btn-salir"
            onClick={cerrarSesionWallet}
            disabled={cerrandoSesion}
          >
            {cerrandoSesion ? "..." : "Salir"}
          </button>
        </div>
      </nav>

      <main id="contenido-principal">
        {vistaActual === "proyectos" && (
          <ListaProyectos
            onSeleccionar={setProyectoActivo}
            onCrear={() => setModalCrear(true)}
            refrescar={refrescar}
          />
        )}

        {vistaActual === "micuenta" && (
          <MiCuenta
            direccion={direccion}
            onVerProyecto={p => { setProyectoActivo(p); setVistaActual("proyectos"); }}
            onTotalInvertido={setTotalInvertido}
          />
        )}

        {proyectoActivo && (
          <DetalleProyecto
            proyecto={proyectoActivo}
            direccion={direccion}
            onCerrar={() => { setProyectoActivo(null); refrescarLista(); }}
          />
        )}

        {modalCrear && (
          <CrearProyecto
            direccion={direccion}
            onCerrar={() => setModalCrear(false)}
            onCreado={() => { setModalCrear(false); refrescarLista(); }}
          />
        )}

        {adminPanel && (
          <AdminPanel
            direccion={direccion}
            adminAddress={ADMIN_ADDRESS}
            onCerrar={() => { setAdminPanel(false); refrescarLista(); }}
          />
        )}
      </main>
    </div>
  );
}

// ── Landing page (componente separado para limpiar App) ───────────────────
function Landing({ autoConectar, onConectado }) {
  const liveStats = useLiveStats();
  const { rate: cetesRate } = useCetesRate();

  const STATS_LIVE = [
    { valor: liveStats.totalProyectos, label: "Proyectos activos" },
    { valor: liveStats.totalBloqueado, label: "MXNe invertidos" },
    { valor: cetesRate ? `${cetesRate}%` : "9.45%", label: "APY CETES hoy" },
  ];

  return (
    <div style={{ overflowX: "hidden", background: "#1E0A3C" }}>
      <a href="#contenido-principal" className="skip-link">Saltar al contenido</a>

      {/* Navbar */}
      <nav aria-label="Navegación principal" style={st.navbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoSVG size={28} />
          <span style={st.navbarLogo}>Bimex</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={st.testnetBadgeDark}>⚡ Testnet</span>
          <ConectarWallet autoConectar={autoConectar} onConectado={onConectado} />
        </div>
      </nav>

      {/* Hero */}
      <section id="contenido-principal" aria-labelledby="hero-titulo" style={st.hero}>
        <div style={st.heroBlobA} aria-hidden="true" />
        <div style={st.heroBlobB} aria-hidden="true" />

        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={st.heroBadge}>
            <span style={st.heroBadgeDot} />
            Construido sobre Stellar · Soroban Testnet
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
            <LogoSVG size={56} />
            <h1 style={st.heroH1}>Bimex</h1>
          </div>

          <p id="hero-titulo" style={st.heroTagline}>
            Crowdfunding de impacto social<br/>
            <span style={{ color: "var(--primary)" }}>donde tu capital siempre regresa</span>
          </p>
          <p style={st.heroDesc}>
            Tu capital trabaja para México mientras apoyas proyectos de impacto real.
            El contrato lo custodia — completamente autónomo y auditable.
          </p>

          <ConectarWallet autoConectar={autoConectar} onConectado={onConectado} />

          <p style={st.heroNote}>
            Requiere{" "}
            <a href="https://freighter.app" target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: 600 }}>
              Freighter Wallet
            </a>
            {" "}en Stellar Testnet
          </p>
        </div>
      </section>

      {/* Stats bar — en vivo */}
      <section aria-label="Estadísticas en vivo de la plataforma" className="landing-stats-bar landing-section">
        <div className="landing-stats-inner">
          {STATS_LIVE.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              <div className="landing-stats-item">
                <div style={st.statsValor}>{s.valor}</div>
                <div style={st.statsLabel}>{s.label}</div>
              </div>
              {i < STATS_LIVE.length - 1 && (
                <div style={{ width: 1, height: 40, background: "rgba(196,181,253,0.20)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        {/* CETES rate — integrado en la barra de stats */}
        {cetesRate && (
          <div className="landing-cetes-row">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.7rem", background: "rgba(5,150,105,0.25)", color: "#34D399", fontWeight: 700, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                CETES hoy
              </span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#6EE7B7" }}>
                {cetesRate}%
              </span>
              <span style={{ fontSize: "0.78rem", color: "rgba(196,181,253,0.60)" }}>vía Etherfuse</span>
            </div>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(196,181,253,0.30)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.7rem", background: "rgba(139,92,246,0.25)", color: "#C4B5FD", fontWeight: 700, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                AMM Stellar
              </span>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#C4B5FD" }}>
                ~4%
              </span>
            </div>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(196,181,253,0.30)" }} />
            <span style={{ fontSize: "0.82rem", color: "rgba(196,181,253,0.80)", fontWeight: 600 }}>
              = ~{(cetesRate + 4).toFixed(2)}% APY total para el proyecto
            </span>
          </div>
        )}
      </section>

      {/* Features */}
      <section aria-labelledby="features-titulo" className="landing-section" style={{ padding: "64px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.10em", textTransform: "uppercase", background: "var(--primary-dim)", padding: "4px 14px", borderRadius: 99, display: "inline-block", marginBottom: 14 }}>
              ¿Por qué Bimex?
            </span>
            <h2 id="features-titulo" style={st.sectionH2}>Crowdfunding sin perder tu capital</h2>
            <p style={st.sectionSub}>Lo peor que te puede pasar: salir exactamente como entraste.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28 }}>
            {FEATURES.map(f => (
              <div key={f.titulo} style={{ background: f.bg, border: `1.5px solid ${f.border}`, borderRadius: 20, padding: "36px 32px" }}>
                <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.05rem", color: f.color, marginBottom: 14, lineHeight: 1.55 }}>{f.titulo}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.91rem", lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="como-funciona-titulo" className="landing-section" style={{ padding: "64px 24px", background: "linear-gradient(160deg, #faf8ff 0%, #f3f0ff 100%)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", letterSpacing: "0.10em", textTransform: "uppercase", background: "var(--primary-dim)", padding: "4px 14px", borderRadius: 99, display: "inline-block", marginBottom: 14 }}>
              ¿Cómo funciona?
            </span>
            <h2 id="como-funciona-titulo" style={st.sectionH2}>Tres pasos, capital protegido</h2>
            <p style={st.sectionSub}>Sin registro, sin KYC, sin que nadie te llame.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PASOS.map(p => (
              <div key={p.num} style={{ display: "flex", gap: 28, alignItems: "flex-start", background: "#fff", border: "1.5px solid rgba(124,58,237,0.10)", borderRadius: 18, padding: "28px 32px", boxShadow: "0 2px 16px rgba(124,58,237,0.06)" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "2rem", color: p.color, opacity: 0.18, lineHeight: 1, flexShrink: 0, width: 52, paddingTop: 4 }}>{p.num}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#1C1633", marginBottom: 8, lineHeight: 1.5 }}>{p.titulo}</h3>
                  <p style={{ color: "var(--muted)", fontSize: "0.91rem", lineHeight: 1.8, margin: 0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA al final */}
          <div style={{ textAlign: "center", marginTop: 40, padding: "36px 32px", background: "#fff", borderRadius: 20, border: "1.5px solid rgba(124,58,237,0.12)", boxShadow: "0 4px 24px rgba(124,58,237,0.08)" }}>
            <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.15rem", color: "#1C1633", marginBottom: 8, lineHeight: 1.5 }}>
              ¿Listo para apoyar un proyecto?
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24 }}>
              Conecta tu wallet y empieza. Tu capital siempre es recuperable al finalizar el proyecto.
            </p>
            <ConectarWallet autoConectar={false} onConectado={onConectado} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={st.footer}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <LogoSVG size={22} light />
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#C4B5FD" }}>Bimex</span>
        </div>
        <p style={{ color: "rgba(196,181,253,0.55)", fontSize: "0.78rem" }}>
          Hack+ Alebrije · Stellar · CDMX 2025 · Construido con Soroban &amp; MXNe
        </p>
      </footer>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const st = {
  navbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 48px", height: 64,
    background: "linear-gradient(135deg, #1E0A3C 0%, #2D1B69 100%)",
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
    boxShadow: "0 2px 20px rgba(28,22,51,0.22)",
  },
  navTab: {
    padding: "6px 14px", borderRadius: 7, border: "none",
    fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: "0.8rem",
    cursor: "pointer", transition: "all 0.18s", whiteSpace: "nowrap",
  },
  navbarLogo: {
    fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.3rem",
    background: "linear-gradient(135deg, #C4B5FD, #fff)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
    letterSpacing: "-0.02em",
  },
  testnetBadge: {
    fontSize: "0.72rem", fontWeight: 700, color: "#FCD34D", letterSpacing: "0.06em",
    textTransform: "uppercase", background: "rgba(255,255,255,0.10)",
    padding: "4px 10px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.18)",
    whiteSpace: "nowrap",
  },
  testnetBadgeDark: {
    fontSize: "0.72rem", fontWeight: 700, color: "#FCD34D", letterSpacing: "0.06em",
    textTransform: "uppercase", background: "rgba(255,255,255,0.10)",
    padding: "4px 12px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.18)",
  },
  hero: {
    position: "relative", overflow: "hidden",
    background: "linear-gradient(160deg, #faf8ff 0%, #f0ebff 50%, #e8e0ff 100%)",
    padding: "144px 24px 64px", textAlign: "center",
    maxWidth: "100%",
  },
  heroBlobA: { position: "absolute", top: -100, right: 0, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", pointerEvents: "none" },
  heroBlobB: { position: "absolute", bottom: -60, left: 0, width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%)", pointerEvents: "none" },
  heroBadge: { display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid rgba(124,58,237,0.20)", borderRadius: 99, padding: "6px 16px", fontSize: "0.78rem", fontWeight: 700, color: "var(--primary)", marginBottom: 28, boxShadow: "0 2px 12px rgba(124,58,237,0.10)" },
  heroBadgeDot: { width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", display: "inline-block" },
  heroH1: { fontFamily: "Syne, sans-serif", fontSize: "clamp(3rem, 8vw, 5rem)", fontWeight: 800, margin: 0, lineHeight: 1.05, background: "linear-gradient(135deg, #4C1D95, #7C3AED, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.02em" },
  heroTagline: { fontSize: "clamp(1.05rem, 2.8vw, 1.3rem)", fontWeight: 700, color: "#1C1633", marginBottom: 16, lineHeight: 1.5 },
  heroDesc: { fontSize: "0.98rem", color: "var(--muted)", maxWidth: 460, margin: "0 auto 44px", lineHeight: 1.8 },
  heroNote: { color: "var(--muted)", fontSize: "0.75rem", marginTop: 16 },
  statsBar: { background: "linear-gradient(135deg, #1E0A3C 0%, #2D1B69 100%)", padding: "40px 48px" },
  statsInner: { maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 0 },
  statsValor: { fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "#C4B5FD", letterSpacing: "-0.01em", lineHeight: 1.2 },
  statsLabel: { fontSize: "0.72rem", color: "rgba(196,181,253,0.60)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 },
  sectionH2: { fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, color: "#1C1633", letterSpacing: "-0.01em", marginBottom: 12, lineHeight: 1.35 },
  sectionSub: { color: "var(--muted)", fontSize: "1rem", maxWidth: 480, margin: "0 auto" },
  footer: { background: "linear-gradient(135deg, #1E0A3C 0%, #2D1B69 100%)", padding: "32px 48px", textAlign: "center" },
};
