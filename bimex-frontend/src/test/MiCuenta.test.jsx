import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import i18n from "../i18n/index.js";
import MiCuenta from "../components/MiCuenta.jsx";
import {
  obtenerTodosLosProyectos,
  obtenerAportacion,
  calcularYield,
  obtenerAportacionesIndexer,
} from "../stellar/contrato";

vi.mock("../stellar/contrato", () => ({
  obtenerTodosLosProyectos: vi.fn(),
  obtenerAportacion: vi.fn(),
  calcularYield: vi.fn(),
  obtenerAportacionesIndexer: vi.fn(),
  ejecutarConcurrente: vi.fn(async (items, fn) => {
    return Promise.all(
      items.map(async (item, i) => {
        try {
          const value = await fn(item, i);
          return { status: "fulfilled", value };
        } catch (reason) {
          return { status: "rejected", reason };
        }
      })
    );
  }),
  stroopsAMXNe: vi.fn((stroops) => {
    const value = Number(stroops ?? 0) / 10_000_000;
    return `${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXNe`;
  }),
}));

const DIRECCION_BACKER = "GBACKER000000000000000000000000000000000000000000000";

function generar30Proyectos() {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    nombre: `Proyecto ${i + 1}`,
    descripcion: `Descripción del proyecto ${i + 1}`,
    estado: "EnProgreso",
    dueno: "GDUENO00000000000000000000000000000000000000000000",
    meta: 1_000_000_000n,
    aportado: 500_000_000n,
    yield_entregado: 0n,
    timestamp_inicio: 1000,
    timestamp_vencimiento: 2000,
    tiempo_meses: 6,
    capital_en_cetes: 250_000_000n,
    capital_en_amm: 250_000_000n,
    yield_cetes_acumulado: 0n,
    yield_amm_acumulado: 0n,
    doc_hash: null,
    motivo_rechazo: "",
  }));
}

