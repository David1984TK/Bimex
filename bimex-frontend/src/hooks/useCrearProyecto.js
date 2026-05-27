import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parsearError } from "../utils/errores.js";
import {
  crearProyecto as crearProyectoContrato,
  mxneAStroops,
  hashearDocumentos,
} from "../stellar/contrato";
import { subirConFallback } from "../utils/ipfs";

export default function useCrearProyecto({ direccion, onCerrar, onCreado, onError }) {
  const { t } = useTranslation();
  const [paso, setPaso] = useState(1);
  const [forma, setForma] = useState({
    nombre: "",
    descripcion: "",
    meta: "",
    tiempoMeses: "",
    categoria: "Comunidad",
  });
  const [docs, setDocs] = useState({ ine: null, plan: null, presupuesto: null });
  const [docCid,   setDocCid]   = useState(null);
  const [ipfsCids, setIpfsCids] = useState(null);
  const [cargando,  setCargando]  = useState(false);
  const [hasheando, setHasheando] = useState(false);
  const [error,     setError]     = useState("");

  function manejarCambio(e) {
    const { name, value } = e.target;
    if (name === "meta") {
      const raw = value.replace(/[^0-9]/g, "");
      setForma(prev => ({ ...prev, meta: raw }));
    } else if (name === "tiempoMeses") {
      const n = parseInt(value, 10);
      setForma(prev => ({ ...prev, tiempoMeses: isNaN(n) ? "" : String(Math.min(120, Math.max(1, n))) }));
    } else {
      setForma(prev => ({ ...prev, [name]: value }));
    }
  }

  function setDoc(campo, archivo) {
    setDocs(d => ({ ...d, [campo]: archivo ?? null }));
  }

  const metaFormateada = forma.meta ? Number(forma.meta).toLocaleString("es-MX") : "";

  const APY_INVERSOR = 0.05;
  const yieldEstimado = forma.meta && forma.tiempoMeses
    ? (Number(forma.meta) * APY_INVERSOR * (Number(forma.tiempoMeses) / 12)).toLocaleString("es-MX", { maximumFractionDigits: 0 })
    : null;
  const yieldNote = yieldEstimado
    ? `~5% anual sobre tu inversión · durante ${forma.tiempoMeses} mes${Number(forma.tiempoMeses) !== 1 ? "es" : ""}`
    : null;

  function avanzarAPaso2() {
    setError("");
    if (!forma.nombre.trim()) { setError(t("crear.errName")); return; }
    if (!forma.meta || Number(forma.meta) <= 0) { setError(t("crear.errGoal")); return; }
    if (forma.tiempoMeses && (Number(forma.tiempoMeses) < 1 || Number(forma.tiempoMeses) > 120)) {
      setError(t("crear.errTime")); return;
    }
    setPaso(2);
  }

  async function avanzarAPaso3() {
    setError("");
    if (!docs.ine || !docs.plan || !docs.presupuesto) {
      setError(t("crear.errDocs"));
      return;
    }
    setHasheando(true);
    try {
      const [resIne, resPlan, resPres] = await Promise.all([
        subirConFallback(docs.ine),
        subirConFallback(docs.plan),
        subirConFallback(docs.presupuesto),
      ]);
      const allIPFS = !resIne.usedFallback && !resPlan.usedFallback && !resPres.usedFallback;
      if (allIPFS) {
        setIpfsCids({ ine: resIne.cid, plan: resPlan.cid, presupuesto: resPres.cid });
        setDocCid(`${resIne.cid}|${resPlan.cid}|${resPres.cid}`);
      } else {
        setIpfsCids(null);
        const hash = await hashearDocumentos(docs.ine, docs.plan, docs.presupuesto);
        const cid = Array.from(hash).map(b => b.toString(16).padStart(2, "0")).join("");
        setDocCid(cid);
      }
      setPaso(3);
    } catch (err) {
      onError?.(err);
      setError(parsearError(err));
    }
    setHasheando(false);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    if (paso !== 3 || !docCid) return;
    setCargando(true);
    setError("");
    try {
      const metaStroops = mxneAStroops(Number(forma.meta));
      const meses = Math.max(1, Math.min(120, Number(forma.tiempoMeses) || 6));
      await crearProyectoContrato(direccion, forma.nombre, metaStroops, docCid, meses);
      onCreado();
    } catch (err) {
      setError(parsearError(err));
      onError?.(err);
    }
    setCargando(false);
  }

  return {
    paso, setPaso,
    forma, docs,
    docCid, ipfsCids,
    cargando, hasheando,
    error, setError,
    metaFormateada, yieldEstimado, yieldNote,
    manejarCambio, setDoc,
    avanzarAPaso2, avanzarAPaso3, manejarSubmit,
    onCerrar,
  };
}
