import 'dotenv/config';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { parseTx } from './eventParser.js';
import { upsertProyecto, upsertAportacion, insertEvento, getLastIndexedLedger } from './database.js';
import { notificarClientes } from './sse.js';
import './api.js'; // start HTTP + SSE server in the same process

const RPC_URL         = process.env.STELLAR_RPC_URL;
const CONTRACT_ID     = process.env.CONTRACT_ID;
const START_LEDGER    = parseInt(process.env.START_LEDGER ?? '0', 10);
const POLL_INTERVAL   = parseInt(process.env.POLL_INTERVAL_MS ?? '10000', 10);

const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

async function getStartLedger() {
  if (START_LEDGER > 0) return START_LEDGER;
  const last = await getLastIndexedLedger();
  if (last) return last + 1;
  const latest = await rpc.getLatestLedger();
  return latest.sequence;
}

async function processBatch(startLedger) {
  const resp = await rpc.getTransactions({
    startLedger,
    pagination: { limit: 200 },
  });

  for (const tx of resp.transactions ?? []) {
    if (tx.status !== 'SUCCESS') continue;
    const parsed = parseTx(tx, CONTRACT_ID);
    if (!parsed) continue;

    const { evento, proyecto, aportacion } = parsed;
    await insertEvento(evento).catch(console.error);
    if (proyecto)   { await upsertProyecto(proyecto).catch(console.error); notificarClientes('proyecto_actualizado', { id: proyecto.id, estado: proyecto.estado }); }
    if (aportacion) { await upsertAportacion(aportacion).catch(console.error); notificarClientes('nueva_contribucion', { proyectoId: aportacion.proyecto_id, monto: aportacion.monto }); }
    if (evento.tipo === 'yield_reclamado') notificarClientes('yield_reclamado', { proyectoId: evento.proyecto_id, monto: evento.monto });

    console.log(`[${new Date().toISOString()}] ${evento.tipo} ledger=${evento.ledger} tx=${evento.tx_hash}`);
  }

  // cursor is the ledger sequence to use as startLedger on the next call.
  // When we've caught up to the tip, cursor equals latestLedger + 1.
  return resp.cursor ?? resp.latestLedger + 1;
}

async function run() {
  let cursor = await getStartLedger();
  console.log(`Bimex indexer starting at ledger ${cursor}`);

  while (true) {
    try {
      cursor = await processBatch(cursor);
    } catch (err) {
      console.error('Poll error:', err.message);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

run();
