import { useState, useEffect } from "react";
import { obtenerTodosLosProyectos, stroopsAMXNe } from "../stellar/contrato";

let _statsCache = null;
let _statsCacheTs = 0;

export function useLiveStats() {
  const [stats, setStats] = useState(
    () => _statsCache ?? { totalProyectos: "—", totalBloqueado: "—", enProgreso: "—" }
  );

  useEffect(() => {
    if (_statsCache && Date.now() - _statsCacheTs < 15_000) {
      setStats(_statsCache);
      return;
    }
    obtenerTodosLosProyectos()
      .then(proyectos => {
        const totalBloqueado = proyectos.reduce((s, p) => {
          try { return s + BigInt(p.aportado ?? 0); } catch { return s; }
        }, BigInt(0));
        const enProgreso = proyectos.filter(p => p.estado === "EnProgreso").length;
        const next = {
          totalProyectos: proyectos.length.toString(),
          totalBloqueado: stroopsAMXNe(totalBloqueado),
          enProgreso: enProgreso.toString(),
        };
        _statsCache = next;
        _statsCacheTs = Date.now();
        setStats(next);
      })
      .catch(() => {});
  }, []);

  return stats;
}
