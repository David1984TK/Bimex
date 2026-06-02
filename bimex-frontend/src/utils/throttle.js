export function crearThrottle(delayMs = 3000) {
  let ultimaLlamada = 0;

  return {
    ejecutar: function (fn) {
      const ahora = Date.now();
      const diferencia = ahora - ultimaLlamada;

      if (diferencia < delayMs) {
        const segundosRestantes = Math.max(1, Math.ceil((delayMs - diferencia) / 1000));
        return Promise.reject(new Error(`Espera ${segundosRestantes} segundos antes de intentar de nuevo`));
      }

      ultimaLlamada = ahora;
      return fn();
    },
    estaBloqueado: function () {
      const ahora = Date.now();
      return ahora - ultimaLlamada < delayMs;
    }
  };
}
