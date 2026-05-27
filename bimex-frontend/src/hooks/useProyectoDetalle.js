import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { parsearError } from "../utils/errores.js";
import {
  contribuir as contribuirContrato,
  retirarPrincipal as retirarPrincipalContrato,
  retiroAnticipado as retiroAnticipadoContrato,
  reclamarYield as reclamarYieldContrato,
  abandonarProyecto as abandonarProyectoContrato,
  solicitarContinuar as solicitarContinuarContrato,
  obtenerAportacion,
  calcularYield,
  obtenerProyecto,
  obtenerBalanceMXNe,
  mxneAStroops,
  stroopsAMXNe,
  CONFIG,
} from "../stellar/contrato";

function estimarYieldDueno(proyecto) {
  if (!proyecto?.timestamp_inicio || !proyecto?.aportado) return BigInt(0);
  const ahora = Math.floor(Date.now() / 1000);
  const segundos = Math.max(0, ahora - proyecto.timestamp_inicio);
  const minutos = BigInt(Math.floor(segundos / 60));
  const cetesCap = BigInt(proyecto.capital_en_cetes ?? 0);
  const ammCap   = BigInt(proyecto.capital_en_amm   ?? 0);
  const cetesBps = BigInt(CONFIG.YIELD_CETES_BPS);
  const ammBps   = BigInt(CONFIG.YIELD_AMM_BPS);
  const MINUTOS_ANO = BigInt(525_600);
  const yieldCetes = (cetesCap * cetesBps * minutos) / BigInt(10_000) / MINUTOS_ANO;
  const yieldAmm   = (ammCap   * ammBps   * minutos) / BigInt(10_000) / MINUTOS_ANO;
  return yieldCetes + yieldAmm;
}

function calcProyeccion(cantidadMXNe, meses, modo) {
  const capital = Number(cantidadMXNe) || 0;
  const tasaInversor = modo === "inversor" ? 0.05 : 0;
  const tasaProyecto = modo === "inversor" ? 0.06 : 0.11;
  const fraccion = meses / 12;
  return {
    tuYield:        capital * tasaInversor * fraccion,
    proyectoRecibe: capital * tasaProyecto * fraccion,
    totalRetiras:   capital + capital * tasaInversor * fraccion,
  };
}

