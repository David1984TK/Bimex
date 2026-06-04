import { useState, useEffect, useCallback } from "react";
import { supabaseAdmin } from "../utils/supabaseAdmin";
import {
  obtenerTodosLosProyectos,
  aprobarProyectoConClave,
  rechazarProyectoConClave,
} from "../stellar/contrato";
import { parsearError } from "../utils/errores";
import { crearThrottle } from "../utils/throttle";

const throttle = crearThrottle(3000);

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginForm({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    if (!supabaseAdmin) { setError("Supabase no configurado."); return; }
    setCargando(true);
    setError(null);
    const { data, error: err } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (err) { setError(err.message); return; }
    onLogin(data.session);
  }

  return (
    <div style={s.page}>
      <form onSubmit={manejarSubmit} style={s.card}>
        <div style={s.logo}>⬡</div>
        <h1 style={s.h1}>Panel de control</h1>
        {error && <p style={s.error}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={s.input}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={s.input}
        />
        <button type="submit" disabled={cargando} style={s.btn}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ─── Paso de clave de firma ───────────────────────────────────────────────────

function KeyForm({ onKey }) {
  const [clave, setClave] = useState("");
  const [error, setError] = useState(null);

  function manejarSubmit(e) {
    e.preventDefault();
    if (clave.length < 56) { setError("Clave inválida — debe tener 56 caracteres."); return; }
    setError(null);
    onKey(clave.trim());
  }

  return (
    <div style={s.page}>
      <form onSubmit={manejarSubmit} style={s.card}>
        <h2 style={s.h2}>Clave de firma</h2>
        <p style={s.hint}>
          Ingresa la clave secreta de la cuenta admin del contrato.
          Solo se guarda en memoria durante esta sesión.
        </p>
        {error && <p style={s.error}>{error}</p>}
        <input
          type="password"
          placeholder="S…"
          value={clave}
          onChange={e => setClave(e.target.value)}
          required
          autoComplete="off"
          spellCheck={false}
          style={{ ...s.input, fontFamily: "monospace", letterSpacing: "0.05em" }}
        />
        <button type="submit" style={s.btn}>Continuar</button>
      </form>
    </div>
  );
}

// ─── Panel admin ──────────────────────────────────────────────────────────────

function PanelAdmin({ secretKey, onCerrarSesion }) {
  const [proyectos,  setProyectos]  = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [toast,      setToast]      = useState(null);
  const [motivoMap,  setMotivoMap]  = useState({});

  const mostrarToast = useCallback((msg, tipo = "success") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const todos = await obtenerTodosLosProyectos();
      setProyectos(todos.filter(p => p.estado === "EnRevision"));
    } catch (err) {
      mostrarToast(parsearError(err), "error");
    }
    setCargando(false);
  }, [mostrarToast]);

  useEffect(() => { cargar(); }, [cargar]);

  async function aprobar(id) {
    try {
      await throttle.ejecutar(async () => {
        await aprobarProyectoConClave(secretKey, id);
        mostrarToast(`Proyecto #${id} aprobado.`);
        await cargar();
      });
    } catch (err) {
      mostrarToast(parsearError(err), "error");
    }
  }

  async function rechazar(id) {
    const motivo = motivoMap[id]?.trim();
    if (!motivo) { mostrarToast("Escribe un motivo de rechazo.", "error"); return; }
    try {
      await throttle.ejecutar(async () => {
        await rechazarProyectoConClave(secretKey, id, motivo);
        mostrarToast(`Proyecto #${id} rechazado.`);
        await cargar();
      });
    } catch (err) {
      mostrarToast(parsearError(err), "error");
    }
  }

  return (
    <div style={s.panelPage}>
      <header style={s.panelHeader}>
        <span style={s.h1}>Panel de control</span>
        <button onClick={onCerrarSesion} style={s.linkBtn}>Cerrar sesión</button>
      </header>

      <main style={s.panelMain}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={s.h2}>Proyectos en revisión ({cargando ? "…" : proyectos.length})</h2>
          <button onClick={cargar} style={s.reloadBtn} title="Recargar">↻</button>
        </div>

        {cargando && <p style={{ color: "var(--muted)" }}>Cargando…</p>}

        {!cargando && proyectos.length === 0 && (
          <div style={s.vacio}>Sin proyectos pendientes ✓</div>
        )}

        {!cargando && proyectos.map(p => (
          <div key={p.id} style={s.card2}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={s.proyNombre}>#{p.id} — {p.nombre}</p>
                <p style={s.proyMeta}>Meta: {(Number(p.meta ?? 0) / 1e7).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXNe</p>
                {p.doc_cid && (
                  <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 4, wordBreak: "break-all" }}>
                    CID: {p.doc_cid}
                  </p>
                )}
              </div>
              <button onClick={() => aprobar(p.id)} style={s.btnAprobar}>Aprobar</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                type="text"
                placeholder="Motivo de rechazo…"
                value={motivoMap[p.id] ?? ""}
                onChange={e => setMotivoMap(m => ({ ...m, [p.id]: e.target.value }))}
                style={{ ...s.input, flex: 1, marginBottom: 0 }}
              />
              <button onClick={() => rechazar(p.id)} style={s.btnRechazar}>Rechazar</button>
            </div>
          </div>
        ))}
      </main>

      {toast && (
        <div style={{ ...s.toast, background: toast.tipo === "error" ? "#dc2626" : "#16a34a" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Componente raíz ──────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const [session,   setSession]   = useState(undefined);
  const [secretKey, setSecretKey] = useState(null);

  useEffect(() => {
    if (!supabaseAdmin) { setSession(null); return; }
    supabaseAdmin.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  async function cerrarSesion() {
    setSecretKey(null);
    await supabaseAdmin?.auth.signOut();
  }

  if (session === undefined) return null;
  if (!session) return <LoginForm onLogin={s => setSession(s)} />;
  if (!secretKey) return <KeyForm onKey={k => setSecretKey(k)} />;
  return <PanelAdmin secretKey={secretKey} onCerrarSesion={cerrarSesion} />;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", background: "var(--bg)", padding: 16,
  },
  card: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "36px 32px",
    width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 14,
  },
  logo: { fontSize: "2rem", textAlign: "center", color: "var(--navy)" },
  h1: { fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", margin: 0 },
  h2: { fontSize: "1rem", fontWeight: 600, color: "var(--text)", margin: 0 },
  hint: { fontSize: "0.84rem", color: "var(--muted)", margin: 0, lineHeight: 1.5 },
  error: { fontSize: "0.84rem", color: "#dc2626", background: "rgba(220,38,38,0.08)", padding: "8px 12px", borderRadius: "var(--radius-sm)", margin: 0 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid var(--border2)",
    borderRadius: "var(--radius-sm)", background: "var(--bg)", color: "var(--text)",
    fontSize: "0.9rem", boxSizing: "border-box", marginBottom: 0,
  },
  btn: {
    padding: "10px 0", background: "var(--navy)", color: "#fff",
    border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600,
    fontSize: "0.9rem", cursor: "pointer",
  },
  linkBtn: {
    background: "none", border: "none", color: "var(--muted)",
    fontSize: "0.84rem", cursor: "pointer", padding: "4px 8px",
  },
  panelPage: { minHeight: "100vh", background: "var(--bg)" },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 24px", background: "var(--navy)", color: "#fff",
  },
  panelMain: { maxWidth: 760, margin: "0 auto", padding: "28px 16px" },
  card2: {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "18px 20px", marginBottom: 14,
  },
  proyNombre: { fontWeight: 600, color: "var(--text)", margin: "0 0 4px" },
  proyMeta: { fontSize: "0.84rem", color: "var(--muted)", margin: 0 },
  btnAprobar: {
    padding: "8px 18px", background: "var(--green)", color: "#fff",
    border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600,
    fontSize: "0.84rem", cursor: "pointer", whiteSpace: "nowrap", alignSelf: "flex-start",
  },
  btnRechazar: {
    padding: "8px 18px", background: "#dc2626", color: "#fff",
    border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600,
    fontSize: "0.84rem", cursor: "pointer", whiteSpace: "nowrap",
  },
  reloadBtn: {
    background: "none", border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)",
    color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "4px 10px",
  },
  vacio: {
    padding: "32px", textAlign: "center", color: "var(--green)",
    background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)",
    borderRadius: "var(--radius)", fontWeight: 600,
  },
  toast: {
    position: "fixed", bottom: 24, right: 24, padding: "12px 20px",
    borderRadius: "var(--radius-sm)", color: "#fff", fontWeight: 600,
    fontSize: "0.88rem", zIndex: 9999, maxWidth: 340, boxShadow: "var(--shadow-lg)",
  },
};
