import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { crearThrottle } from '../utils/throttle.js';

describe('crearThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ejecuta la función la primera vez y bloquea llamadas repetidas durante el cooldown', async () => {
    const throttle = crearThrottle(3000);
    const fn = vi.fn(() => Promise.resolve('ok'));

    await expect(throttle.ejecutar(fn)).resolves.toBe('ok');
    await expect(throttle.ejecutar(fn)).rejects.toThrow(/Espera 3 segundos/);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('marca el bloqueo mientras dura el cooldown y lo libera al vencerse', async () => {
    const throttle = crearThrottle(3000);
    const fn = vi.fn(() => Promise.resolve('ok'));

    await throttle.ejecutar(fn);
    expect(throttle.estaBloqueado()).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(throttle.estaBloqueado()).toBe(false);
  });

  it('devuelve el tiempo restante en el mensaje de cooldown', async () => {
    const throttle = crearThrottle(3000);
    const fn = vi.fn(() => Promise.resolve('ok'));

    await throttle.ejecutar(fn);
    await expect(throttle.ejecutar(fn)).rejects.toThrow('Espera 3 segundos antes de intentar de nuevo');
  });
});
