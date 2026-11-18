import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index.js";
import AdminPanel from "../components/AdminPanel.jsx";
import { parsearError } from "../utils/errores.js";
import {
  aprobarProyecto,
  obtenerTodosLosProyectos,
  rechazarProyecto,
} from "../stellar/contrato";

vi.mock("../stellar/contrato", () => ({
  obtenerTodosLosProyectos: vi.fn(),
  aprobarProyecto: vi.fn(),
  rechazarProyecto: vi.fn(),
  stroopsAMXNe: vi.fn((stroops) => `${Number(stroops ?? 0) / 10_000_000} MXNe`),
}));

const ADMIN = "GADMIN00000000000000000000000000000000000000000000000";

function proyecto(overrides = {}) {
  return {
    id: 1,
    nombre: "Huerto Comunitario",
    descripcion: "Alimentos para familias",
    estado: "EnRevision",
    dueno: "GOWNER0000000000000000000000000000000000000000000000",
    meta: 1_000_000_000n,
    aportado: 0n,
    doc_hash: "cid1|cid2|cid3",
    ...overrides,
  };
}

function renderPanel(onCerrar = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <AdminPanel direccion={ADMIN} onCerrar={onCerrar} />
    </I18nextProvider>,
  );
  return onCerrar;
}

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("es");
});

afterEach(() => {
  cleanup();
});

describe("AdminPanel", () => {
  it("lista solo los proyectos en revisión", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([
      proyecto(),
      proyecto({ id: 2, nombre: "Escuela Rural", estado: "EnProgreso" }),
    ]);

    renderPanel();

    expect(await screen.findByText("Huerto Comunitario")).toBeInTheDocument();
    expect(screen.queryByText("Escuela Rural")).not.toBeInTheDocument();
    expect(screen.getByText(i18n.t("admin.pending", { count: 1 }))).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay proyectos pendientes", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([proyecto({ estado: "EnProgreso" })]);

    renderPanel();

    expect(await screen.findByText(i18n.t("admin.allClear"))).toBeInTheDocument();
  });

  it("muestra un error si no se pueden cargar los proyectos", async () => {
    const err = new Error("Network error");
    obtenerTodosLosProyectos.mockRejectedValueOnce(err);

    renderPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent(parsearError(err));
  });

  it("con permisos: aprueba con la dirección admin y recarga la lista", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos
      .mockResolvedValueOnce([proyecto()])
      .mockResolvedValueOnce([]);
    aprobarProyecto.mockResolvedValueOnce();

    renderPanel();

    await user.click(await screen.findByRole("button", { name: i18n.t("admin.approve") }));

    expect(aprobarProyecto).toHaveBeenCalledWith(ADMIN, 1);
    expect(await screen.findByRole("status")).toHaveTextContent(
      i18n.t("admin.toastApproved", { id: 1 }),
    );
    expect(obtenerTodosLosProyectos).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(i18n.t("admin.allClear"))).toBeInTheDocument();
  });

  it("sin permisos: si el contrato rechaza la aprobación muestra el error y conserva el proyecto", async () => {
    const user = userEvent.setup();
    const err = new Error("HostError: Error(Auth, InvalidAction)");
    obtenerTodosLosProyectos.mockResolvedValueOnce([proyecto()]);
    aprobarProyecto.mockRejectedValueOnce(err);

    renderPanel();

    await user.click(await screen.findByRole("button", { name: i18n.t("admin.approve") }));

    expect(await screen.findByRole("alert")).toHaveTextContent(parsearError(err));
    expect(screen.getByText("Huerto Comunitario")).toBeInTheDocument();
    expect(obtenerTodosLosProyectos).toHaveBeenCalledTimes(1);
  });

  it("rechaza un proyecto con el motivo escrito", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos
      .mockResolvedValueOnce([proyecto()])
      .mockResolvedValueOnce([]);
    rechazarProyecto.mockResolvedValueOnce();

    renderPanel();

    await user.click(await screen.findByRole("button", { name: i18n.t("admin.reject") }));
    await user.type(screen.getByLabelText(i18n.t("admin.rejectReason")), "Documentos ilegibles");
    await user.click(screen.getByRole("button", { name: i18n.t("admin.confirmReject") }));

    await waitFor(() =>
      expect(rechazarProyecto).toHaveBeenCalledWith(ADMIN, 1, "Documentos ilegibles"),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      i18n.t("admin.toastRejected", { id: 1 }),
    );
  });

  it("se cierra con Escape, con el botón de cerrar y al hacer clic fuera del modal", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos.mockResolvedValue([]);

    const onCerrar = renderPanel();
    await screen.findByText(i18n.t("admin.allClear"));

    await user.click(screen.getByRole("dialog"));
    expect(onCerrar).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: i18n.t("admin.closeAria") }));
    expect(onCerrar).toHaveBeenCalledTimes(2);

    await user.click(document.querySelector(".modal-overlay"));
    expect(onCerrar).toHaveBeenCalledTimes(3);
  });

  it("atrapa el foco dentro del modal", async () => {
    const user = userEvent.setup();
    obtenerTodosLosProyectos.mockResolvedValueOnce([proyecto()]);

    renderPanel();

    const cerrar = screen.getByRole("button", { name: i18n.t("admin.closeAria") });
    const rechazar = await screen.findByRole("button", { name: i18n.t("admin.reject") });

    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.tab();
    expect(cerrar).toHaveFocus();

    await user.tab({ shift: true });
    expect(rechazar).toHaveFocus();

    await user.tab();
    expect(cerrar).toHaveFocus();
  });
});
