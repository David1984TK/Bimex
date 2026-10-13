import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePaginacionLocal, { PAGINA_SIZE } from '../hooks/usePaginacionLocal.js';

describe('usePaginacionLocal hook', () => {
  it('exporta la constante PAGINA_SIZE igual a 20', () => {
    expect(PAGINA_SIZE).toBe(20);
  });

  it('inicializa en la página 0 y rebana los primeros 20 elementos del array en memoria', () => {
    const items = Array.from({ length: 55 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePaginacionLocal(items));

    expect(result.current.pagina).toBe(0);
    expect(result.current.total).toBe(55);
    expect(result.current.totalPaginas).toBe(3); // Math.ceil(55 / 20) = 3
    expect(result.current.datosPagina).toHaveLength(20);
    expect(result.current.datosPagina[0].id).toBe(0);
    expect(result.current.datosPagina[19].id).toBe(19);
  });

  it('permite cambiar a la siguiente página y a la anterior rebanando correctamente los elementos', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePaginacionLocal(items));

    // Cambiar a página 1 (elementos 20 a 39)
    act(() => {
      result.current.setPagina(1);
    });
    expect(result.current.pagina).toBe(1);
    expect(result.current.datosPagina).toHaveLength(20);
    expect(result.current.datosPagina[0].id).toBe(20);
    expect(result.current.datosPagina[19].id).toBe(39);

    // Cambiar a página 2 (elementos 40 a 44, última página parcial)
    act(() => {
      result.current.setPagina(2);
    });
    expect(result.current.pagina).toBe(2);
    expect(result.current.datosPagina).toHaveLength(5);
    expect(result.current.datosPagina[0].id).toBe(40);
    expect(result.current.datosPagina[4].id).toBe(44);

    // Regresar a página 0
    act(() => {
      result.current.setPagina(0);
    });
    expect(result.current.pagina).toBe(0);
    expect(result.current.datosPagina[0].id).toBe(0);
  });

  it('ajusta y clampea la página actual cuando los datos se reducen drásticamente', () => {
    let items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const { result, rerender } = renderHook(() => usePaginacionLocal(items));

    // Ir a la página 4 (elementos 80 a 99)
    act(() => {
      result.current.setPagina(4);
    });
    expect(result.current.pagina).toBe(4);

    // Los datos se filtran y ahora solo quedan 25 elementos (totalPaginas = 2)
    items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    rerender();

    // Debe quedar en la página 1 (última válida: totalPaginas - 1)
    expect(result.current.totalPaginas).toBe(2);
    expect(result.current.pagina).toBe(1);
    expect(result.current.datosPagina).toHaveLength(5); // 20 a 24
  });

  it('resetea la página a 0 cuando cambian las dependencias del filtro', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    let busqueda = 'solar';

    const { result, rerender } = renderHook(() => usePaginacionLocal(items, [busqueda]));

    // Avanzar a página 2
    act(() => {
      result.current.setPagina(2);
    });
    expect(result.current.pagina).toBe(2);

    // Cambiar la búsqueda (dependencia)
    busqueda = 'hidro';
    rerender();

    expect(result.current.pagina).toBe(0);
  });

  it('maneja un arreglo de datos vacío', () => {
    const { result } = renderHook(() => usePaginacionLocal([]));

    expect(result.current.pagina).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPaginas).toBe(0);
    expect(result.current.datosPagina).toEqual([]);
  });
});
