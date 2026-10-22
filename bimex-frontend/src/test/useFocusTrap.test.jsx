import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import useFocusTrap from "../hooks/useFocusTrap.js";

function ModalHarness({ onCerrar, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  const modalRef = useFocusTrap({
    activo: open,
    onCerrar: () => {
      onCerrar?.();
      setOpen(false);
    },
  });

  return (
    <div>
      <button data-testid="open-btn" onClick={() => setOpen(true)}>
        Open Modal
      </button>
      {open && (
        <div role="dialog" aria-modal="true" ref={modalRef} tabIndex={-1} data-testid="modal">
          <input data-testid="first-input" />
          <button data-testid="middle-btn">Action</button>
          <button data-testid="last-btn" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

describe("useFocusTrap", () => {
  afterEach(() => {
    cleanup();
  });

  it("enfoca el modal al abrir y devuelve el foco al botón que lo abrió al cerrar", async () => {
    const user = userEvent.setup();
    const onCerrar = vi.fn();
    render(<ModalHarness onCerrar={onCerrar} />);

    const openBtn = screen.getByTestId("open-btn");
    await user.click(openBtn);

    const modal = screen.getByTestId("modal");
    expect(modal).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    expect(openBtn).toHaveFocus();
  });

  it("cicla el foco con Tab y Shift+Tab dentro del modal", async () => {
    const user = userEvent.setup();
    render(<ModalHarness initiallyOpen={true} />);

    const modal = screen.getByTestId("modal");
    const firstInput = screen.getByTestId("first-input");
    const middleBtn = screen.getByTestId("middle-btn");
    const lastBtn = screen.getByTestId("last-btn");

    expect(modal).toHaveFocus();

    // Tab desde el contenedor enfocado va al primer elemento
    await user.tab();
    expect(firstInput).toHaveFocus();

    await user.tab();
    expect(middleBtn).toHaveFocus();

    await user.tab();
    expect(lastBtn).toHaveFocus();

    // Tab desde el último elemento cicla al primero
    await user.tab();
    expect(firstInput).toHaveFocus();

    // Shift+Tab desde el primer elemento cicla al último
    await user.tab({ shift: true });
    expect(lastBtn).toHaveFocus();
  });

  it("Shift+Tab desde el contenedor enfocado va directamente al último elemento", async () => {
    const user = userEvent.setup();
    render(<ModalHarness initiallyOpen={true} />);

    const modal = screen.getByTestId("modal");
    const lastBtn = screen.getByTestId("last-btn");

    expect(modal).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastBtn).toHaveFocus();
  });

  it("devuelve el foco al botón disparador cuando se cierra mediante click interno", async () => {
    const user = userEvent.setup();
    render(<ModalHarness initiallyOpen={false} />);

    const openBtn = screen.getByTestId("open-btn");
    await user.click(openBtn);

    const lastBtn = screen.getByTestId("last-btn");
    await user.click(lastBtn);

    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    expect(openBtn).toHaveFocus();
  });
});
