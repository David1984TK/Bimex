// Shared SSE client registry — imported by both api.js and index.js
const clientes = new Set();

export function agregarCliente(res) {
  clientes.add(res);
}

export function eliminarCliente(res) {
  clientes.delete(res);
}

export function notificarClientes(tipo, datos) {
  const msg = `event: ${tipo}\ndata: ${JSON.stringify(datos)}\n\n`;
  for (const cliente of clientes) {
    try { cliente.write(msg); } catch { clientes.delete(cliente); }
  }
}
