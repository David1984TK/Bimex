import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const PAGINA_SIZE = 20;

/**
 * Hook de paginación reutilizable para listas client-side.
 * Recibe un array de datos y pagina en fragmentos de PAGINA_SIZE.
 *
 * @param {Array} datos - Array completo de datos a paginar
 * @param {Array} dependencias - Variables que al cambiar resetean la página a 0
 * @returns {Object} - { datosPagina, pagina, setPagina, totalPaginas, total, cargandoPagina }
 */
export function usePaginacion(datos, dependencias = []) {
  const [pagina, setPagina] = useState(0);
  const [cargandoPagina, setCargandoPagina] = useState(false);
  const prevDepRef = useRef(JSON.stringify(dependencias));

  // Resetear a página 0 cuando cambian las dependencias
  useEffect(() => {
    const depKey = JSON.stringify(dependencias);
    if (depKey !== prevDepRef.current) {
      prevDepRef.current = depKey;
      setPagina(0);
    }
  }, dependencias);

  const total = datos.length;
  const totalPaginas = Math.ceil(total / PAGINA_SIZE);

  const datosPagina = useMemo(() => {
    const desde = pagina * PAGINA_SIZE;
    const hasta = desde + PAGINA_SIZE;
    return datos.slice(desde, hasta);
  }, [datos, pagina]);

  // Asegurar que la página sea válida cuando cambian los datos
  useEffect(() => {
    if (totalPaginas > 0 && pagina >= totalPaginas) {
      setPagina(Math.max(0, totalPaginas - 1));
    }
  }, [totalPaginas, pagina]);

  const irAPagina = useCallback((nuevaPagina) => {
    const clamp = Math.max(0, Math.min(nuevaPagina, totalPaginas - 1));
    setCargandoPagina(true);
    setPagina(clamp);
    // Simular un breve flash de carga para UX consistente
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCargandoPagina(false);
      });
    });
  }, [totalPaginas]);

  return {
    datosPagina,
    pagina,
    setPagina: irAPagina,
    totalPaginas,
    total,
    cargandoPagina,
    PAGINA_SIZE,
  };
}

/**
 * Componente de controles de paginación Anterior/Siguiente.
 */
export function ControlPagina({ pagina, totalPaginas, onChange, t }) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="paginacion" role="navigation" aria-label={t?.("pagination.ariaLabel") ?? "Paginación"}>
      <button
        className="paginacion-btn"
        onClick={() => onChange(pagina - 1)}
        disabled={pagina === 0}
        aria-label={t?.("pagination.prev") ?? "Página anterior"}
      >
        ← {t?.("pagination.prevShort") ?? "Anterior"}
      </button>
      <span className="paginacion-info" aria-live="polite">
        {t?.("pagination.pageOf", { current: pagina + 1, total: totalPaginas }) ?? `Página ${pagina + 1} de ${totalPaginas}`}
      </span>
      <button
        className="paginacion-btn"
        onClick={() => onChange(pagina + 1)}
        disabled={pagina >= totalPaginas - 1}
        aria-label={t?.("pagination.next") ?? "Página siguiente"}
      >
        {t?.("pagination.nextShort") ?? "Siguiente"} →
      </button>
    </div>
  );
}

export { PAGINA_SIZE };