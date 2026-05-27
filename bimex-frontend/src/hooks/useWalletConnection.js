import { useState, useCallback } from "react";
import { setAllowed } from "@stellar/freighter-api";
import { getStorage } from "../utils/storage";

const KEY_SESION_WALLET = "bimex.wallet.session";
const storageSesion = getStorage("session");

function leerAutoConectarInicial() {
  return storageSesion.getItem(KEY_SESION_WALLET) === "1";
}

export default function useWalletConnection() {
  const [direccion, setDireccion] = useState(null);
  const [autoConectar, setAutoConectar] = useState(leerAutoConectarInicial);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  function desconectarLocal() {
    storageSesion.removeItem(KEY_SESION_WALLET);
    setAutoConectar(false);
    setDireccion(null);
  }

  const manejarConectado = useCallback((addr) => {
    if (addr) {
      storageSesion.setItem(KEY_SESION_WALLET, "1");
      setDireccion(addr);
      setAutoConectar(true);
    } else {
      desconectarLocal();
    }
  }, []);

  async function cerrarSesionWallet() {
    setCerrandoSesion(true);
    try {
      await Promise.race([
        setAllowed(false),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
      ]);
    } catch {}
    finally { desconectarLocal(); setCerrandoSesion(false); }
  }

  return {
    direccion,
    setDireccion,
    autoConectar,
    cerrandoSesion,
    manejarConectado,
    cerrarSesionWallet,
    desconectarLocal,
  };
}