import { useState, useEffect } from "react";
import {
  isConnected, isAllowed, requestAccess, getAddress, getNetwork,
} from "@stellar/freighter-api";
import { CONFIG } from "../stellar/contrato";

export default function ConectarWallet({ onConectado, autoConectar = true }) {
  const [estado, setEstado] = useState("inactivo");
  const [direccion, setDireccion] = useState(null);
  const [error, setError] = useState("");

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
      if (networkPassphrase !== CONFIG.NETWORK_PASSPHRASE) { setEstado("red_incorrecta"); return; }
      const { address } = await getAddress();
      setDireccion(address); setEstado("conectado"); onConectado?.(address);
    } catch (e) {
      setError(e.message || "Error al conectar");
      setEstado("error");
    }
  }

  if (estado === "conectado") return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--primary-dim)", border: "1.5px solid rgba(124,58,237,0.25)", padding: "10px 18px", borderRadius: 99 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 6px rgba(124,58,237,0.5)", flexShrink: 0 }} />
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 14, color: "var(--primary)" }}>
        {direccion.slice(0, 4)}…{direccion.slice(-4)}
      </span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <button
        onClick={conectar}
        disabled={estado === "verificando"}
        style={{
          background: estado === "verificando"
            ? "rgba(124,58,237,0.5)"
            : "linear-gradient(135deg, #7C3AED, #6D28D9)",
          color: "#fff",
          border: "none",
          padding: "14px 40px",
          borderRadius: 12,
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 16,
          cursor: estado === "verificando" ? "not-allowed" : "pointer",
          boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
          transition: "all 0.18s",
          letterSpacing: "-0.01em",
        }}
      >
        {estado === "verificando" ? "Conectando…" : "Conectar con Freighter"}
      </button>

      {estado === "sin_extension" && (
        <p style={{ color: "var(--amber)", fontSize: 13, margin: 0, textAlign: "center" }}>
          Freighter no está instalado.{" "}
          <a href="https://freighter.app" target="_blank" rel="noreferrer"
             style={{ color: "var(--primary)", fontWeight: 600 }}>
            Instalar →
          </a>
        </p>
      )}
      {estado === "red_incorrecta" && (
        <p style={{ color: "var(--amber)", fontSize: 13, margin: 0 }}>
          Cambia Freighter a <strong>Test Net</strong>
        </p>
      )}
      {estado === "error" && (
        <p style={{ color: "var(--error)", fontSize: 13, margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
