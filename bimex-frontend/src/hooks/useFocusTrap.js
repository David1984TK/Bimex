import { useEffect, useRef } from "react";

/**
 * Hook para atrapar el foco dentro de un modal o diálogo accesible (WAI-ARIA).
 *
 * - Guarda el elemento previamente enfocado y devuelve el foco a él al cerrar.
 * - Enfoca el primer elemento interactivo (o el contenedor si no hay).
 * - Cicla la navegación con Tab y Shift+Tab dentro del contenedor.
 * - Cierra el diálogo al presionar Escape.
 *
 * @param {boolean} activo - Si el modal está actualmente visible.
 * @param {Function} [onCerrar] - Callback para cerrar el modal (ej. tecla Escape).
 * @returns {import("react").RefObject} Ref que debe asignarse al contenedor del diálogo.
 */
export default function useFocusTrap(activo, onCerrar) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!activo) return;
    const modal = modalRef.current;
    if (!modal) return;

    const elementoPrevio = document.activeElement;

    const selectorFocusables =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = modal.querySelectorAll(selectorFocusables);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      modal.focus?.();
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        if (typeof onCerrar === "function") {
          e.stopPropagation();
          onCerrar();
        }
        return;
      }

      if (e.key !== "Tab") return;

      const elementos = modal.querySelectorAll(selectorFocusables);
      if (elementos.length === 0) return;

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === primero || document.activeElement === modal) {
          e.preventDefault();
          ultimo?.focus();
        }
      } else {
        if (document.activeElement === ultimo) {
          e.preventDefault();
          primero?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      elementoPrevio?.focus?.();
    };
  }, [activo, onCerrar]);

  return modalRef;
}
