import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n/index.js";
import CrearProyecto from "../components/CrearProyecto.jsx";
import { parsearError } from "../utils/errores.js";
import { subirConFallback, validarArchivo } from "../utils/ipfs";
import { crearProyecto, hashearDocumentos } from "../stellar/contrato";

vi.mock("../stellar/contrato", () => ({
  CONFIG: {},
  crearProyecto: vi.fn(),
  hashearDocumentos: vi.fn(),
  mxneAStroops: vi.fn((mxne) => BigInt(Math.round(Number(mxne) * 10_000_000))),
}));

// validarArchivo is pure and stays real; only the upload (network) is mocked.
vi.mock("../utils/ipfs", async (importOriginal) => ({
  ...(await importOriginal()),
  subirConFallback: vi.fn(),
}));

const DUENO = "GOWNER0000000000000000000000000000000000000000000000";

const pdf = (name) => new File(["%PDF-1.4"], name, { type: "application/pdf" });

function renderCrear(props = {}) {
  const handlers = { onCerrar: vi.fn(), onCreado: vi.fn(), onError: vi.fn(), ...props };
  render(
    <I18nextProvider i18n={i18n}>
      <CrearProyecto direccion={DUENO} {...handlers} />
    </I18nextProvider>,
  );
  return handlers;
}

// Pegar en vez de teclear: un solo evento de cambio por campo, mucho más rápido.
async function escribir(user, label, valor) {
  await user.click(screen.getByLabelText(label));
  await user.paste(valor);
}

async function llenarPaso1(user, { nombre = "Huerto Comunitario", meta = "5000", meses = "12" } = {}) {
  if (nombre) await escribir(user, i18n.t("crear.nameLabel"), nombre);
  if (meta) await escribir(user, i18n.t("crear.goalLabel"), meta);
  if (meses) await escribir(user, i18n.t("crear.timeLabel"), meses);
  await user.click(screen.getByRole("button", { name: i18n.t("crear.nextDocs") }));
}

async function subirDocs(user, archivos = {}) {
  const { ine = pdf("ine.pdf"), plan = pdf("plan.pdf"), presupuesto = pdf("presupuesto.pdf") } = archivos;
  await user.upload(document.getElementById("doc-ine"), ine);
  await user.upload(document.getElementById("doc-plan"), plan);
  await user.upload(document.getElementById("doc-presupuesto"), presupuesto);
}

async function enviarFormulario(user) {
  await llenarPaso1(user);
  await subirDocs(user);
  await user.click(screen.getByRole("button", { name: i18n.t("crear.generateHash") }));
  await user.click(await screen.findByRole("button", { name: i18n.t("crear.submit") }));
}

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("es");
});

afterEach(() => {
  cleanup();
});

describe("CrearProyecto: paso 1", () => {
  it("exige un nombre", async () => {
    const user = userEvent.setup();
    renderCrear();

    await llenarPaso1(user, { nombre: "" });

    expect(screen.getByRole("alert")).toHaveTextContent(i18n.t("crear.errName"));
    expect(screen.getByLabelText(i18n.t("crear.nameLabel"))).toBeInTheDocument();
  });

  it("exige una meta mayor a cero", async () => {
    const user = userEvent.setup();
    renderCrear();

    await llenarPaso1(user, { meta: "0" });

    expect(screen.getByRole("alert")).toHaveTextContent(i18n.t("crear.errGoal"));
  });

  it("deja solo dígitos en la meta y limita el plazo a 120 meses", async () => {
    const user = userEvent.setup();
    renderCrear();

    await user.type(screen.getByLabelText(i18n.t("crear.goalLabel")), "12a34");
    await user.type(screen.getByLabelText(i18n.t("crear.timeLabel")), "500");

    expect(screen.getByLabelText(i18n.t("crear.goalLabel"))).toHaveValue("1,234");
    expect(screen.getByLabelText(i18n.t("crear.timeLabel"))).toHaveValue(120);
  });
});

