import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LogoSVG, BtnFaucet, ToastContainer } from "./components/App.icons";
import Landing          from "./components/Landing";
import ListaProyectos   from "./components/ListaProyectos";
import CrearProyecto    from "./components/CrearProyecto";
import DetalleProyecto  from "./components/DetalleProyecto";
import MiCuenta         from "./components/MiCuenta";
import AdminPanel       from "./components/AdminPanel";
import Recompensas      from "./components/Recompensas";
import Transparencia    from "./components/Transparencia";
import Changelog        from "./components/Changelog";
import { parsearError } from "./utils/errores";
import useWalletConnection from "./hooks/useWalletConnection";
import "./i18n/index.js";
import "./index.css";

const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS ?? "GD2FLYXZMEGSSYZGC4LKFGCH6SOZR57UB64ECPEEJ4IEKAT6VZU3SLGS";



// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { t, i18n } = useTranslation();
  const { direccion, autoConectar, cerrandoSesion, manejarConectado, cerrarSesionWallet } = useWalletConnection();

  const [refrescar,      setRefrescar]      = useState(0);
  const [proyectoActivo, setProyectoActivo] = useState(null);
  const [modalCrear,     setModalCrear]     = useState(false);
  const [vistaActual,    setVistaActual]    = useState("proyectos");
  const [mostrandoTransparencia, setMostrandoTransparencia] = useState(false);
  const [mostrandoChangelog,     setMostrandoChangelog]     = useState(false);
  const [adminPanel,     setAdminPanel]     = useState(false);
  const [totalInvertido, setTotalInvertido] = useState(null);

  useEffect(() => {
    if (!direccion) {
      setProyectoActivo(null);
      setModalCrear(false);
      setVistaActual("proyectos");
      setAdminPanel(false);
    }
  }, [direccion]);

  // ── Toast system ───────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const quitarToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const agregarToast = useCallback((msg, tipo = "error") => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, tipo }]);
    setTimeout(() => quitarToast(id), 7000);
  }, [quitarToast]);

  const mostrarError = useCallback((err) => {
    agregarToast(parsearError(err), "error");
  }, [agregarToast]);

  const esAdmin = direccion === ADMIN_ADDRESS;

  function formatearDir(dir) {
    if (!dir) return "";
    return `${dir.slice(0, 5)}...${dir.slice(-4)}`;
  }

  function refrescarLista() { setRefrescar(r => r + 1); }

  if (mostrandoTransparencia) {
    return <Transparencia onVolver={() => setMostrandoTransparencia(false)} />;
  }
  if (mostrandoChangelog) {
    return (
      <div>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <button className="btn btn-ghost" onClick={() => setMostrandoChangelog(false)} style={{ fontSize: "0.84rem" }}>
            ← Volver
          </button>
        </div>
        <Changelog />
      </div>
    );
  }
  if (!direccion) {
    return <Landing autoConectar={autoConectar} onConectado={manejarConectado} onTransparencia={() => setMostrandoTransparencia(true)} onChangelog={() => setMostrandoChangelog(true)} />;
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={quitarToast} />
      <nav className="navbar" aria-label="Navegación principal">
        {/* Logo + Nav tabs agrupados a la izquierda */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 24 }}>
            <LogoSVG size={22} />
            <span className="navbar-logo">Bimex</span>
          </div>

          <div style={{ display: "flex", gap: 2, height: "100%", alignItems: "stretch" }}>
            <button
              onClick={() => { setProyectoActivo(null); setVistaActual("proyectos"); }}
              style={{
                ...st.navTab,
                color: (vistaActual === "proyectos" || proyectoActivo) ? "var(--navy)" : "var(--muted)",
                borderBottom: (vistaActual === "proyectos" || proyectoActivo) ? "2px solid var(--navy)" : "2px solid transparent",
              }}
            >
              {t("nav.projects")}
            </button>
            <button
              onClick={() => { setProyectoActivo(null); setVistaActual("micuenta"); }}
              style={{
                ...st.navTab,
                color: vistaActual === "micuenta" && !proyectoActivo ? "var(--navy)" : "var(--muted)",
                borderBottom: vistaActual === "micuenta" && !proyectoActivo ? "2px solid var(--navy)" : "2px solid transparent",
              }}
            >
              {t("nav.myAccount")}
            </button>
            <button
              onClick={() => { setProyectoActivo(null); setVistaActual("transparencia"); }}
              style={{
                ...st.navTab,
                color: vistaActual === "transparencia" && !proyectoActivo ? "var(--navy)" : "var(--muted)",
                borderBottom: vistaActual === "transparencia" && !proyectoActivo ? "2px solid var(--navy)" : "2px solid transparent",
              }}
            >
              {t("nav.transparency")}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <span className="navbar-hide-tablet" style={st.testnetBadge}>Testnet</span>

          <BtnFaucet direccion={direccion} />

          <button
            onClick={() => i18n.changeLanguage(i18n.language === "es" ? "en" : "es")}
            style={st.langBtn}
            aria-label="Switch language"
          >
            {t("lang.toggle")}
          </button>

          {esAdmin && (
            <button className="navbar-btn-admin" onClick={() => setAdminPanel(true)}>
              {t("nav.admin")}
            </button>
          )}

          <Recompensas direccion={direccion} refrescar={refrescar} totalInvertido={totalInvertido} />

          <div className="wallet-chip">
            <span className="wallet-dot" aria-hidden="true" />
            <span aria-label={`Wallet: ${direccion}`}>{formatearDir(direccion)}</span>
          </div>

          <button className="navbar-btn-salir" onClick={cerrarSesionWallet} disabled={cerrandoSesion}>
            {cerrandoSesion ? t("nav.loggingOut") : t("nav.logout")}
          </button>
        </div>
      </nav>

      <main id="contenido-principal">
        {proyectoActivo ? (
          <DetalleProyecto
            proyecto={proyectoActivo}
            direccion={direccion}
            onCerrar={() => { setProyectoActivo(null); refrescarLista(); }}
            onError={mostrarError}
            onToast={(msg) => agregarToast(msg, "success")}
          />
        ) : (
          <>
            {vistaActual === "proyectos" && (
              <ListaProyectos
                onSeleccionar={setProyectoActivo}
                onCrear={() => setModalCrear(true)}
                refrescar={refrescar}
                onError={mostrarError}
              />
            )}
            {vistaActual === "transparencia" && (
              <Transparencia />
            )}
            {vistaActual === "changelog" && (
              <Changelog />
            )}
            {vistaActual === "micuenta" && (
              <MiCuenta
                direccion={direccion}
                onVerProyecto={p => { setProyectoActivo(p); setVistaActual("proyectos"); }}
                onTotalInvertido={setTotalInvertido}
                onError={mostrarError}
              />
            )}
            {modalCrear && (
              <CrearProyecto
                direccion={direccion}
                onCerrar={() => setModalCrear(false)}
                onCreado={() => { setModalCrear(false); refrescarLista(); }}
                onError={mostrarError}
              />
            )}
            {adminPanel && (
              <AdminPanel
                direccion={direccion}
                adminAddress={ADMIN_ADDRESS}
                onCerrar={() => { setAdminPanel(false); refrescarLista(); }}
                onError={mostrarError}
              />
            )}
          </>
        )}
      </main>
      <footer style={{ ...st.footer, padding: "16px 40px" }}>
        <button
          onClick={() => { setProyectoActivo(null); setVistaActual("changelog"); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", fontWeight: 500, padding: "4px 8px" }}
        >
          Novedades
        </button>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.78rem" }}>·</span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}>Bimex · Stellar Testnet</span>
      </footer>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const st = {
  navTab: {
    padding: "6px 14px", borderRadius: 0, border: "none", borderBottom: "2px solid transparent",
    fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "0.88rem",
    cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    background: "transparent",
  },
  testnetBadge: {
    fontSize: "0.72rem", fontWeight: 600, color: "var(--amber)",
    textTransform: "uppercase", letterSpacing: "0.05em",
    background: "var(--amber-dim)", padding: "3px 10px",
    borderRadius: 99, border: "1px solid rgba(217,119,6,0.20)",
    whiteSpace: "nowrap",
  },
  langBtn: {
    background: "var(--bg)", border: "1px solid var(--border2)",
    color: "var(--text2)", padding: "6px 12px", borderRadius: "var(--radius-sm)",
    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
  },
  footer: {
    background: "var(--navy)", padding: "28px 40px", textAlign: "center",
  },
};
