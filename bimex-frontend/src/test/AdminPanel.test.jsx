import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index.js";
import AdminPanel from "../components/AdminPanel.jsx";
import {
  obtenerTodosLosProyectos,
  aprobarProyecto,
  rechazarProyecto,
} from "../stellar/contrato";

vi.mock("../stellar/contrato", () => ({
  obtenerTodosLosProyectos: vi.fn(),
  aprobarProyecto: vi.fn(),
  rechazarProyecto: vi.fn(),
  stroopsAMXNe: vi.fn((stroops) => {
    const value = Number(stroops ?? 0) / 10_000_000;
    return `${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXNe`;
  }),
}));

const ADMIN_ADDR = "GADMIN000000000000000000000000000000000000000000000";

function crearProyecto(id, overrides = {}) {
  return {
    id,
    nombre: overrides.nombre ?? `Proyecto ${id}`,
    descripcion: overrides.descripcion ?? "Descripción del proyecto",
    estado: overrides.estado ?? "EnRevision",
    dueno: overrides.dueno ?? "GOWNER0000000000000000000000000000000000000000000000",
    meta: overrides.meta ?? 500_000_000n,
    doc_cid: overrides.doc_cid ?? "bafybeicid1234567890abcdef",
    ...overrides,
  };
}

function renderAdminPanel(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AdminPanel
        direccion={ADMIN_ADDR}
        onCerrar={props.onCerrar ?? vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
}

describe("AdminPanel", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("es");
  });

  afterEach(() => {
    cleanup();
  });

  it("muestra estado de carga y luego los proyectos en revisión", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([
      crearProyecto(1, { nombre: "Reforestación Mixteca", estado: "EnRevision" }),
      crearProyecto(2, { nombre: "Paneles Solares", estado: "EnRevision" }),
      crearProyecto(3, { nombre: "Comedor Comunitario", estado: "EnProgreso" }), // no debe mostrarse
    ]);

    renderAdminPanel();

    expect(screen.getAllByText("Cargando proyectos…").length).toBeGreaterThan(0);

    expect(await screen.findByText("Reforestación Mixteca")).toBeInTheDocument();
    expect(screen.getByText("Paneles Solares")).toBeInTheDocument();
    expect(screen.queryByText("Comedor Comunitario")).not.toBeInTheDocument();
    expect(screen.getByText("2 proyectos pendientes de revisión")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando no hay proyectos en revisión", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([
      crearProyecto(1, { estado: "EnProgreso" }),
      crearProyecto(2, { estado: "Finalizado" }),
    ]);

    renderAdminPanel();

    expect(await screen.findByText("Todo al día ✓")).toBeInTheDocument();
    expect(screen.getByText("0 proyectos pendientes de revisión")).toBeInTheDocument();
  });

  it("muestra un toast de error si falla la consulta inicial de proyectos", async () => {
    obtenerTodosLosProyectos.mockRejectedValueOnce(new Error("Fallo de conexión RPC"));

    renderAdminPanel();

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Fallo de conexión RPC");
  });

  it("permite aprobar un proyecto y recarga la lista", async () => {
    const proyecto1 = crearProyecto(42, { nombre: "Cooperativa Apícola" });
    obtenerTodosLosProyectos
      .mockResolvedValueOnce([proyecto1])
      .mockResolvedValueOnce([]); // segunda llamada tras aprobar
    aprobarProyecto.mockResolvedValueOnce(undefined);

    renderAdminPanel();

    expect(await screen.findByText("Cooperativa Apícola")).toBeInTheDocument();

    const btnAprobar = screen.getByRole("button", { name: "✅ Aprobar" });
    await userEvent.click(btnAprobar);

    await waitFor(() => {
      expect(aprobarProyecto).toHaveBeenCalledWith(ADMIN_ADDR, 42);
    });

    const statusToast = await screen.findByRole("status");
    expect(statusToast).toHaveTextContent("✅ Proyecto #42 aprobado");

    expect(await screen.findByText("Todo al día ✓")).toBeInTheDocument();
  });

  it("permite rechazar un proyecto ingresando el motivo", async () => {
    const proyecto1 = crearProyecto(55, { nombre: "Granja Solar" });
    obtenerTodosLosProyectos
      .mockResolvedValueOnce([proyecto1])
      .mockResolvedValueOnce([]);
    rechazarProyecto.mockResolvedValueOnce(undefined);

    renderAdminPanel();

    expect(await screen.findByText("Granja Solar")).toBeInTheDocument();

    const btnRechazar = screen.getByRole("button", { name: "❌ Rechazar" });
    await userEvent.click(btnRechazar);

    const textarea = screen.getByPlaceholderText("Describe el motivo para que el creador pueda corregirlo…");
    expect(textarea).toBeInTheDocument();

    const btnConfirmar = screen.getByRole("button", { name: "Confirmar rechazo" });
    expect(btnConfirmar).toBeDisabled();

    await userEvent.type(textarea, "Falta documentación de impacto ambiental");
    expect(btnConfirmar).not.toBeDisabled();

    await userEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(rechazarProyecto).toHaveBeenCalledWith(
        ADMIN_ADDR,
        55,
        "Falta documentación de impacto ambiental"
      );
    });

    const statusToast = await screen.findByRole("status");
    expect(statusToast).toHaveTextContent("❌ Proyecto #55 rechazado");
  });

  it("permite cancelar el formulario de rechazo inline", async () => {
    const proyecto1 = crearProyecto(55, { nombre: "Granja Solar" });
    obtenerTodosLosProyectos.mockResolvedValueOnce([proyecto1]);

    renderAdminPanel();

    expect(await screen.findByText("Granja Solar")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "❌ Rechazar" }));
    expect(screen.getByPlaceholderText("Describe el motivo para que el creador pueda corregirlo…")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByPlaceholderText("Describe el motivo para que el creador pueda corregirlo…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "✅ Aprobar" })).toBeInTheDocument();
  });

  it("cierra el modal al presionar Escape", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([]);
    const onCerrar = vi.fn();

    renderAdminPanel({ onCerrar });
    await screen.findByText("Todo al día ✓");

    await userEvent.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("cierra el modal al hacer clic en el botón cerrar o en el overlay", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([]);
    const onCerrar = vi.fn();

    const { container } = renderAdminPanel({ onCerrar });
    await screen.findByText("Todo al día ✓");

    const btnClose = screen.getByRole("button", { name: "Cerrar panel de administrador" });
    await userEvent.click(btnClose);
    expect(onCerrar).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector(".modal-overlay");
    await userEvent.click(overlay);
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  it("atrapa el foco mediante Tab y Shift+Tab dentro del modal y restaura el foco al desmontar", async () => {
    obtenerTodosLosProyectos.mockResolvedValueOnce([]);

    const triggerBtn = document.createElement("button");
    triggerBtn.textContent = "Abrir panel";
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const onCerrar = vi.fn();
    const { unmount } = renderAdminPanel({ onCerrar });
    await screen.findByText("Todo al día ✓");

    const closeBtn = screen.getByRole("button", { name: "Cerrar panel de administrador" });

    // Focus en closeBtn (único botón focusable en estado vacío)
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Tab desde el último elemento vuelve al primero
    await userEvent.tab();
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab desde el primer elemento va al último
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(closeBtn);

    // Desmontar debe restaurar el foco al botón que lo abrió
    unmount();
    expect(document.activeElement).toBe(triggerBtn);
    document.body.removeChild(triggerBtn);
  });
});
