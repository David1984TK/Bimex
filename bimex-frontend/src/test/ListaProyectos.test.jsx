import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n/index.js";
import ListaProyectos from "../components/ListaProyectos.jsx";
import { obtenerTodosLosProyectos } from "../stellar/contrato";

vi.mock("../stellar/contrato", () => {
  return {
    obtenerTodosLosProyectos: vi.fn(),
    stroopsAMXNe: vi.fn((value) => `${Number(value ?? 0) / 10000000} MXNe`),
  };
});

const proyectos = [
  {
    id: 1,
    nombre: "Huerto Comunitario",
    descripcion: "Alimentos para familias de la colonia",
    estado: "EnProgreso",
    dueno: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    meta: 100000000n,
    aportado: 25000000n,
    doc_hash: "doc-1",
  },
  {
    id: 2,
    nombre: "Biblioteca Solar",
    descripcion: "Paneles solares para una biblioteca rural",
    estado: "Liberado",
    dueno: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    meta: 200000000n,
    aportado: 200000000n,
    doc_hash: "doc-2",
  },
  {
    id: 3,
    nombre: "Clinica Movil",
    descripcion: "Salud preventiva en comunidades rurales",
    estado: "EnProgreso",
    dueno: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
    meta: 300000000n,
    aportado: 50000000n,
    doc_hash: "doc-3",
  },
];

describe("ListaProyectos search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage("es");
    obtenerTodosLosProyectos.mockResolvedValue(proyectos);
  });

  it("filters projects by debounced text search and combines with status filters", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ListaProyectos onCrear={vi.fn()} refrescar={0} />
      </MemoryRouter>
    );

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
