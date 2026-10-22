import { useEffect, useRef } from "react";

const SELECTOR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within a modal/dialog container.
 *
 * - When active, captures the element that opened the dialog and focuses the dialog.
 * - Tab and Shift+Tab cycle focus within the focusable children of the dialog.
 * - Escape invokes onCerrar.
 * - On deactivation or unmount, returns focus to the trigger element.
 *
 * @param {Object|Function} [options] Options object or onCerrar callback
 * @param {boolean} [options.activo=true] Whether the focus trap is currently active
 * @param {Function} [options.onCerrar] Callback invoked when Escape is pressed
 * @param {import("react").RefObject} [options.ref] Optional external ref to the modal element
 * @returns {import("react").RefObject} Ref to attach to the modal container
 */
export function useFocusTrap(options = {}) {
  const config = typeof options === "function" ? { onCerrar: options } : options;
  const { activo = true, onCerrar, ref } = config;

  const localRef = useRef(null);
  const modalRef = ref || localRef;
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!activo) return;
    const modal = modalRef.current;
    if (!modal) return;

    // Capture the element that had focus before the modal opened
    const elementoAnterior = document.activeElement;
    modal.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCerrarRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = Array.from(
        modal.querySelectorAll(SELECTOR_FOCUSABLE)
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === primero || document.activeElement === modal) {
          e.preventDefault();
          ultimo?.focus();
        }
      } else {
        if (document.activeElement === ultimo || document.activeElement === modal) {
          e.preventDefault();
          primero?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      elementoAnterior?.focus?.();
    };
  }, [activo, modalRef]);

  return modalRef;
}

export default useFocusTrap;
