import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import usePaginacionLocal, { PAGINA_SIZE } from "../hooks/usePaginacionLocal.js";

const generarRegistros = (cantidad) => Array.from({ length: cantidad }, (_, indice) => ({ id: indice + 1 }));

describe("usePaginacionLocal", () => {
  const registros = generarRegistros(45);

  const renderPaginacion = (props) => renderHook(
    ({ datos, dependencias }) => usePaginacionLocal(datos, dependencias),
    props,
  );

  it("arranca en la página 0 con los primeros 20 registros", () => {
    const { result } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["todos"] } });

    expect(PAGINA_SIZE).toBe(20);
    expect(result.current.pagina).toBe(0);
    expect(result.current.total).toBe(45);
    expect(result.current.totalPaginas).toBe(3);
    expect(result.current.datosPagina).toHaveLength(20);
    expect(result.current.datosPagina[0]).toEqual({ id: 1 });
  });

  it("avanza y retrocede de página", () => {
    const { result } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["todos"] } });

    act(() => result.current.setPagina(1));

    expect(result.current.pagina).toBe(1);
    expect(result.current.datosPagina).toHaveLength(20);
    expect(result.current.datosPagina[0]).toEqual({ id: 21 });

    act(() => result.current.setPagina(0));

    expect(result.current.pagina).toBe(0);
    expect(result.current.datosPagina[0]).toEqual({ id: 1 });
  });

  it("devuelve solo los registros de la última página", () => {
    const { result } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["todos"] } });

    act(() => result.current.setPagina(result.current.totalPaginas - 1));

    expect(result.current.pagina).toBe(2);
    expect(result.current.datosPagina).toHaveLength(5);
    expect(result.current.datosPagina[0]).toEqual({ id: 41 });
  });

  it("acota una página fuera de rango a la última página", () => {
    const { result } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["todos"] } });

    act(() => result.current.setPagina(99));

    expect(result.current.pagina).toBe(2);
    expect(result.current.datosPagina).toHaveLength(5);
  });

  it("calcula el número de páginas en los límites exactos", () => {
    const veinte = generarRegistros(20);
    const { result, rerender } = renderPaginacion({ initialProps: { datos: generarRegistros(21), dependencias: ["todos"] } });

    expect(result.current.totalPaginas).toBe(2);

    rerender({ datos: veinte, dependencias: ["todos"] });

    expect(result.current.totalPaginas).toBe(1);
    expect(result.current.datosPagina).toHaveLength(20);
  });

  it("devuelve una lista vacía sin páginas", () => {
    const { result } = renderPaginacion({ initialProps: { datos: [], dependencias: ["todos"] } });

    expect(result.current.total).toBe(0);
    expect(result.current.totalPaginas).toBe(0);
    expect(result.current.datosPagina).toEqual([]);
    expect(result.current.pagina).toBe(0);
  });

  it("mantiene la página al quedar la lista vacía sin pasar a índices negativos", () => {
    const { result, rerender } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["todos"] } });
    act(() => result.current.setPagina(2));

    rerender({ datos: [], dependencias: ["todos"] });

    expect(result.current.pagina).toBe(2);
    expect(result.current.totalPaginas).toBe(0);
    expect(result.current.datosPagina).toEqual([]);
  });

  it("resetea a la página 0 cuando cambia el filtro", () => {
    const { result, rerender } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["todos"] } });
    act(() => result.current.setPagina(2));

    rerender({ datos: registros, dependencias: ["aprobados"] });

    expect(result.current.pagina).toBe(0);
    expect(result.current.datosPagina[0]).toEqual({ id: 1 });
  });

  it("no resetea la página si las dependencias cambian de identidad pero no de contenido", () => {
    const { result, rerender } = renderPaginacion({ initialProps: { datos: registros, dependencias: ["aprobados"] } });
    act(() => result.current.setPagina(2));

    rerender({ datos: registros, dependencias: ["aprobados"] });

    expect(result.current.pagina).toBe(2);
    expect(result.current.datosPagina[0]).toEqual({ id: 41 });
  });
});
