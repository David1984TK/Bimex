import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import usePaginacion from '../hooks/usePaginacion.js';

describe('usePaginacion hook', () => {
  it('inicializa en la página 0 y carga los primeros 20 elementos', async () => {
    const consultaMock = vi.fn().mockResolvedValue({
      data: Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })),
      count: 45,
    });

    const { result } = renderHook(() => usePaginacion(consultaMock));

    expect(result.current.pagina).toBe(0);
    expect(result.current.cargando).toBe(true);

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.datos).toHaveLength(20);
    expect(result.current.total).toBe(45);
    expect(result.current.totalPaginas).toBe(3); // Math.ceil(45 / 20) = 3
    expect(consultaMock).toHaveBeenCalledWith(0, 19);
  });

  it('permite cambiar a la siguiente página y calcula correctamente los rangos desde/hasta', async () => {
    const consultaMock = vi.fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })),
        count: 50,
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, i) => ({ id: i + 21 })),
        count: 50,
      });

    const { result } = renderHook(() => usePaginacion(consultaMock));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pagina).toBe(0);

    // Cambiar a la página 1 (siguiente)
    act(() => {
      result.current.setPagina(1);
    });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.pagina).toBe(1);
    expect(consultaMock).toHaveBeenLastCalledWith(20, 39);
    expect(result.current.datos[0].id).toBe(21);

    // Regresar a la página 0 (anterior)
    act(() => {
      result.current.setPagina(0);
    });

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pagina).toBe(0);
    expect(consultaMock).toHaveBeenLastCalledWith(0, 19);
  });

  it('maneja una lista vacía con totalPaginas mínimo de 1', async () => {
    const consultaMock = vi.fn().mockResolvedValue({
      data: [],
      count: 0,
    });

    const { result } = renderHook(() => usePaginacion(consultaMock));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.datos).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPaginas).toBe(1);
    expect(result.current.pagina).toBe(0);
  });

  it('resetea a página 0 cuando cambian las dependencias externas (filtro)', async () => {
    const consultaMock = vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      count: 100,
    });

    let filtro = 'aprobados';
    const { result, rerender } = renderHook(() => usePaginacion(consultaMock, [filtro]));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    // Avanzar a la página 3
    act(() => {
      result.current.setPagina(3);
    });
    expect(result.current.pagina).toBe(3);

    // Cambiar el filtro de búsqueda/dependencia
    filtro = 'pendientes';
    rerender();

    await waitFor(() => expect(result.current.pagina).toBe(0));
    expect(result.current.pagina).toBe(0);
  });

  it('maneja el rechazo de la promesa devolviendo lista vacía y total 0', async () => {
    const consultaMock = vi.fn().mockRejectedValue(new Error('Fallo RPC o Supabase'));

    const { result } = renderHook(() => usePaginacion(consultaMock));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.datos).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPaginas).toBe(1);
  });
});
