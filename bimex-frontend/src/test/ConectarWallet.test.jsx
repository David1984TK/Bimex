import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConectarWallet from "../components/ConectarWallet.jsx";
import {
  getAddress,
  getNetwork,
  isAllowed,
  isConnected,
  requestAccess,
} from "@stellar/freighter-api";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
}));

vi.mock("../stellar/contrato", () => ({
  CONFIG: {
    NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  isConnected.mockResolvedValue({ isConnected: false });
  isAllowed.mockResolvedValue({ isAllowed: false });
  requestAccess.mockResolvedValue({});
  getNetwork.mockResolvedValue({ networkPassphrase: "Test SDF Network ; September 2015" });
  getAddress.mockResolvedValue({ address: "" });
});

afterEach(() => {
  cleanup();
});

describe("ConectarWallet", () => {
  it("muestra el botón de conexión cuando no hay wallet conectada", () => {
    render(<ConectarWallet autoConectar={false} />);

    expect(screen.getByRole("button", { name: "Freighter" })).toBeInTheDocument();
  });

  it("muestra la dirección truncada cuando ya existe una sesión autorizada", async () => {
    const address = "GABC1234567890WXYZ";
    const onConectado = vi.fn();
    isConnected.mockResolvedValueOnce({ isConnected: true });
    isAllowed.mockResolvedValueOnce({ isAllowed: true });
    getAddress.mockResolvedValueOnce({ address });

    render(<ConectarWallet onConectado={onConectado} />);

    expect(await screen.findByText("GABC…WXYZ")).toBeInTheDocument();
    expect(onConectado).toHaveBeenCalledWith(address);
  });

  it("llama onConectado con la dirección al conectar manualmente", async () => {
    const address = "GDEF1234567890QRST";
    const onConectado = vi.fn();
    isConnected.mockResolvedValue({ isConnected: true });
    requestAccess.mockResolvedValue({});
    getNetwork.mockResolvedValue({ networkPassphrase: "Test SDF Network ; September 2015" });
    getAddress.mockResolvedValue({ address });

    render(<ConectarWallet autoConectar={false} onConectado={onConectado} />);

    await userEvent.click(screen.getByRole("button", { name: "Freighter" }));

    await waitFor(() => {
      expect(onConectado).toHaveBeenCalledWith(address);
    });
    expect(screen.getByText("GDEF…QRST")).toBeInTheDocument();
  });
});
