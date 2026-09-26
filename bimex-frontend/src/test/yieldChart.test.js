import { beforeEach, describe, expect, it } from "vitest";
import i18n from "../i18n/index.js";
import { formatearNumero } from "../utils/formato.js";
import {
  MAX_ETIQUETAS_X,
  STROOPS_POR_MXNE,
  aStroops,
  formatearEjeY,
  indicesEtiquetasX,
  techoSerie,
} from "../utils/yieldChart.js";

beforeEach(async () => {
  await i18n.changeLanguage("es");
});

describe("yieldChart — helpers puros del gráfico de yield histórico", () => {
  it("convierte a stroops sin lanzar con datos raros", () => {
    expect(STROOPS_POR_MXNE).toBe(10_000_000);
    expect(aStroops(1_200_000_000)).toBe(BigInt(1_200_000_000));
    expect(aStroops("25000000")).toBe(BigInt(25_000_000));
    expect(aStroops(1.6)).toBe(BigInt(2));
    expect(aStroops(null)).toBe(BigInt(0));
    expect(aStroops(undefined)).toBe(BigInt(0));
    expect(aStroops("no-es-un-numero")).toBe(BigInt(0));
  });

  it("formatea el eje Y en MXNe con sufijos k y M", () => {
    expect(formatearEjeY(0)).toBe(formatearNumero(0));
    expect(formatearEjeY(10_000_000)).toBe(formatearNumero(1));
    expect(formatearEjeY(1_000_000_000)).toBe(formatearNumero(100));
    expect(formatearEjeY(10_000_000_000)).toBe(`${formatearNumero(1)}k`);
    expect(formatearEjeY(20_000_000_000_000)).toBe(`${formatearNumero(2)}M`);
    expect(formatearEjeY("basura")).toBe(formatearNumero(0));
  });

  it("toma el techo del máximo de las series visibles", () => {
    expect(techoSerie([])).toBe(1);
    expect(techoSerie([{ puntos: [] }])).toBe(1);
    expect(techoSerie([
      { fuente: "total", puntos: [{ yield: 1_000_000 }, { yield: 3_000_000 }] },
      { fuente: "amm", puntos: [{ yield: 7_500_000 }] },
    ])).toBe(7_500_000);
    // Los valores inválidos se ignoran y nunca dan un techo NaN.
    expect(techoSerie([{ puntos: [{ yield: "raro" }, { yield: null }] }])).toBe(1);
  });

  it("limita las etiquetas del eje X manteniendo primero y último", () => {
    expect(indicesEtiquetasX(0)).toEqual([]);
    expect(indicesEtiquetasX(3)).toEqual([0, 1, 2]);
    expect(indicesEtiquetasX(MAX_ETIQUETAS_X)).toEqual([0, 1, 2, 3, 4, 5]);

    const indices = indicesEtiquetasX(30);
    expect(indices).toHaveLength(MAX_ETIQUETAS_X);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(29);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });
});
