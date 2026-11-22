import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import usePaginacion from "../hooks/usePaginacion.js";

describe("usePaginacion", () => {
  const registros = Array.from({ length: 45 }, (_, indice) => ({ id: indice + 1 }));
  let consulta;

  beforeEach(() => {
    consulta = vi.fn(async (desde, hasta) => ({
      data: registros.slice(desde, hasta + 1),
      count: registros.length,
    }));
  });

  const renderPaginacion = (props) => renderHook(
    ({ filtro }) => usePaginacion(consulta, [filtro]),
    props,
  );

  it("arranca en la página 0 con el primer rango de 20 registros", async () => {
    const { result } = renderPaginacion({ initialProps: { filtro: "todos" } });

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.pagina).toBe(0);
    expect(result.current.datos).toHaveLength(20);
    expect(result.current.datos[0]).toEqual({ id: 1 });
    expect(result.current.total).toBe(45);
    expect(result.current.totalPaginas).toBe(3);
    expect(consulta).toHaveBeenCalledWith(0, 19);
  });

  it("avanza y retrocede de página con rangos inclusivos", async () => {
    const { result } = renderPaginacion({ initialProps: { filtro: "todos" } });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.setPagina(1));
    await waitFor(() => expect(result.current.datos[0]?.id).toBe(21));

    expect(result.current.pagina).toBe(1);
    expect(result.current.datos).toHaveLength(20);
    expect(consulta).toHaveBeenCalledWith(20, 39);

    act(() => result.current.setPagina(0));
    await waitFor(() => expect(result.current.datos[0]?.id).toBe(1));

    expect(result.current.pagina).toBe(0);
    expect(consulta).toHaveBeenLastCalledWith(0, 19);
  });

  it("consulta la última página válida sin pasarse del total", async () => {
    const { result } = renderPaginacion({ initialProps: { filtro: "todos" } });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.setPagina(result.current.totalPaginas - 1));
    await waitFor(() => expect(result.current.datos).toHaveLength(5));

    expect(result.current.pagina).toBe(2);
    expect(result.current.datos[0]).toEqual({ id: 41 });
    expect(consulta).toHaveBeenCalledWith(40, 59);
  });

  it("no acota el offset cuando se pide una página fuera de rango", async () => {
    const { result } = renderPaginacion({ initialProps: { filtro: "todos" } });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.setPagina(99));
    await waitFor(() => expect(consulta).toHaveBeenCalledWith(1980, 1999));

    expect(result.current.pagina).toBe(99);
    expect(result.current.datos).toEqual([]);
    expect(result.current.totalPaginas).toBe(3);
  });

  it("maneja una lista vacía con totalPaginas mínimo de 1", async () => {
    consulta.mockResolvedValue({ data: [], count: 0 });
    const { result } = renderPaginacion({ initialProps: { filtro: "todos" } });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.datos).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPaginas).toBe(1);
  });

  it("vacia los datos y termina de cargar si la consulta falla", async () => {
    consulta.mockRejectedValue(new Error("Consulta fallida"));
    const { result } = renderPaginacion({ initialProps: { filtro: "todos" } });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.datos).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPaginas).toBe(1);
  });

  it("resetea a la página 0 cuando cambia el filtro", async () => {
    const { result, rerender } = renderPaginacion({ initialProps: { filtro: "todos" } });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.setPagina(2));
    await waitFor(() => expect(result.current.datos).toHaveLength(5));

    rerender({ filtro: "activos" });

    await waitFor(() => expect(result.current.pagina).toBe(0));
    await waitFor(() => expect(result.current.datos[0]?.id).toBe(1));
    expect(consulta).toHaveBeenLastCalledWith(0, 19);
  });
});
