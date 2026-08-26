import { describe, it, expect, vi, beforeEach } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    constructor() {
      this.emails = { send: sendMock };
    }
  },
}));

// Replace every template with a stub that echoes the data it received so we can
// assert the notification layer forwards the right payload to each template.
vi.mock('../templates/index.js', () => {
  const stub = name => vi.fn(data => `[${name}] ${JSON.stringify(data)}`);
  return {
    tmplAprobado: stub('tmplAprobado'),
    tmplRechazado: stub('tmplRechazado'),
    tmplFinanciado: stub('tmplFinanciado'),
    tmplYield: stub('tmplYield'),
    tmplRetiro: stub('tmplRetiro'),
    tmplBienvenida: stub('tmplBienvenida'),
    tmplContribucion: stub('tmplContribucion'),
    tmplAprobacionHTML: stub('tmplAprobacionHTML'),
    tmplYieldDisponible: stub('tmplYieldDisponible'),
  };
});

import { enviarNotificacion } from '../notifications.js';
import * as templates from '../templates/index.js';

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockResolvedValue({ error: null });
});

describe('enviarNotificacion', () => {
  it('throws on an unknown event type and never calls the email provider', async () => {
    await expect(enviarNotificacion('evento_inexistente', 'a@b.com', {}))
      .rejects.toThrow('Tipo de evento desconocido: evento_inexistente');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends proyecto_aprobado with the legacy template, subject and recipient', async () => {
    await enviarNotificacion('proyecto_aprobado', 'owner@example.com', {
      nombreProyecto: 'Pozo de agua',
      idProyecto: 7,
    });

    expect(templates.tmplAprobado).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const arg = sendMock.mock.calls[0][0];
    expect(arg.to).toBe('owner@example.com');
    expect(arg.from).toBe('Bimex <notificaciones@bimex.fi>');
    expect(arg.subject).toBe('✅ Tu proyecto Bimex ha sido aprobado');
    expect(arg.html).toContain('[tmplAprobado]');
  });

  it('builds a default proyectoUrl from idProyecto and passes it to the template', async () => {
    await enviarNotificacion('nueva_contribucion', 'c@example.com', { idProyecto: 42 });

    const base = process.env.FRONTEND_URL ?? 'https://bimex.fi';
    const dataPassed = templates.tmplContribucion.mock.calls[0][0];
    expect(dataPassed.proyectoUrl).toBe(`${base}/?proyecto=42`);
  });

  it('respects an explicit proyectoUrl when provided', async () => {
    await enviarNotificacion('yield_disponible', 'y@example.com', {
      idProyecto: 1,
      proyectoUrl: 'https://custom.example/p/1',
    });

    const dataPassed = templates.tmplYield.mock.calls[0][0];
    expect(dataPassed.proyectoUrl).toBe('https://custom.example/p/1');
  });

  it.each([
    ['proyecto_aprobado', 'tmplAprobado', '✅ Tu proyecto Bimex ha sido aprobado'],
    ['proyecto_rechazado', 'tmplRechazado', '❌ Tu proyecto Bimex ha sido rechazado'],
    ['meta_alcanzada', 'tmplFinanciado', '🎉 ¡Tu proyecto alcanzó su meta de financiamiento!'],
    ['yield_disponible', 'tmplYield', '💰 Tienes yield disponible para reclamar'],
    ['retiro_principal', 'tmplRetiro', '🏦 Se realizó un retiro de principal en tu proyecto'],
    ['bienvenida', 'tmplBienvenida', '🎉 ¡Bienvenido a Bimex!'],
    ['nueva_contribucion', 'tmplContribucion', '💰 Nueva contribución recibida en tu proyecto'],
    ['proyecto_aprobado_html', 'tmplAprobacionHTML', '✅ Tu proyecto Bimex ha sido aprobado'],
    ['yield_disponible_html', 'tmplYieldDisponible', '💰 Tienes yield disponible para reclamar'],
  ])('event %s -> template %s with its subject', async (evento, tmplName, subject) => {
    await enviarNotificacion(evento, 'dest@example.com', { idProyecto: 3 });

    expect(templates[tmplName]).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].subject).toBe(subject);
    expect(sendMock.mock.calls[0][0].html).toContain(`[${tmplName}]`);
  });

  it('propagates provider failures as an error', async () => {
    sendMock.mockResolvedValueOnce({ error: { message: 'rate limited' } });
    await expect(enviarNotificacion('bienvenida', 'x@example.com', {}))
      .rejects.toThrow(/Resend error/);
  });
});
