import 'dotenv/config';
import http from 'node:http';
import { rpc } from '@stellar/stellar-sdk';
import { upsertProyecto, upsertAportacion, insertEvento, insertAuditLog, getLastIndexedLedger, countEventsLastHour, supabaseOk } from './database.js';
import { notificarClientes, getSseMetrics } from './sse.js';
import { setCorsHeaders } from './api.js'; // start HTTP + SSE server in the same process
import { processBatch } from './processor.js';

const RPC_URL         = process.env.STELLAR_RPC_URL;
const CONTRACT_ID     = process.env.CONTRACT_ID;
const START_LEDGER    = parseInt(process.env.START_LEDGER ?? '0', 10);
const POLL_INTERVAL   = parseInt(process.env.POLL_INTERVAL_MS ?? '10000', 10);

const soroban = new rpc.Server(RPC_URL, { allowHttp: false });

export const estadoIndexer = {
  ultimoLedger: 0,
  txProcesadas: 0,
  ultimaActualizacion: null,
  supabaseOk: true,
  rpcLatencyMs: null,
  processStartTime: Date.now(),
  escriturasFallidas: 0,
  ledgerAtascado: null,
  ultimoErrorEscritura: null,
  ciclosAtascado: 0,
};

http.createServer(async (req, res) => {
  if (req.url === '/health') {
    const eventsLastHour = await countEventsLastHour().catch(() => null);
    const uptimeSeconds = Math.floor((Date.now() - estadoIndexer.processStartTime) / 1000);
    const lagSeconds = Math.max(0, Math.floor(Date.now() / 1000) - estadoIndexer.ultimoLedger);
    const sseMetrics = getSseMetrics();
    setCorsHeaders(req, res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      lastBlockIndexed: estadoIndexer.ultimoLedger,
      lagSeconds: lagSeconds,
      rpcLatencyMs: estadoIndexer.rpcLatencyMs,
      supabaseOk: supabaseOk,
      eventsLastHour: eventsLastHour ?? 0,
      uptime: uptimeSeconds,
      sseConnections: sseMetrics,
      escriturasFallidas: estadoIndexer.escriturasFallidas,
      ledgerAtascado: estadoIndexer.ledgerAtascado,
      ultimoErrorEscritura: estadoIndexer.ultimoErrorEscritura,
      ciclosAtascado: estadoIndexer.ciclosAtascado,
    }));
    return;
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}).listen(parseInt(process.env.HEALTH_PORT ?? '3001', 10), () => {
  console.log(`Bimex Indexer Health Server listening on port ${process.env.HEALTH_PORT ?? '3001'}`);
});

async function getStartLedger() {
  if (START_LEDGER > 0) return START_LEDGER;
  const last = await getLastIndexedLedger();
  if (last) {
    estadoIndexer.ultimoLedger = last;
    return last + 1;
  }
  const latest = await soroban.getLatestLedger();
  estadoIndexer.ultimoLedger = latest.sequence;
  return latest.sequence;
}

async function runOnce(startLedger) {
  const result = await processBatch(startLedger, {
    soroban,
    contractId: CONTRACT_ID,
    insertEvento,
    upsertProyecto,
    upsertAportacion,
    insertAuditLog,
    notificarClientes,
    estado: estadoIndexer,
  });
  if (result.ok) return result.cursor;
  return result.retryFromLedger;
}

async function run() {
  let cursor = await getStartLedger();
  console.log(`Bimex indexer starting at ledger ${cursor}`);

  while (true) {
    try {
      cursor = await runOnce(cursor);
    } catch (err) {
      console.error('Poll error:', err.message);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}

export { runOnce };
