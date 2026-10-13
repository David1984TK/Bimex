import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';

function ModalComponent({ onCerrar }) {
  const [abierto, setAbierto] = useState(false);
  const trapRef = useFocusTrap(abierto, () => {
    setAbierto(false);
    onCerrar?.();
  });

  return (
    <div>
      <button data-testid="boton-abrir" onClick={() => setAbierto(true)}>
        Abrir modal
      </button>

      {abierto && (
        <div ref={trapRef} role="dialog" aria-modal="true" tabIndex={-1} data-testid="modal">
          <input data-testid="primer-input" placeholder="Primer input" />
          <button data-testid="boton-accion">Acción</button>
          <button data-testid="boton-cerrar" onClick={() => setAbierto(false)}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

describe('useFocusTrap hook', () => {
  it('enfoca el primer elemento interactivo al abrir el modal y atrapa el ciclo de foco con Tab y Shift+Tab', async () => {
    const user = userEvent.setup();
    render(<ModalComponent />);

    const botonAbrir = screen.getByTestId('boton-abrir');
    await user.click(botonAbrir);

    const primerInput = screen.getByTestId('primer-input');
    const botonAccion = screen.getByTestId('boton-accion');
    const botonCerrar = screen.getByTestId('boton-cerrar');

    // El primer elemento debe recibir foco al abrir
    expect(document.activeElement).toBe(primerInput);

    // Tab avanza al segundo elemento
    await user.tab();
    expect(document.activeElement).toBe(botonAccion);

    // Tab avanza al último elemento
    await user.tab();
    expect(document.activeElement).toBe(botonCerrar);

    // Tab desde el último elemento cicla de vuelta al primero
    await user.tab();
    expect(document.activeElement).toBe(primerInput);

    // Shift+Tab desde el primer elemento cicla hacia el último elemento
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(botonCerrar);
  });

  it('cierra con la tecla Escape y devuelve el foco al botón que lo abrió', async () => {
    const user = userEvent.setup();
    const mockCerrar = vi.fn();
    render(<ModalComponent onCerrar={mockCerrar} />);

    const botonAbrir = screen.getByTestId('boton-abrir');
    botonAbrir.focus();
    await user.click(botonAbrir);

    expect(screen.getByTestId('modal')).toBeInTheDocument();

    // Presionar Escape para cerrar
    await user.keyboard('{Escape}');

    expect(mockCerrar).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    // Foco restaurado al botón disparador
    expect(document.activeElement).toBe(botonAbrir);
  });
});