describe("CrearProyecto: paso 2", () => {
  it("rechaza un tipo de archivo no permitido y no deja avanzar", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderCrear();
    await llenarPaso1(user);

    const txt = new File(["hola"], "ine.txt", { type: "text/plain" });
    await subirDocs(user, { ine: txt });

    expect(screen.getByRole("alert")).toHaveTextContent(validarArchivo(txt).error);
    expect(screen.getByRole("button", { name: i18n.t("crear.generateHash") })).toBeDisabled();
    expect(subirConFallback).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que supera el tamaño máximo", async () => {
    const user = userEvent.setup();
    renderCrear();
    await llenarPaso1(user);

    const grande = pdf("plan.pdf");
    Object.defineProperty(grande, "size", { value: 11 * 1024 * 1024 });
    await subirDocs(user, { plan: grande });

    expect(screen.getByRole("alert")).toHaveTextContent(validarArchivo(grande).error);
    expect(screen.getByRole("button", { name: i18n.t("crear.generateHash") })).toBeDisabled();
  });

  it("no deja avanzar sin los tres documentos", async () => {
    const user = userEvent.setup();
    renderCrear();
    await llenarPaso1(user);

    await user.upload(document.getElementById("doc-ine"), pdf("ine.pdf"));

    expect(screen.getByRole("button", { name: i18n.t("crear.generateHash") })).toBeDisabled();
  });
});

describe("CrearProyecto: paso 3", () => {
  it("crea el proyecto con los CIDs de IPFS y los parámetros del formulario", async () => {
    const user = userEvent.setup();
    subirConFallback
      .mockResolvedValueOnce({ cid: "cidIne", usedFallback: false })
      .mockResolvedValueOnce({ cid: "cidPlan", usedFallback: false })
      .mockResolvedValueOnce({ cid: "cidPres", usedFallback: false });
    crearProyecto.mockResolvedValueOnce();
    const { onCreado } = renderCrear();

    await enviarFormulario(user);

    expect(hashearDocumentos).not.toHaveBeenCalled();
    expect(crearProyecto).toHaveBeenCalledWith(
      DUENO,
      "Huerto Comunitario",
      50_000_000_000n,
      "cidIne|cidPlan|cidPres",
      12,
    );
    expect(onCreado).toHaveBeenCalledTimes(1);
  });

  it("usa el hash SHA-256 en hex si algún documento no llegó a IPFS", async () => {
    const user = userEvent.setup();
    subirConFallback
      .mockResolvedValueOnce({ cid: "cidIne", usedFallback: false })
      .mockResolvedValueOnce({ cid: "local", usedFallback: true })
      .mockResolvedValueOnce({ cid: "cidPres", usedFallback: false });
    hashearDocumentos.mockResolvedValueOnce(new Uint8Array(32).fill(0xab));
    crearProyecto.mockResolvedValueOnce();
    renderCrear();

    await enviarFormulario(user);

    expect(hashearDocumentos).toHaveBeenCalledTimes(1);
    expect(crearProyecto).toHaveBeenCalledWith(
      DUENO,
      "Huerto Comunitario",
      50_000_000_000n,
      "ab".repeat(32),
      12,
    );
  });

  it("muestra el error del contrato y no cierra el modal si la firma falla", async () => {
    const user = userEvent.setup();
    const err = new Error("Error(Contract, #1)");
    subirConFallback.mockResolvedValue({ cid: "cid", usedFallback: false });
    crearProyecto.mockRejectedValueOnce(err);
    const { onCreado, onError } = renderCrear();

    await enviarFormulario(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(parsearError(err));
    expect(onError).toHaveBeenCalledWith(err);
    expect(onCreado).not.toHaveBeenCalled();
  });
});

describe("CrearProyecto: modal", () => {
  it("se cierra con Escape y con el botón de cerrar", async () => {
    const user = userEvent.setup();
    const { onCerrar } = renderCrear();

    await user.keyboard("{Escape}");
    expect(onCerrar).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: i18n.t("crear.closeAria") }));
    expect(onCerrar).toHaveBeenCalledTimes(2);
  });

  it("atrapa el foco dentro del modal", async () => {
    const user = userEvent.setup();
    renderCrear();

    const cerrar = screen.getByRole("button", { name: i18n.t("crear.closeAria") });
    const siguiente = screen.getByRole("button", { name: i18n.t("crear.nextDocs") });

    expect(screen.getByRole("dialog")).toHaveFocus();

    await user.tab();
    expect(cerrar).toHaveFocus();

    await user.tab({ shift: true });
    expect(siguiente).toHaveFocus();

    await user.tab();
    expect(cerrar).toHaveFocus();
  });
});
