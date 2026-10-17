import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index.js";
import CrearProyecto from "../components/CrearProyecto.jsx";
import {
  crearProyecto as crearProyectoContrato,
  hashearDocumentos,
} from "../stellar/contrato";
import { subirConFallback } from "../utils/ipfs";

vi.mock("../stellar/contrato", () => ({
  crearProyecto: vi.fn(),
  mxneAStroops: vi.fn((mxne) => BigInt(Math.round(Number(mxne) * 10_000_000))),
  hashearDocumentos: vi.fn(),
  CONFIG: {
    NETWORK: "testnet",
  },
}));

vi.mock("../utils/ipfs", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    subirConFallback: vi.fn(),
  };
});

const USER_ADDR = "GCREATOR000000000000000000000000000000000000000000000";

function renderCrearProyecto(props = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <CrearProyecto
        direccion={USER_ADDR}
        onCerrar={props.onCerrar ?? vi.fn()}
        onCreado={props.onCreado ?? vi.fn()}
        onError={props.onError ?? vi.fn()}
        {...props}
      />
    </I18nextProvider>
  );
}

describe("CrearProyecto", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("es");
  });

  afterEach(() => {
    cleanup();
  });

  describe("Paso 1: Validación de campos del formulario", () => {
    it("muestra error si el nombre del proyecto está vacío", async () => {
      renderCrearProyecto();

      const btnSiguiente = screen.getByRole("button", { name: "Siguiente: Documentos →" });
      await userEvent.click(btnSiguiente);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("El nombre del proyecto es obligatorio.");
    });

    it("muestra error si la meta es 0 o vacía", async () => {
      renderCrearProyecto();

      const inputNombre = screen.getByLabelText(/Nombre del proyecto/i);
      await userEvent.type(inputNombre, "Huerto Solar Comunitario");

      const btnSiguiente = screen.getByRole("button", { name: "Siguiente: Documentos →" });
      await userEvent.click(btnSiguiente);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("La meta debe ser mayor a 0.");
    });

    it("avanza al paso 2 cuando los campos son válidos", async () => {
      renderCrearProyecto();

      await userEvent.type(screen.getByLabelText(/Nombre del proyecto/i), "Huerto Solar");
      await userEvent.type(screen.getByLabelText(/Meta de financiamiento/i), "50000");
      await userEvent.type(screen.getByLabelText(/Tiempo estimado/i), "12");

      const btnSiguiente = screen.getByRole("button", { name: "Siguiente: Documentos →" });
      await userEvent.click(btnSiguiente);

      expect(await screen.findByText("INE / Identificación oficial")).toBeInTheDocument();
      expect(screen.getByText("Plan del proyecto")).toBeInTheDocument();
      expect(screen.getByText("Presupuesto detallado")).toBeInTheDocument();
    });
  });

  describe("Paso 2: Validación y rechazo de archivos", () => {
    async function irAPaso2() {
      renderCrearProyecto();
      await userEvent.type(screen.getByLabelText(/Nombre del proyecto/i), "Huerto Solar");
      await userEvent.type(screen.getByLabelText(/Meta de financiamiento/i), "50000");
      await userEvent.type(screen.getByLabelText(/Tiempo estimado/i), "12");
      await userEvent.click(screen.getByRole("button", { name: "Siguiente: Documentos →" }));
      await screen.findByText("INE / Identificación oficial");
    }

    it("rechaza archivos con tipo no permitido", async () => {
      await irAPaso2();

      const fileInputs = document.querySelectorAll('input[type="file"]');
      expect(fileInputs.length).toBe(3);

      const archivoInvalido = new File(["dummy text"], "virus.exe", {
        type: "application/x-msdownload",
      });

      fireEvent.change(fileInputs[0], { target: { files: [archivoInvalido] } });

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Tipo no permitido");

      const btnHash = screen.getByRole("button", { name: "Generar huella digital →" });
      expect(btnHash).toBeDisabled();
    });

    it("rechaza archivos que superan el tamaño máximo de 10 MB", async () => {
      await irAPaso2();

      const fileInputs = document.querySelectorAll('input[type="file"]');
      const archivoGrande = new File(["dummy"], "archivo_pesado.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(archivoGrande, "size", { value: 12 * 1024 * 1024 });

      fireEvent.change(fileInputs[1], { target: { files: [archivoGrande] } });

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("El archivo supera el límite de 10MB");

      const btnHash = screen.getByRole("button", { name: "Generar huella digital →" });
      expect(btnHash).toBeDisabled();
    });

    it("permite subir los tres documentos válidos y habilita el botón de continuar", async () => {
      await irAPaso2();

      const fileInputs = document.querySelectorAll('input[type="file"]');

      const fileIne = new File(["ine content"], "ine.pdf", { type: "application/pdf" });
      const filePlan = new File(["plan content"], "plan.pdf", { type: "application/pdf" });
      const filePresupuesto = new File(["presupuesto content"], "presupuesto.pdf", {
        type: "application/pdf",
      });

      fireEvent.change(fileInputs[0], { target: { files: [fileIne] } });
      fireEvent.change(fileInputs[1], { target: { files: [filePlan] } });
      fireEvent.change(fileInputs[2], { target: { files: [filePresupuesto] } });

      expect(await screen.findByText("ine.pdf")).toBeInTheDocument();
      expect(screen.getByText("plan.pdf")).toBeInTheDocument();
      expect(screen.getByText("presupuesto.pdf")).toBeInTheDocument();

      const btnHash = screen.getByRole("button", { name: "Generar huella digital →" });
      expect(btnHash).not.toBeDisabled();
    });

    it("permite regresar al paso 1 mediante el botón Atrás", async () => {
      await irAPaso2();

      const btnAtras = screen.getByRole("button", { name: "← Atrás" });
      await userEvent.click(btnAtras);

      expect(await screen.findByLabelText(/Nombre del proyecto/i)).toHaveValue("Huerto Solar");
    });
  });

  describe("Paso 3: Subida a IPFS, llamada al contrato y creación exitosa", () => {
    it("sube documentos a IPFS y ejecuta crearProyecto en el contrato con los parámetros correctos", async () => {
      const onCreado = vi.fn();
      renderCrearProyecto({ onCreado });

      // Paso 1
      await userEvent.type(screen.getByLabelText(/Nombre del proyecto/i), "Paneles Chiapas");
      await userEvent.type(screen.getByLabelText(/Meta de financiamiento/i), "100000");
      await userEvent.type(screen.getByLabelText(/Tiempo estimado/i), "24");
      await userEvent.click(screen.getByRole("button", { name: "Siguiente: Documentos →" }));

      // Paso 2
      await screen.findByText("INE / Identificación oficial");
      const fileInputs = document.querySelectorAll('input[type="file"]');

      const fileIne = new File(["ine"], "ine.pdf", { type: "application/pdf" });
      const filePlan = new File(["plan"], "plan.pdf", { type: "application/pdf" });
      const filePresupuesto = new File(["presupuesto"], "presupuesto.pdf", {
        type: "application/pdf",
      });

      fireEvent.change(fileInputs[0], { target: { files: [fileIne] } });
      fireEvent.change(fileInputs[1], { target: { files: [filePlan] } });
      fireEvent.change(fileInputs[2], { target: { files: [filePresupuesto] } });

      subirConFallback
        .mockResolvedValueOnce({ cid: "QmIne1111111111111111111111111111111111111111", usedFallback: false })
        .mockResolvedValueOnce({ cid: "QmPlan222222222222222222222222222222222222222", usedFallback: false })
        .mockResolvedValueOnce({ cid: "QmPres333333333333333333333333333333333333333", usedFallback: false });

      const btnHash = await screen.findByRole("button", { name: "Generar huella digital →" });
      await userEvent.click(btnHash);

      // Paso 3
      expect(await screen.findByText("Paneles Chiapas")).toBeInTheDocument();
      expect(screen.getByText("Documentos en IPFS")).toBeInTheDocument();

      crearProyectoContrato.mockResolvedValueOnce(undefined);

      const btnCrear = screen.getByRole("button", { name: "📬 Mandar a revisión" });
      await userEvent.click(btnCrear);

      await waitFor(() => {
        expect(crearProyectoContrato).toHaveBeenCalledWith(
          USER_ADDR,
          "Paneles Chiapas",
          1_000_000_000_000n, // 100,000 MXNe * 10,000,000
          "QmIne1111111111111111111111111111111111111111|QmPlan222222222222222222222222222222222222222|QmPres333333333333333333333333333333333333333",
          24
        );
      });

      expect(onCreado).toHaveBeenCalledTimes(1);
    });

    it("utiliza fallback local de hash SHA-256 si falla la subida a IPFS", async () => {
      renderCrearProyecto();

      await userEvent.type(screen.getByLabelText(/Nombre del proyecto/i), "Proyecto Sin IPFS");
      await userEvent.type(screen.getByLabelText(/Meta de financiamiento/i), "20000");
      await userEvent.click(screen.getByRole("button", { name: "Siguiente: Documentos →" }));

      await screen.findByText("INE / Identificación oficial");
      const fileInputs = document.querySelectorAll('input[type="file"]');

      const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
      fireEvent.change(fileInputs[0], { target: { files: [file] } });
      fireEvent.change(fileInputs[1], { target: { files: [file] } });
      fireEvent.change(fileInputs[2], { target: { files: [file] } });

      subirConFallback.mockResolvedValue({ cid: null, usedFallback: true });
      const hashBytes = new Uint8Array([0xab, 0xcd, 0xef, 0x12]);
      hashearDocumentos.mockResolvedValueOnce(hashBytes);

      await userEvent.click(screen.getByRole("button", { name: "Generar huella digital →" }));

      expect(await screen.findByText("🔐 Huella digital de tus documentos (SHA-256)")).toBeInTheDocument();
      expect(screen.getByText("abcdef12")).toBeInTheDocument();
    });

    it("muestra mensaje de error si crearProyecto en el contrato falla", async () => {
      const onError = vi.fn();
      renderCrearProyecto({ onError });

      await userEvent.type(screen.getByLabelText(/Nombre del proyecto/i), "Proyecto Fallido");
      await userEvent.type(screen.getByLabelText(/Meta de financiamiento/i), "10000");
      await userEvent.click(screen.getByRole("button", { name: "Siguiente: Documentos →" }));

      await screen.findByText("INE / Identificación oficial");
      const fileInputs = document.querySelectorAll('input[type="file"]');
      const file = new File(["dummy"], "file.pdf", { type: "application/pdf" });
      fireEvent.change(fileInputs[0], { target: { files: [file] } });
      fireEvent.change(fileInputs[1], { target: { files: [file] } });
      fireEvent.change(fileInputs[2], { target: { files: [file] } });

      subirConFallback.mockResolvedValue({ cid: "QmTest123", usedFallback: false });
      await userEvent.click(screen.getByRole("button", { name: "Generar huella digital →" }));

      await screen.findByText("📬 Mandar a revisión");

      const contractError = new Error("Saldo insuficiente de gas");
      crearProyectoContrato.mockRejectedValueOnce(contractError);

      await userEvent.click(screen.getByRole("button", { name: "📬 Mandar a revisión" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Saldo insuficiente de gas");
      expect(onError).toHaveBeenCalledWith(contractError);
    });
  });

  describe("Accesibilidad, Escape y Focus Trap", () => {
    it("cierra el modal con tecla Escape", async () => {
      const onCerrar = vi.fn();
      renderCrearProyecto({ onCerrar });

      await userEvent.keyboard("{Escape}");
      expect(onCerrar).toHaveBeenCalledTimes(1);
    });

    it("cierra el modal al pulsar el botón de cerrar", async () => {
      const onCerrar = vi.fn();
      renderCrearProyecto({ onCerrar });

      const closeBtn = screen.getByRole("button", { name: "Cerrar formulario de creación" });
      await userEvent.click(closeBtn);
      expect(onCerrar).toHaveBeenCalledTimes(1);
    });

    it("cierra el modal al pulsar el botón Cancelar", async () => {
      const onCerrar = vi.fn();
      renderCrearProyecto({ onCerrar });

      const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
      await userEvent.click(cancelBtn);
      expect(onCerrar).toHaveBeenCalledTimes(1);
    });

    it("atrapa el foco dentro del modal", async () => {
      const onCerrar = vi.fn();
      renderCrearProyecto({ onCerrar });

      const modalDialog = screen.getByRole("dialog");
      expect(document.activeElement).toBe(modalDialog);

      const focusables = modalDialog.querySelectorAll(
        'button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];

      // Tab desde el último elemento vuelve al primero
      ultimo.focus();
      expect(document.activeElement).toBe(ultimo);
      await userEvent.tab();
      expect(document.activeElement).toBe(primero);

      // Shift+Tab desde el primer elemento va al último
      primero.focus();
      expect(document.activeElement).toBe(primero);
      await userEvent.tab({ shift: true });
      expect(document.activeElement).toBe(ultimo);
    });
  });
});
