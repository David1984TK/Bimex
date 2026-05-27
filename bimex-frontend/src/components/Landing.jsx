import { useTranslation } from "react-i18next";
import { LogoSVG } from "./App.icons";
import ConectarWallet from "./ConectarWallet";
import { useCetesRate } from "../hooks/useCetesRate";
import { useLiveStats } from "../hooks/useLiveStats";

const FEATURES = [
  {
    titulo: "Tu capital siempre es recuperable",
    desc: "Tu MXNe entra al smart contract y permanece ahí, protegido por código. Cuando el proyecto concluye, recuperas exactamente lo que aportaste.",
    color: "#1E3A5F", bg: "rgba(30,58,95,0.05)", border: "rgba(30,58,95,0.12)",
  },
  {
    titulo: "Doble rendimiento: CETES + AMM Stellar",
    desc: "Tu capital genera rendimiento en dos capas: CETES vía Etherfuse (deuda soberana mexicana) y fees del AMM de Stellar. El proyecto recibe ese rendimiento mientras tu capital permanece intacto.",
    color: "#16A34A", bg: "rgba(22,163,74,0.05)", border: "rgba(22,163,74,0.15)",
  },
  {
    titulo: "100% on-chain, sin intermediarios",
    desc: "Cada proyecto requiere documentos verificados almacenados en IPFS con referencia en blockchain. El código es público, auditable y autónomo.",
    color: "#D97706", bg: "rgba(217,119,6,0.05)", border: "rgba(217,119,6,0.15)",
  },
];

const PASOS = [
  { num: "01", titulo: "Conecta tu wallet", desc: "Abre Freighter en Stellar Testnet y conecta con un clic. Sin registro, sin KYC." },
  { num: "02", titulo: "Deposita MXNe en un proyecto", desc: "Tu capital entra al smart contract. Si el proyecto no alcanza su meta, se devuelve automáticamente." },
  { num: "03", titulo: "El rendimiento financia el proyecto", desc: "El yield (CETES + AMM) financia el proyecto mensualmente. Tu capital lo recuperas íntegro al finalizar." },
  { num: "04", titulo: "Recuperas todo más tu ganancia", desc: "Al cierre retiras tu capital original más el 5% de rendimiento acumulado. Recibes un certificado de impacto." },
];

