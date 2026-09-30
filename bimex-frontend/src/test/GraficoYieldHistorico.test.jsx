import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n/index.js";
import GraficoYieldHistorico from "../components/GraficoYieldHistorico.jsx";
import { formatearMXNe, formatearNumero } from "../utils/formato.js";

const API = "http://api.test";
const fetchMock = vi.fn();

const t = (key, opts) => i18n.t(key, opts);

function punto(periodo, valor, eventos = 1) {
  return { periodo, yield: valor, acumulado: valor, eventos };
}

function respuestaHistorico(overrides = {}) {
  return {
    granularidad: "semana",
    proyecto_id: null,
    desglose_disponible: false,
    total_yield: 3_450_000_000,
    total_cetes: null,
    total_amm: null,
    total_eventos: 12,
    series: [
      {
        fuente: "total",
        puntos: [punto("2026-S35", 1_200_000_000, 4), punto("2026-S36", 2_250_000_000, 8)],
      },
    ],
    ...overrides,
  };
}

function respuestaConDesglose() {
  return respuestaHistorico({
    desglose_disponible: true,
    total_yield: 3_000_000_000,
    total_cetes: 1_800_000_000,
    total_amm: 1_200_000_000,
    total_eventos: 6,
    series: [
      { fuente: "total", puntos: [punto("2026-S35", 1_000_000_000, 3), punto("2026-S36", 2_000_000_000, 3)] },
      { fuente: "cetes", puntos: [punto("2026-S35", 600_000_000, 2), punto("2026-S36", 1_200_000_000, 2)] },
      { fuente: "amm", puntos: [punto("2026-S35", 400_000_000), punto("2026-S36", 800_000_000)] },
    ],
  });
}

function json(body) {
  return { ok: true, status: 200, json: async () => body };
}

function montar(props = {}) {
  return render(<GraficoYieldHistorico apiUrl={API} {...props} />);
}