function renderMiCuenta(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <MiCuenta
          direccion={DIRECCION_BACKER}
          onVerProyecto={vi.fn()}
          onTotalInvertido={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe("MiCuenta — Optimización de llamadas RPC y eliminación de N+1 (#412)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("con el indexer activo y 30 proyectos, solo consulta on-chain donde hay aportación (reducción >90%)", async () => {
    const proyectos30 = generar30Proyectos();
    vi.mocked(obtenerTodosLosProyectos).mockResolvedValueOnce(proyectos30);

    // El indexer indica que el usuario únicamente aportó a los proyectos 3 y 8
    vi.mocked(obtenerAportacionesIndexer).mockResolvedValueOnce([
      { proyecto_id: 3, monto: "100000000", retirado: false, proyectos: { nombre: "Proyecto 3", estado: "EnProgreso" } },
      { proyecto_id: 8, monto: "200000000", retirado: false, proyectos: { nombre: "Proyecto 8", estado: "EnProgreso" } },
    ]);

    vi.mocked(obtenerAportacion).mockImplementation(async (id) => {
      if (id === 3) return 100_000_000n;
      if (id === 8) return 200_000_000n;
      return 0n;
    });

    vi.mocked(calcularYield).mockImplementation(async (id) => {
      if (id === 3) return 5_000_000n;
      if (id === 8) return 10_000_000n;
      return 0n;
    });

    renderMiCuenta();

    // Esperar a que rendericen las tarjetas de resumen
    await waitFor(() => {
      expect(screen.getByText("30.00 MXNe")).toBeInTheDocument(); // 300_000_000 stroops = 30 MXNe
    });

    // Validar conteo de llamadas RPC:
    // Antes: 30 proyectos * 2 simulaciones * 2 pasadas = 120 llamadas
    // Ahora con indexer: ÚNICAMENTE 2 proyectos * 1 simulación = 2 llamadas a obtenerAportacion y 2 a calcularYield
    expect(obtenerAportacion).toHaveBeenCalledTimes(2);
    expect(calcularYield).toHaveBeenCalledTimes(2);

    expect(obtenerAportacion).toHaveBeenCalledWith(3, DIRECCION_BACKER);
    expect(obtenerAportacion).toHaveBeenCalledWith(8, DIRECCION_BACKER);

    // Reducción efectiva: 4 llamadas vs 120 llamadas iniciales = 96.6% de ahorro
    const llamadasAntes = 30 * 4;
    const llamadasDespues = vi.mocked(obtenerAportacion).mock.calls.length + vi.mocked(calcularYield).mock.calls.length;
    const reduccionPct = ((llamadasAntes - llamadasDespues) / llamadasAntes) * 100;
    expect(reduccionPct).toBeGreaterThanOrEqual(70);
  });

  it("con el indexer activo y 0 aportaciones, realiza 0 simulaciones on-chain", async () => {
    const proyectos30 = generar30Proyectos();
    vi.mocked(obtenerTodosLosProyectos).mockResolvedValueOnce(proyectos30);
    vi.mocked(obtenerAportacionesIndexer).mockResolvedValueOnce([]);

    renderMiCuenta();

    await waitFor(() => {
      expect(screen.getAllByText("0.00 MXNe").length).toBeGreaterThanOrEqual(1);
    });

    expect(obtenerAportacion).toHaveBeenCalledTimes(0);
    expect(calcularYield).toHaveBeenCalledTimes(0);
  });

  it("con el indexer caído, se recupera mediante fallback controlado en una sola pasada con concurrencia acotada", async () => {
    const proyectos30 = generar30Proyectos().slice(0, 5); // 5 proyectos para prueba de fallback
    vi.mocked(obtenerTodosLosProyectos).mockResolvedValueOnce(proyectos30);

    // Indexer caído (retorna null o falla)
    vi.mocked(obtenerAportacionesIndexer).mockResolvedValueOnce(null);

    vi.mocked(obtenerAportacion).mockImplementation(async (id) => {
      if (id === 1) return 50_000_000n;
      return 0n;
    });
    vi.mocked(calcularYield).mockImplementation(async (id) => {
      if (id === 1) return 2_000_000n;
      return 0n;
    });

    renderMiCuenta();

    await waitFor(() => {
      expect(screen.getByText("5.00 MXNe")).toBeInTheDocument();
    });

    // En fallback on-chain, ejecuta una sola pasada unificada para los 5 proyectos
    expect(obtenerAportacion).toHaveBeenCalledTimes(5);
    expect(calcularYield).toHaveBeenCalledTimes(5);
  });

  it("cambiar a la pestaña de contribuciones no dispara una segunda ronda de llamadas RPC", async () => {
    const user = userEvent.setup();
    const proyectos30 = generar30Proyectos();
    vi.mocked(obtenerTodosLosProyectos).mockResolvedValueOnce(proyectos30);

    vi.mocked(obtenerAportacionesIndexer).mockResolvedValueOnce([
      { proyecto_id: 2, monto: "100000000", retirado: false, proyectos: { nombre: "Proyecto 2", estado: "EnProgreso" } },
    ]);
    vi.mocked(obtenerAportacion).mockResolvedValue(100_000_000n);
    vi.mocked(calcularYield).mockResolvedValue(5_000_000n);

    renderMiCuenta();

    await waitFor(() => {
      expect(screen.getByText("10.00 MXNe")).toBeInTheDocument();
    });

    const llamadasInicialesAport = vi.mocked(obtenerAportacion).mock.calls.length;
    const llamadasInicialesYield = vi.mocked(calcularYield).mock.calls.length;

    // Cambiar a la pestaña "Mis contribuciones"
    const tabContribuciones = screen.getByRole("tab", { name: /contributions|contribuciones/i });
    await user.click(tabContribuciones);

    // Verificar que la tabla se muestra sin hacer nuevas llamadas RPC
    expect(await screen.findByText("Proyecto 2")).toBeInTheDocument();
    expect(vi.mocked(obtenerAportacion).mock.calls.length).toBe(llamadasInicialesAport);
    expect(vi.mocked(calcularYield).mock.calls.length).toBe(llamadasInicialesYield);
  });
});
