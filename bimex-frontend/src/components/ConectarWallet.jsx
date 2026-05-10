import { useState, useEffect } from "react";
import {
  isConnected, isAllowed, requestAccess, getAddress, getNetwork,
} from "@stellar/freighter-api";
import { CONFIG } from "../stellar/contrato";
import { parsearError } from "../utils/errores.js";

export default function ConectarWallet({ onConectado, autoConectar = true, inNavbar = false }) {
  const [estado,    setEstado]    = useState("inactivo");
  const [direccion, setDireccion] = useState(null);
  const [error,     setError]     = useState("");

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
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--navy-dim)",
      border: "1.5px solid rgba(30,58,95,0.20)",
      padding: inNavbar ? "6px 14px" : "10px 18px",
      borderRadius: 99,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--green)", flexShrink: 0,
      }} />
      <span style={{ fontFamily: "monospace", fontSize: inNavbar ? 12 : 14, color: "var(--navy)", fontWeight: 600 }}>
        {direccion && direccion.length >= 8 ? `${direccion.slice(0, 4)}…${direccion.slice(-4)}` : direccion}
      </span>
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
      <button
        onClick={conectar}
        disabled={verificando}
        className="btn btn-primary"
        style={{ padding: "14px 36px", fontSize: "1rem", opacity: verificando ? 0.65 : 1 }}
      >
        {verificando ? "Conectando…" : "Conectar con Freighter"}
      </button>

      {estado === "sin_extension" && (
        <p style={{ color: "var(--amber)", fontSize: "0.82rem", margin: 0 }}>
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