export default function useProyectoDetalle({ proyectoInicial, direccion, onError, onToast }) {
  const { t } = useTranslation();
  const montadoRef = useRef(true);
  useEffect(() => () => { montadoRef.current = false; }, []);

  const [proyecto,           setProyecto]           = useState(proyectoInicial);
  const [cantidad,           setCantidad]           = useState("");
  const [cargando,           setCargando]           = useState(false);
  const [cargandoInicial,    setCargandoInicial]    = useState(true);
  const [modoInversion,      setModoInversion]      = useState("inversor");
  const [vistaRetirar,       setVistaRetirar]       = useState(false);
  const [confirmarAbandonar, setConfirmarAbandonar] = useState(false);
  const [miAportacion,       setMiAportacion]       = useState(BigInt(0));
  const [miYield,            setMiYield]            = useState(BigInt(0));
  const [balanceMXNe,        setBalanceMXNe]        = useState(null);

  const estado    = proyecto.estado ?? "EtapaInicial";
  const esDueno      = direccion === proyecto.dueno;
  const esAbandonado = estado === "Abandonado";
  const aceptaFondos = estado === "EtapaInicial" || estado === "EnProgreso";

  const ahora = Math.floor(Date.now() / 1000);
  const tsVencimiento = proyecto.timestamp_vencimiento ?? 0;
  const plazoVencido  = tsVencimiento > 0 && ahora >= tsVencimiento;
  const fechaVencimiento = tsVencimiento > 0
    ? new Date(tsVencimiento * 1000).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const aportado   = Number(proyecto.aportado ?? 0);
  const meta       = Number(proyecto.meta ?? 0);
  const porcentaje = meta > 0 ? Math.min((aportado / meta) * 100, 100) : 0;

  const yieldDueno = esDueno ? estimarYieldDueno(proyecto) : BigInt(0);

  const cantidadNum    = Number(cantidad);
  const cantidadValida = cantidad !== "" && !isNaN(cantidadNum) && cantidadNum > 0;
  const superaBalance  = cantidadValida && balanceMXNe !== null && mxneAStroops(cantidadNum) > balanceMXNe;
  const errorCantidad  = !cantidadValida && cantidad !== ""
    ? t("detalle.errAmount")
    : superaBalance
    ? t("detalle.errBalance", { balance: stroopsAMXNe(balanceMXNe) })
    : null;

  const proyeccion = calcProyeccion(cantidadNum, 12, modoInversion);

  const refrescar = useCallback(async () => {
    if (!direccion || proyecto.id == null) {
      setCargandoInicial(false);
      return;
    }
    try {
      const [proyActualizado, aport, yld, bal] = await Promise.all([
        obtenerProyecto(proyecto.id).catch(() => null),
        obtenerAportacion(proyecto.id, direccion).catch(() => BigInt(0)),
        calcularYield(proyecto.id, direccion).catch(() => BigInt(0)),
        obtenerBalanceMXNe(direccion).catch(() => null),
      ]);
      if (!montadoRef.current) return;
      if (proyActualizado) setProyecto(proyActualizado);
      setMiAportacion(aport);
      setMiYield(yld);
      setBalanceMXNe(bal);
    } catch (e) {
      if (montadoRef.current) onError?.(parsearError(e));
    } finally {
      setCargandoInicial(false);
    }
  }, [proyecto.id, direccion, onError]);

  useEffect(() => { refrescar(); }, [refrescar]);

  function handleCantidadChange(e) {
    const raw = e.target.value;
    if (/[eE+\-]/.test(raw)) return;
    setCantidad(raw);
  }

  async function manejarContribuir() {
    if (!cantidadValida || superaBalance) return;
    setCargando(true);
    try {
      await contribuirContrato(direccion, proyecto.id, mxneAStroops(Number(cantidad)));
      onToast?.(t("detalle.toastContributed", { amount: cantidad }));
      setCantidad("");
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarRetirar() {
    setCargando(true);
    try {
      await retirarPrincipalContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastWithdrawn", { amount: stroopsAMXNe(miAportacion) }));
      setMiAportacion(BigInt(0));
      setMiYield(BigInt(0));
      setVistaRetirar(false);
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarReclamarYield() {
    if (estado !== "Liberado") { onError?.(t("detalle.errYieldOnly")); return; }
    if (miYield === BigInt(0)) { onError?.(t("detalle.errNoYield")); return; }
    setCargando(true);
    try {
      await reclamarYieldContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastYield"));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarAbandonar() {
    setConfirmarAbandonar(false);
    setCargando(true);
    try {
      await abandonarProyectoContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastAbandoned"));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarRetiroAnticipado() {
    setCargando(true);
    try {
      await retiroAnticipadoContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastWithdrawn", { amount: stroopsAMXNe(miAportacion) }));
      setMiAportacion(BigInt(0));
      setMiYield(BigInt(0));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  async function manejarSolicitarContinuar() {
    setCargando(true);
    try {
      await solicitarContinuarContrato(direccion, proyecto.id);
      onToast?.(t("detalle.toastContinued"));
      await refrescar();
    } catch (err) {
      onError?.(err);
    }
    setCargando(false);
  }

  return {
    proyecto,
    estado, esDueno, esAbandonado, aceptaFondos,
    plazoVencido, fechaVencimiento, porcentaje, yieldDueno,
    miAportacion, miYield, balanceMXNe,
    cargando, cargandoInicial,
    cantidad, modoInversion, vistaRetirar, confirmarAbandonar,
    cantidadValida, superaBalance, errorCantidad, proyeccion,
    setCantidad, setModoInversion, setVistaRetirar, setConfirmarAbandonar,
    handleCantidadChange,
    manejarContribuir, manejarRetirar, manejarReclamarYield,
    manejarRetiroAnticipado, manejarSolicitarContinuar, manejarAbandonar,
  };
}
