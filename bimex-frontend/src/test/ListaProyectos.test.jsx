import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n/index.js";
import ListaProyectos from "../components/ListaProyectos.jsx";
import { obtenerTodosLosProyectos } from "../stellar/contrato";
import { getStorage } from "../utils/storage.js";

vi.mock("../stellar/contrato", () => ({
  obtenerTodosLosProyectos: vi.fn(),
  stroopsAMXNe: vi.fn((stroops) => {
    const value = Number(stroops ?? 0) / 10_000_000;
    return `${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXNe`;
  }),
}));

const storageLocal = getStorage("local");

function renderLista(props = {}) {
  return render(
    <MemoryRouter>
      <ListaProyectos onCrear={vi.fn()} refrescar={0} {...props} />
    </MemoryRouter>,
  );
}

function proyecto(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    nombre: overrides.nombre ?? "Huerto Comunitario",
    descripcion: overrides.descripcion ?? "Alimentos para familias",
    estado: overrides.estado ?? "EnProgreso",
    dueno: overrides.dueno ?? "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    meta: overrides.meta ?? 100_000_000n,
    aportado: overrides.aportado ?? 25_000_000n,
    yield_entregado: 0n,
    timestamp_inicio: 0,
    timestamp_vencimiento: 0,
    tiempo_meses: 12,
    capital_en_cetes: 0n,
    capital_en_amm: 0n,
    doc_hash: overrides.doc_hash ?? "cid1|cid2|cid3",
    ...overrides,
  };
}

const proyectosBusqueda = [
  proyecto({
    id: 1,
    nombre: "Huerto Comunitario",
    descripcion: "Alimentos para familias de la colonia",
    estado: "EnProgreso",
    aportado: 25_000_000n,
    doc_hash: "doc-1",
  }),
  proyecto({
    id: 2,
    nombre: "Biblioteca Solar",
    descripcion: "Paneles solares para una biblioteca rural",
    estado: "Liberado",
    meta: 200_000_000n,
    aportado: 200_000_000n,
    dueno: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    doc_hash: "doc-2",
  }),
  proyecto({
    id: 3,
    nombre: "Clinica Movil",
    descripcion: "Salud preventiva en comunidades rurales",
    estado: "EnProgreso",
    meta: 300_000_000n,
    aportado: 50_000_000n,
    dueno: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    doc_hash: "doc-3",
  }),
];

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("es");
});

afterEach(() => {
  cleanup();
  storageLocal.removeItem("bimex.cache.proyectos");
  storageLocal.removeItem("bimex.cache.proyectos.ts");
});

describe("ListaProyectos", () => {
  it("muestra el estado vacío cuando no hay proyectos", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([]);

    renderLista();

    expect(await screen.findByText("Aún no hay proyectos")).toBeInTheDocument();
    expect(screen.getByText("¡Sé el primero en crear uno!")).toBeInTheDocument();
  });

  it("filtra los proyectos por estado", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos.mockResolvedValueOnce([
      proyecto({ id: 1, nombre: "Proyecto en progreso", estado: "EnProgreso" }),
      proyecto({ id: 2, nombre: "Proyecto liberado", estado: "Liberado" }),
      proyecto({ id: 3, nombre: "Proyecto inicial", estado: "EtapaInicial" }),
      proyecto({ id: 4, nombre: "Proyecto oculto", estado: "EnRevision" }),
    ]);

    renderLista();

    expect(await screen.findByText("Proyecto en progreso")).toBeInTheDocument();
    expect(screen.getByText("Proyecto liberado")).toBeInTheDocument();
    expect(screen.queryByText("Proyecto oculto")).not.toBeInTheDocument();

    const filtroLiberado = screen
      .getAllByRole("button", { name: /liberado/i })
      .find((button) => button.getAttribute("aria-pressed") !== null);

    expect(filtroLiberado).toBeDefined();
    await user.click(filtroLiberado);

    expect(screen.getByText("Proyecto liberado")).toBeInTheDocument();
    expect(screen.queryByText("Proyecto en progreso")).not.toBeInTheDocument();
    expect(screen.queryByText("Proyecto inicial")).not.toBeInTheDocument();
  });

  it("muestra el botón para cargar más cuando hay más de 12 proyectos", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce(
      Array.from({ length: 13 }, (_, index) =>
        proyecto({ id: index + 1, nombre: `Proyecto ${index + 1}` }),
      ),
    );

    renderLista();

    expect(await screen.findByText("Proyecto 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver más/i })).toBeInTheDocument();
    expect(screen.queryByText("Proyecto 13")).not.toBeInTheDocument();
  });

  it("aumenta la cantidad visible al usar cargar más", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos.mockResolvedValueOnce(
      Array.from({ length: 13 }, (_, index) =>
        proyecto({ id: index + 1, nombre: `Proyecto ${index + 1}` }),
      ),
    );

    renderLista();

    expect(await screen.findByText("Proyecto 12")).toBeInTheDocument();
    expect(screen.queryByText("Proyecto 13")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver más/i }));

    await waitFor(() => {
      expect(screen.getByText("Proyecto 13")).toBeInTheDocument();
    });
  });

  it("usa la lista cacheada cuando falla la carga remota", async () => {
    const timestamp = new Date("2026-06-01T15:30:00Z").getTime();
    const cache = [
      proyecto({
        id: 7,
        nombre: "Proyecto Offline",
        descripcion: "Disponible desde cache",
        estado: "EnProgreso",
        meta: 150_000_000n,
        aportado: 45_000_000n,
      }),
    ];

    storageLocal.setItem(
      "bimex.cache.proyectos",
      JSON.stringify(cache.map((item) => ({
        ...item,
        meta: item.meta.toString(),
        aportado: item.aportado.toString(),
        yield_entregado: item.yield_entregado.toString(),
        capital_en_cetes: item.capital_en_cetes.toString(),
        capital_en_amm: item.capital_en_amm.toString(),
      }))),
    );
    storageLocal.setItem("bimex.cache.proyectos.ts", String(timestamp));
    obtenerTodosLosProyectos.mockRejectedValueOnce(new Error("offline"));

    renderLista();

    expect(await screen.findByText("Proyecto Offline")).toBeInTheDocument();
    expect(screen.getByText("Mostrando proyectos guardados")).toBeInTheDocument();
    expect(screen.getByText(/última actualización/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("filtra proyectos por búsqueda con debounce y combina con filtros de estado", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos.mockResolvedValueOnce(proyectosBusqueda);

    renderLista();

    await screen.findByText("Huerto Comunitario");
    const search = screen.getByRole("searchbox", { name: /buscar proyectos/i });

    await user.type(search, "solar");
    expect(screen.getByText("Huerto Comunitario")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Huerto Comunitario")).not.toBeInTheDocument();
      expect(screen.getByText("Biblioteca Solar")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /en progreso/i }));
    expect(screen.queryByText("Biblioteca Solar")).not.toBeInTheDocument();
    expect(screen.getByText('Sin resultados para "solar"')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /limpiar búsqueda/i }));
    await waitFor(() => {
      const list = screen.getByRole("list", { name: /lista de proyectos/i });
      expect(within(list).getByText("Huerto Comunitario")).toBeInTheDocument();
      expect(within(list).getByText("Clinica Movil")).toBeInTheDocument();
      expect(screen.queryByText("Biblioteca Solar")).not.toBeInTheDocument();
    });
  });
});
