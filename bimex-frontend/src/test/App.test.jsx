import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App.jsx";
import i18n from "../i18n/index.js";
import { getStorage } from "../utils/storage.js";

const promptMock = vi.fn();
const userChoiceMock = Promise.resolve({ outcome: "accepted" });
const registerSWMock = vi.fn();

vi.mock("virtual:pwa-register", () => ({
  registerSW: (...args) => registerSWMock(...args),
}));

vi.mock("@stellar/freighter-api", () => ({
  setAllowed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../stellar/contrato", () => ({
  obtenerTodosLosProyectos: vi.fn().mockResolvedValue([]),
  stroopsAMXNe: vi.fn(() => "0.00 MXNe"),
  mintearMXNePrueba: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../hooks/useCetesRate", () => ({
  useCetesRate: () => ({ rate: null, error: null }),
}));

vi.mock("../components/ConectarWallet", () => ({
  default: ({ inNavbar = false }) => (
    <button type="button">{inNavbar ? "Conectar" : "Conectar con Freighter"}</button>
  ),
}));

vi.mock("../components/ListaProyectos", () => ({
  default: () => <div>Lista mock</div>,
}));

vi.mock("../components/CrearProyecto", () => ({
  default: () => null,
}));

vi.mock("../components/DetalleProyecto", () => ({
  default: () => null,
}));

vi.mock("../components/MiCuenta", () => ({
  default: () => null,
}));

vi.mock("../components/AdminPanel", () => ({
  default: () => null,
}));

vi.mock("../components/Recompensas", () => ({
  default: () => null,
}));

vi.mock("../components/Transparencia", () => ({
  default: () => null,
}));

vi.mock("../components/Changelog", () => ({
  default: () => null,
}));

vi.mock("../components/Terminos", () => ({
  default: () => null,
}));

vi.mock("../components/Privacidad", () => ({
  default: () => null,
}));

function renderApp(initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

const storageLocal = getStorage("local");

beforeEach(async () => {
  vi.clearAllMocks();
  storageLocal.removeItem("bimex.pwa.banner.dismissed");
  await i18n.changeLanguage("es");
});

afterEach(() => {
  cleanup();
  storageLocal.removeItem("bimex.pwa.banner.dismissed");
});

describe("App PWA install banner", () => {
  it("no muestra el banner antes de que el navegador permita instalar", () => {
    renderApp();

    expect(screen.queryByText("Instala Bimex")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar Bimex" })).not.toBeInTheDocument();
  });

  it("muestra banner e instala cuando beforeinstallprompt está disponible", async () => {
    const user = userEvent.setup();
    renderApp();

    const installEvent = new Event("beforeinstallprompt");
    installEvent.preventDefault = vi.fn();
    installEvent.prompt = promptMock;
    installEvent.userChoice = userChoiceMock;

    window.dispatchEvent(installEvent);

    expect(await screen.findByText("Instala Bimex")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Instalar Bimex" })[0]);

    await waitFor(() => {
      expect(promptMock).toHaveBeenCalledTimes(1);
    });
  });

  it("permite cerrar el banner y recuerda la preferencia", async () => {
    const user = userEvent.setup();
    renderApp();

    const installEvent = new Event("beforeinstallprompt");
    installEvent.preventDefault = vi.fn();
    installEvent.prompt = promptMock;
    installEvent.userChoice = userChoiceMock;

    window.dispatchEvent(installEvent);
    expect(await screen.findByText("Instala Bimex")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ahora no" }));

    await waitFor(() => {
      expect(screen.queryByText("Instala Bimex")).not.toBeInTheDocument();
    });
    expect(storageLocal.getItem("bimex.pwa.banner.dismissed")).toBe("1");
  });

  it("muestra confirmación cuando la app queda instalada", async () => {
    renderApp();

    window.dispatchEvent(new Event("appinstalled"));

    expect(await screen.findByText("Bimex ya está instalado. Puedes abrirlo desde tu pantalla de inicio y seguir viendo los proyectos cacheados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listo" })).toBeInTheDocument();
  });
});
