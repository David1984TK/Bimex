import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import i18n from "../i18n/index.js";
import CasosDeExito, { ImpactCard } from "../components/CasosDeExito.jsx";

const fetchMock = vi.fn();

function renderPagina() {
  return render(
    <MemoryRouter>
      <CasosDeExito />
    </MemoryRouter>,
  );
}

function proyecto(overrides = {}) {
  return {
    id: 1,
    nombre: "Huerto Comunitario",
    total_contribuido: 50_000_000,
    num_contribuidores: 12,
    capital_devuelto: 50_000_000,
    porcentaje_devuelto: 100,
    yield_generado: 1_500_000,
    transacciones: { contribuciones: [{}, {}], retiros: [{}] },
    ...overrides,
  };
}

const t = (key, opts) => i18n.t(key, opts);

beforeEach(async () => {
  await i18n.changeLanguage("es");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CasosDeExito — página pública", () => {
  it("renderiza el encabezado público con título, subtítulo y enlace de vuelta", async () => {
    renderPagina();

    expect(await screen.findByRole("heading", { level: 1, name: "Casos de Éxito" })).toBeInTheDocument();
    expect(screen.getByText(/Proyectos financiados con resultados verificables/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Ver todos los proyectos" })).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando aún no hay proyectos completados", async () => {
    renderPagina();

    expect(await screen.findByText("Aún no hay proyectos completados")).toBeInTheDocument();
    expect(screen.getByText(/Los casos de éxito aparecerán aquí/)).toBeInTheDocument();
  });

  it("muestra las métricas reales de un proyecto completado", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [proyecto()] });

    renderPagina();

    expect(await screen.findByText("Huerto Comunitario")).toBeInTheDocument();
    expect(screen.getByText("Meta alcanzada")).toBeInTheDocument();
    expect(screen.getByText("5 MXNe")).toBeInTheDocument();
    expect(screen.getByText("+0.15 MXNe")).toBeInTheDocument();
    expect(screen.getByText("100% del capital devuelto")).toBeInTheDocument();
    expect(screen.getByText("12 contribuidores")).toBeInTheDocument();
  });

  it("muestra el estado de error cuando la API falla", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    renderPagina();

    expect(await screen.findByText("HTTP 500")).toBeInTheDocument();
  });

  it("sigue enlazando a la página pública aunque falle la carga", async () => {
    renderPagina();

    expect(await screen.findByRole("heading", { level: 1, name: "Casos de Éxito" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/impacto"));
  });
});

describe("ImpactCard — testimonio", () => {
  const testimonio = {
    id: 9,
    proyecto_id: 1,
    tipo: "testimonio",
    titulo: "María López, coordinadora del huerto",
    descripcion: "Con el rendimiento pudimos comprar semillas para toda la temporada",
    url: "",
    uploaded_at: "2026-01-10T00:00:00Z",
  };

  it("renderiza el testimonio junto a las métricas", () => {
    render(
      <ImpactCard
        proyecto={proyecto()}
        evidenciaCount={2}
        testimonio={testimonio}
        onView={vi.fn()}
        t={t}
      />,
    );

    const bloque = screen.getByTestId("testimonio");
    expect(bloque).toBeInTheDocument();
    expect(bloque).toHaveTextContent("Testimonio");
    expect(bloque).toHaveTextContent("Con el rendimiento pudimos comprar semillas para toda la temporada");
    expect(bloque).toHaveTextContent("María López, coordinadora del huerto");
    expect(screen.getByText("Meta alcanzada")).toBeInTheDocument();
  });

  it("no renderiza el bloque de testimonio cuando no hay evidencia", () => {
    render(
      <ImpactCard
        proyecto={proyecto()}
        evidenciaCount={0}
        testimonio={null}
        onView={vi.fn()}
        t={t}
      />,
    );

    expect(screen.queryByTestId("testimonio")).not.toBeInTheDocument();
    expect(screen.getByText("Huerto Comunitario")).toBeInTheDocument();
  });

  it("navega al detalle al activar la tarjeta", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();

    render(<ImpactCard proyecto={proyecto()} evidenciaCount={0} onView={onView} t={t} />);

    await user.click(screen.getByRole("button", { name: "Ver historia completa →" }));
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
