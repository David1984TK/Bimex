import { useState, useEffect } from "react";
import {
  isConnected, isAllowed, requestAccess, getAddress, getNetwork,
} from "@stellar/freighter-api";
import { parsearError } from "../utils/errores.js";
import { passkeyKit, CONFIG } from "../stellar/contrato.js";
import { Fingerprint } from "lucide-react";

export default function ConectarWallet({ onConectado, autoConectar = true, inNavbar = false }) {
  const [estado,    setEstado]    = useState("inactivo");
  const [direccion, setDireccion] = useState(null);
  const [error,     setError]     = useState("");
  const [nuevaPasskey, setNuevaPasskey] = useState(false);

  useEffect(() => {
    if (!autoConectar) return;
    (async () => {
      try {
        const { isConnected: conectado } = await isConnected();
        if (!conectado) return;
        const { isAllowed: permitido } = await isAllowed();
        if (!permitido) return;
        const { address } = await getAddress();
        if (address) { setDireccion(address); setEstado("conectado"); onConectado?.(address); }
      } catch (err) {
        console.warn("No se pudo restaurar la sesión:", err);
      }
    })();
  }, [autoConectar, onConectado]);

  async function conectarConPasskey() {
    setEstado("verificando"); setError("");
    try {
      const rpId = window.location.hostname === "localhost" ? "localhost" : window.location.hostname;
      let res;
      try {
        // Intentar iniciar sesión (autenticar)
        res = await passkeyKit.connectWallet({ rpId });
      } catch (err) {
        // Solo crear si el error indica "no hay credencial", no cualquier error
        if (err.name === "NotAllowedError" || err.message?.includes("no credential")) {
          res = await passkeyKit.createWallet("Bimex", "usuario-bimex", { rpId });
          setNuevaPasskey(true);
        } else {
          throw err; // propagar el resto de errores
        }
      }
      const address = res.contractId;
      setDireccion(address); setEstado("conectado"); onConectado?.(address);
    } catch (e) {
      setError(e.message || "Error al autenticar con biometría");
      setEstado("error");
    }
  }

  async function conectar() {
    setEstado("verificando"); setError("");
    try {
      const { isConnected: conectado } = await isConnected();
      if (!conectado) { setEstado("sin_extension"); return; }
      await requestAccess();
      const { networkPassphrase } = await getNetwork();
      if (!networkPassphrase) { setError("Freighter no devolvió la red activa. Asegúrate de que esté desbloqueado."); setEstado("error"); return; }
      if (networkPassphrase !== CONFIG.NETWORK_PASSPHRASE) { setEstado("red_incorrecta"); return; }
      const { address } = await getAddress();
      if (!address || address.length < 10) {
        setError("No se pudo obtener la dirección de la wallet. Intenta de nuevo.");
        setEstado("error");
        return;
      }
      setDireccion(address); setEstado("conectado"); onConectado?.(address);
    } catch (e) {
      setError(parsearError(e));
      setEstado("error");
    }
  }

  if (estado === "conectado") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--navy-dim)",
        border: "1.5px solid rgba(30,58,95,0.20)",
        padding: inNavbar ? "6px 14px" : "10px 18px",
        borderRadius: 99,
        width: "fit-content"
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--green)", flexShrink: 0,
        }} />
        <span style={{ fontFamily: "monospace", fontSize: inNavbar ? 12 : 14, color: "var(--navy)", fontWeight: 600 }}>
          {direccion && direccion.length >= 8 ? `${direccion.slice(0, 4)}…${direccion.slice(-4)}` : direccion}
        </span>
      </div>
      {nuevaPasskey && !inNavbar && (
        <p style={{ color: "var(--amber)", fontSize: "0.82rem", margin: 0, padding: "10px", background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", maxWidth: 320 }}>
          <strong>Nota:</strong> Tu nueva Smart Wallet necesita fondearse con MXNe. Contáctanos para enviarte tokens y establecer la trustline inicial.
        </p>
      )}
    </div>
  );

  const verificando = estado === "verificando";

  if (inNavbar) {
    return (
      <button
        onClick={conectar}
        disabled={verificando}
        className="btn btn-primary"
        style={{ padding: "8px 20px", fontSize: "0.84rem", opacity: verificando ? 0.65 : 1 }}
      >
        {verificando ? "Conectando…" : "Conectar"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%" }}>
        <button
          onClick={conectarConPasskey}
          disabled={verificando}
          className="btn btn-primary"
          style={{ flex: 1, padding: "14px 20px", fontSize: "0.95rem", opacity: verificando ? 0.65 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--navy)" }}
        >
          <Fingerprint size={18} />
          {verificando ? "Conectando…" : "Huella / Face ID"}
        </button>
        <button
          onClick={conectar}
          disabled={verificando}
          className="btn"
          style={{ flex: 1, padding: "14px 20px", fontSize: "0.95rem", opacity: verificando ? 0.65 : 1, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Freighter
        </button>
      </div>

      {estado === "sin_extension" && (
        <p style={{ color: "var(--amber)", fontSize: "0.82rem", margin: 0, marginTop: 8 }}>
          Freighter no está instalado.{" "}
          <a href="https://freighter.app" target="_blank" rel="noreferrer"
             style={{ color: "var(--navy)", fontWeight: 600 }}>
            Instalar →
          </a>
        </p>
      )}
      {estado === "red_incorrecta" && (
        <p style={{ color: "var(--amber)", fontSize: "0.82rem", margin: 0 }}>
          Cambia Freighter a <strong>Testnet</strong>
        </p>
      )}
      {estado === "error" && (
        <p style={{ color: "var(--error, #DC2626)", fontSize: "0.82rem", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