beforeEach(async () => {
  await i18n.changeLanguage("es");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(json(respuestaHistorico()));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GraficoYieldHistorico — yield ya indexado", () => {
  it("dibuja la serie total con sus puntos, ejes y resumen", async () => {
    montar();

    const figura = await screen.findByTestId("yield-historico-grafico");
    expect(fetchMock).toHaveBeenCalledWith(`${API}/yield/historico?granularidad=semana`);

    const serie = figura.querySelector('[data-serie="total"]');
    expect(serie.querySelectorAll("circle")).toHaveLength(2);
    expect(serie.querySelector("polyline")).toHaveAttribute("points", /,/);
    // Con una sola serie visible el componente rellena el área bajo la línea.
    expect(serie.querySelector("polygon")).not.toBeNull();
    expect(serie.querySelectorAll("[data-punto]")).toHaveLength(2);

    const tituloPunto = serie.querySelector("circle title").textContent;
    expect(tituloPunto).toBe(
      t("transp.yieldChartPointAria", { periodo: "2026-S35", monto: `${formatearMXNe(1_200_000_000)} MXNe` }),
    );

    expect(figura).toHaveTextContent("2026-S35");
    expect(figura).toHaveTextContent("2026-S36");

    const svg = figura.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute(
      "aria-label",
      t("transp.yieldChartAria", { serie: t("transp.yieldChartSerieTotal"), puntos: formatearNumero(2) }),
    );

    expect(screen.getByText(`${formatearMXNe(3_450_000_000)} MXNe`)).toBeInTheDocument();
    expect(screen.getByText(t("transp.yieldChartEvents"))).toBeInTheDocument();
    expect(screen.getByText(t("transp.yieldChartPeriods"))).toBeInTheDocument();
  });

  it("explica que el desglose CETES vs AMM todavía no viaja en los eventos", async () => {
    montar();

    await screen.findByTestId("yield-historico-grafico");

    expect(screen.getByTestId("yield-historico-nota")).toHaveTextContent(t("transp.yieldChartSplitNota"));
  });

  it("cambia de granularidad y vuelve a consultar el histórico", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(json(respuestaHistorico()))
      .mockResolvedValueOnce(json(respuestaHistorico({
        granularidad: "mes",
        series: [{ fuente: "total", puntos: [punto("2026-08", 3_450_000_000, 12)] }],
      })));

    montar();
    await screen.findByTestId("yield-historico-grafico");

    const botonSemana = screen.getByRole("button", { name: t("transp.yieldChartGranoSemana") });
    expect(botonSemana).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: t("transp.yieldChartGranoMes") }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith(`${API}/yield/historico?granularidad=mes`);
    expect(await screen.findByText("2026-08")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("transp.yieldChartGranoMes") })).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra el estado de carga mientras el indexer responde", async () => {
    let liberar;
    fetchMock.mockImplementation(() => new Promise((resolve) => {
      liberar = () => resolve(json(respuestaHistorico()));
    }));

    montar();

    expect(screen.getByTestId("yield-historico-cargando")).toBeInTheDocument();
    expect(screen.queryByTestId("yield-historico-grafico")).not.toBeInTheDocument();

    await act(async () => {
      liberar();
    });

    expect(await screen.findByTestId("yield-historico-grafico")).toBeInTheDocument();
    expect(screen.queryByTestId("yield-historico-cargando")).not.toBeInTheDocument();
  });

  it("permite alternar las series sin dejar nunca el gráfico vacío", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(json(respuestaConDesglose()));

    const { container } = montar();
    await screen.findByTestId("yield-historico-grafico");

    expect(screen.queryByTestId("yield-historico-nota")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-serie]")).toHaveLength(3);
    expect(container.querySelector('[data-serie="total"] polygon')).toBeNull();

    const botonCetes = screen.getByRole("button", { name: t("transp.yieldChartSerieCetes") });
    const botonAmm = screen.getByRole("button", { name: t("transp.yieldChartSerieAmm") });
    const botonTotal = screen.getByRole("button", { name: t("transp.yieldChartSerieTotal") });

    await user.click(botonCetes);
    expect(container.querySelector('[data-serie="cetes"]')).toBeNull();
    expect(botonCetes).toHaveAttribute("aria-pressed", "false");

    await user.click(botonAmm);
    expect(container.querySelector('[data-serie="amm"]')).toBeNull();

    // La última serie visible nunca se oculta: el gráfico quedaría en blanco.
    await user.click(botonTotal);
    expect(botonTotal).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll("svg [data-serie]")).toHaveLength(1);
    expect(container.querySelector('[data-serie="total"] polygon')).not.toBeNull();

    await user.click(botonCetes);
    expect(container.querySelector('[data-serie="cetes"]')).not.toBeNull();
  });

  it("muestra el estado vacío cuando todavía no hay reclamos de yield", async () => {
    fetchMock.mockResolvedValue(json(respuestaHistorico({
      total_yield: 0,
      total_eventos: 0,
      series: [{ fuente: "total", puntos: [] }],
    })));

    montar();

    const vacio = await screen.findByTestId("yield-historico-vacio");
    expect(vacio).toHaveTextContent(t("transp.yieldChartEmpty"));
    expect(vacio).toHaveTextContent(t("transp.yieldChartEmptyHint"));
    expect(screen.queryByTestId("yield-historico-grafico")).not.toBeInTheDocument();
  });

  it("muestra el error de la API y permite reintentar", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue(json(respuestaHistorico()));

    montar();

    const alerta = await screen.findByTestId("yield-historico-error");
    expect(alerta).toHaveAttribute("role", "alert");
    expect(alerta).toHaveTextContent(t("transp.yieldChartError"));
    expect(alerta).toHaveTextContent("HTTP 500");

    await user.click(within(alerta).getByRole("button", { name: t("transp.retry") }));

    expect(await screen.findByTestId("yield-historico-grafico")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("yield-historico-error")).not.toBeInTheDocument();
  });

  it("propaga el proyecto_id al indexer cuando el gráfico va embebido", async () => {
    montar({ proyectoId: 7 });

    await screen.findByTestId("yield-historico-grafico");

    expect(fetchMock).toHaveBeenCalledWith(`${API}/yield/historico?granularidad=semana&proyecto_id=7`);
  });
});
