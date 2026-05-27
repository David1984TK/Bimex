export function crearThrottle(delayMs = 3000) {
  let ultimaLlamada = 0;
  let tiempoRestante = 0;

  return {
    ejecutar: function (fn) {
      const ahora = Date.now();
      const diferencia = ahora - ultimaLlamada;

      if (diferencia < delayMs) {
        tiempoRestante = Math.ceil((delayMs - diferencia) / 1000);
        return Promise.reject(new Error(`Espera ${tiempoRestante} segundos antes de intentar de nuevo`));
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