export default function Landing({ autoConectar, onConectado, onTransparencia, onChangelog }) {
  const { t } = useTranslation();
  const liveStats = useLiveStats();
  const { rate: cetesRate, error: cetesError } = useCetesRate();

  const STATS_LIVE = [
    { valor: liveStats.totalProyectos, label: "Proyectos activos" },
    { valor: liveStats.totalBloqueado, label: "MXNe invertidos" },
    { valor: cetesRate ? `${cetesRate}%` : "9.45%", label: cetesError ? "APY CETES (ref.)" : "APY CETES hoy" },
  ];

  return (
    <div style={{ overflowX: "hidden", background: "var(--bg)" }}>
      <a href="#contenido-principal" className="skip-link">Saltar al contenido</a>

      {/* Navbar landing */}
      <nav aria-label="Navegación principal" className="navbar" style={{ position: "fixed", top: 0, left: 0, right: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <LogoSVG size={22} />
          <span className="navbar-logo">Bimex</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="navbar-hide-tablet" style={st.testnetBadge}>Testnet</span>
          <button
            onClick={onTransparencia}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.84rem", fontWeight: 500, color: "var(--navy)", padding: "8px 12px" }}
          >
            {t("nav.transparency")}
          </button>
          <ConectarWallet autoConectar={autoConectar} onConectado={onConectado} inNavbar />
        </div>
      </nav>

      {/* Hero */}
      <section
        id="contenido-principal"
        aria-labelledby="hero-titulo"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: 60 }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 40px 72px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
          <div>
            <div style={st.heroBadge}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
              Capital siempre recuperable
            </div>
            <h1 id="hero-titulo" style={st.heroH1}>
              Invierte. Impacta.<br />
              <span style={{ color: "var(--navy)" }}>Recupera todo.</span>
            </h1>
            <p style={st.heroDesc}>
              Tu capital genera rendimiento que financia proyectos sociales verificados.
              Al finalizar, recuperas el 100% de lo que depositaste — más tu ganancia.
            </p>
            <ConectarWallet autoConectar={autoConectar} onConectado={onConectado} />
            <p style={st.heroNote}>
              Requiere{" "}
              <a href="https://freighter.app" target="_blank" rel="noreferrer" style={{ color: "var(--navy)", fontWeight: 600 }}>
                Freighter Wallet
              </a>
              {" "}en Stellar Testnet
            </p>
          </div>

          {/* Yield card */}
          <div style={st.yieldCard}>
            <div style={st.yieldCardHead}>
              <p style={{ fontSize: "0.78rem", opacity: 0.7, marginBottom: 4 }}>Distribución del rendimiento</p>
              <p style={{ fontWeight: 600, fontSize: "0.98rem" }}>Yield total: ~13.45% anual</p>
            </div>
            {[
              { label: "Proyecto social", sub: "Financiamiento mensual", pct: "6.00%", color: "var(--green)" },
              { label: "Tu rendimiento",  sub: "Acumulado hasta el cierre", pct: "5.00%", color: "var(--navy)" },
              { label: "Plataforma Bimex", sub: "Operación y seguridad", pct: "2.45%", color: "var(--subtle)" },
            ].map(r => (
              <div key={r.label} style={st.yieldRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.color, flexShrink: 0, display: "inline-block" }} />
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 500, color: "var(--text)" }}>{r.label}</div>
                    <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{r.sub}</div>
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: r.color }}>{r.pct}</span>
              </div>
            ))}
            <div style={st.yieldTotal}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total distribuido</span>
              <strong style={{ fontSize: "1rem", color: "var(--navy)" }}>13.45%</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section aria-label="Estadísticas de la plataforma" className="landing-stats-bar landing-section">
        <div className="landing-stats-inner">
          {STATS_LIVE.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              <div className="landing-stats-item">
                <div style={{ fontWeight: 700, fontSize: "1.5rem", color: "#fff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{s.valor}</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 5 }}>{s.label}</div>
              </div>
              {i < STATS_LIVE.length - 1 && (
                <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        {cetesRate && (
          <div className="landing-cetes-row">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.7rem", background: "rgba(22,163,74,0.25)", color: "#86EFAC", fontWeight: 700, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                CETES hoy
              </span>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "#86EFAC" }}>{cetesRate}%</span>
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>vía Etherfuse</span>
            </div>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontWeight: 700, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                AMM Stellar
              </span>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "rgba(255,255,255,0.85)" }}>~4%</span>
            </div>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
              = ~{(cetesRate + 4).toFixed(2)}% APY total disponible
            </span>
          </div>
        )}
      </section>

      {/* Features */}
      <section aria-labelledby="features-titulo" className="landing-section" style={{ padding: "64px 40px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={st.sectionLabel}>Por que Bimex</div>
            <h2 id="features-titulo" style={st.sectionH2}>Crowdfunding sin perder tu capital</h2>
            <p style={st.sectionSub}>Lo peor que te puede pasar: salir exactamente como entraste.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.titulo} style={{ background: f.bg, border: `1px solid ${f.border}`, borderRadius: "var(--radius)", padding: "28px 24px" }}>
                <h3 style={{ fontWeight: 600, fontSize: "0.95rem", color: f.color, marginBottom: 12, lineHeight: 1.5 }}>{f.titulo}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section aria-labelledby="como-funciona-titulo" className="landing-section" style={{ padding: "64px 40px", background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={st.sectionLabel}>Como funciona</div>
            <h2 id="como-funciona-titulo" style={st.sectionH2}>Cuatro pasos, capital protegido</h2>
            <p style={st.sectionSub}>Sin registro, sin KYC, sin intermediarios.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {PASOS.map(p => (
              <div key={p.num} style={{ background: "var(--card)", padding: "28px 22px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--navy-dim)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.82rem", marginBottom: 14 }}>
                  {p.num}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>{p.titulo}</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.84rem", lineHeight: 1.65, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, padding: "28px 32px", background: "var(--navy)", borderRadius: "var(--radius)", textAlign: "center" }}>
            <p style={{ fontWeight: 600, fontSize: "1.05rem", color: "#fff", marginBottom: 6, lineHeight: 1.5 }}>
              Listo para apoyar un proyecto?
            </p>
            <p style={{ color: "rgba(255,255,255,0.60)", fontSize: "0.88rem", marginBottom: 22 }}>
              Conecta tu wallet y empieza. Tu capital siempre es recuperable al finalizar.
            </p>
            <ConectarWallet autoConectar={false} onConectado={onConectado} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={st.footer}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
          <LogoSVG size={20} light />
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "rgba(255,255,255,0.85)" }}>Bimex</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.78rem", marginBottom: 10 }}>
          Hack+ Alebrije · Stellar · CDMX 2025 · Construido con Soroban y MXNe
        </p>
        <button onClick={onChangelog} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", fontWeight: 500, padding: 0 }}>
          Novedades
        </button>
      </footer>
    </div>
  );
}

const st = {
  testnetBadge: {
    fontSize: "0.72rem", fontWeight: 600, color: "var(--amber)",
    textTransform: "uppercase", letterSpacing: "0.05em",
    background: "var(--amber-dim)", padding: "3px 10px",
    borderRadius: 99, border: "1px solid rgba(217,119,6,0.20)",
    whiteSpace: "nowrap",
  },
  heroBadge: {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: "var(--green-dim)", color: "var(--green)",
    border: "1px solid rgba(22,163,74,0.20)",
    padding: "5px 14px", borderRadius: 99,
    fontSize: "0.78rem", fontWeight: 600, marginBottom: 20,
    textTransform: "uppercase", letterSpacing: "0.03em",
  },
  heroH1: {
    fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700,
    color: "var(--text)", marginBottom: 18, lineHeight: 1.2,
  },
  heroDesc: {
    fontSize: "1rem", color: "var(--text2)",
    lineHeight: 1.75, marginBottom: 28, maxWidth: 440,
  },
  heroNote: { color: "var(--muted)", fontSize: "0.78rem", marginTop: 14 },
  yieldCard: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", overflow: "hidden",
  },
  yieldCardHead: {
    background: "var(--navy)", padding: "18px 22px", color: "#fff",
  },
  yieldRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "13px 22px", borderBottom: "1px solid var(--border)",
  },
  yieldTotal: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "13px 22px", background: "var(--bg)",
    borderTop: "2px solid var(--border)",
  },
  sectionLabel: {
    fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--green)", marginBottom: 10,
  },
  sectionH2: {
    fontSize: "clamp(1.3rem, 3vw, 1.7rem)", fontWeight: 700,
    color: "var(--text)", marginBottom: 8, lineHeight: 1.3,
  },
  sectionSub: { color: "var(--muted)", fontSize: "0.95rem", maxWidth: 480 },
  footer: {
    background: "var(--navy)", padding: "28px 40px", textAlign: "center",
  },
};
