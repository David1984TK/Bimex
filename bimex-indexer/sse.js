// Server-Sent Events (SSE) connection manager with limits, heartbeat, and backpressure protection

import { env } from 'node:process';

// Configuration (environment variables with defaults)
const MAX_PER_IP = parseInt(env.SSE_MAX_CONNECTIONS_PER_IP ?? '5', 10);
const MAX_TOTAL = parseInt(env.SSE_MAX_TOTAL_CONNECTIONS ?? '500', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(env.SSE_HEARTBEAT_INTERVAL_MS ?? '30000', 10);
const MAX_BUFFER_BYTES = parseInt(env.SSE_MAX_BUFFER_BYTES ?? '1048576', 10); // 1 MiB

// Internal state
const connectionsByIp = new Map(); // ip -> Set of Response objects
let totalConnections = 0;
let rejectedConnections = 0;
let slowClientsDisconnected = 0;
let heartbeatFailures = 0;

/**
 * Register a new SSE client.
 * Returns true if the connection was accepted, false otherwise (response already ended).
 */
export function agregarCliente(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString();
  const perIpSet = connectionsByIp.get(ip) ?? new Set();

  // Enforce limits
  if (perIpSet.size >= MAX_PER_IP || totalConnections >= MAX_TOTAL) {
    rejectedConnections++;
    try {
      res.writeHead(429, { 'Content-Type': 'text/plain' });
      res.end('Connection limit exceeded');
    } catch (_) {
      // ignore any write errors
    }
    return false;
  }

  // Register the connection
  perIpSet.add(res);
  connectionsByIp.set(ip, perIpSet);
  totalConnections++;

  // Heartbeat timer – sends a comment line every interval to keep the connection alive
  const hbTimer = setInterval(() => {
    try {
      res.write(':heartbeat\n\n'); // SSE comment (colon prefix) as keep‑alive
    } catch (e) {
      // Failed to write heartbeat – treat as a failure
      heartbeatFailures++;
      cleanup();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Backpressure handling – monitor write() return value and buffer size
  const originalWrite = res.write.bind(res);
  res.write = (chunk, encoding, callback) => {
    const ok = originalWrite(chunk, encoding, callback);
    // If the internal buffer is beyond the limit, disconnect the client
    if (!ok && res.writableLength > MAX_BUFFER_BYTES) {
      slowClientsDisconnected++;
      cleanup();
      return false;
    }
    return ok;
  };

  // Cleanup logic for when the client disconnects or an error occurs
  const cleanup = () => {
    clearInterval(hbTimer);
    perIpSet.delete(res);
    if (perIpSet.size === 0) {
      connectionsByIp.delete(ip);
    }
    totalConnections--;
    // Remove listeners to avoid memory leaks
    res.removeAllListeners('close');
    res.removeAllListeners('error');
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  return true;
}

/**
 * Remove a client explicitly (used when the request is closed).
 */
export function eliminarCliente(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString();
  const perIpSet = connectionsByIp.get(ip);
  if (perIpSet) {
    perIpSet.delete(res);
    if (perIpSet.size === 0) connectionsByIp.delete(ip);
    totalConnections--;
  }
}

/**
 * Broadcast an event to all active SSE clients.
 */
export function notificarClientes(tipo, datos) {
  const msg = `event: ${tipo}\n` + `data: ${JSON.stringify(datos)}\n\n`;
  // Iterate over a snapshot of all connections to avoid mutation issues during iteration
  for (const perIpSet of connectionsByIp.values()) {
    for (const cliente of perIpSet) {
      try {
        cliente.write(msg);
      } catch (_) {
        // If writing fails, clean up the client
        cliente.end();
        // Force cleanup via eliminarCliente – we lack request, approximate removal
        for (const [ipKey, set] of connectionsByIp.entries()) {
          if (set.has(cliente)) {
            set.delete(cliente);
            if (set.size === 0) connectionsByIp.delete(ipKey);
            totalConnections--;
            break;
          }
        }
      }
    }
  }
}

/**
 * Export metrics for the /health endpoint.
 */
export function getSseMetrics() {
  return {
    activeSseConnections: totalConnections,
    connectionsPerIpLimit: MAX_PER_IP,
    totalConnectionsLimit: MAX_TOTAL,
    slowClientsDisconnected,
    rejectedConnections,
    heartbeatFailures,
  };
}
