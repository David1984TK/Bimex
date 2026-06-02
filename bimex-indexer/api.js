import 'dotenv/config';
import http from 'node:http';
import { Contract, rpc, TransactionBuilder, Networks, Address, Keypair, nativeToScVal } from '@stellar/stellar-sdk';
import supabase from './database.js';
import { agregarCliente, eliminarCliente } from './sse.js';

const PORT = parseInt(process.env.API_PORT ?? '3002', 10);

// ─── Rate limiter: 3 requests per wallet per hour ────────────────────────
const rateLimitMap = new Map();
const RL_MAX = 3;
const RL_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(wallet) {
  const now = Date.now();
  const entries = rateLimitMap.get(wallet) || [];
  const recent = entries.filter(t => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) return false;
  recent.push(now);
  rateLimitMap.set(wallet, recent);
  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Cuerpo inválido: se esperaba JSON')); }
    });
    req.on('error', reject);
  });
}

// ─── Faucet — TESTNET ONLY ───────────────────────────────────────────────

const FAUCET_RPC        = new rpc.Server(process.env.STELLAR_RPC_URL, { allowHttp: false });
const FAUCET_TOKEN_ID   = process.env.TOKEN_MXNE;
const FAUCET_SECRET     = process.env.FAUCET_SECRET;
const FAUCET_KEYPAIR    = FAUCET_SECRET ? Keypair.fromSecret(FAUCET_SECRET) : null;

async function mintearMXNe(destino, cantidad = BigInt(1_000_000_000)) {
  if (!FAUCET_SECRET || !FAUCET_KEYPAIR) throw new Error('Faucet no configurado (FAUCET_SECRET)');
  if (!FAUCET_TOKEN_ID) throw new Error('Token MXNe no configurado (TOKEN_MXNE)');

  const tokenContrato = new Contract(FAUCET_TOKEN_ID);
  const cuentaInfo    = await FAUCET_RPC.getAccount(FAUCET_KEYPAIR.publicKey());

  const tx = new TransactionBuilder(cuentaInfo, {
    fee: '1000000',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(tokenContrato.call('mint', new Address(destino).toScVal(), nativeToScVal(cantidad, { type: 'i128' })))
    .setTimeout(300)
    .build();

  const txPreparada = await FAUCET_RPC.prepareTransaction(tx);
  txPreparada.sign(FAUCET_KEYPAIR);

  const envio = await FAUCET_RPC.sendTransaction(txPreparada);
  if (envio.status === 'ERROR') throw new Error('Faucet tx rechazada por la red');

  let intentos = 0;
  while (intentos < 20) {
    await new Promise(r => setTimeout(r, 2000));
    const estado = await FAUCET_RPC.getTransaction(envio.hash);
    if (estado.status === rpc.Api.GetTransactionStatus.SUCCESS) return estado;
    if (estado.status === rpc.Api.GetTransactionStatus.FAILED)
      throw new Error('Faucet tx falló en la red');
    intentos++;
  }
  throw new Error('Timeout del faucet');
}

// ─── Routes ──────────────────────────────────────────────────────────────

async function route(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const parts = url.pathname.replace(/^\//, '').split('/');

  // POST /faucet
  if (req.method === 'POST' && parts[0] === 'faucet' && !parts[1]) {
    let body;
    try { body = await readBody(req); }
    catch (e) { return json(res, 400, { error: e.message }); }

    const { destino } = body;
    if (!destino) return json(res, 400, { error: 'Falta "destino" en el cuerpo' });

    if (!checkRateLimit(destino))
      return json(res, 429, { error: 'Límite de 3 solicitudes por hora por wallet' });

    try {
      await mintearMXNe(destino);
      return json(res, 200, { exito: true, cantidad: 100 });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  // GET /proyectos[?estado=X]
  if (parts[0] === 'proyectos' && !parts[1]) {
    let q = supabase.from('proyectos').select('*').order('id');
    if (url.searchParams.has('estado')) q = q.eq('estado', url.searchParams.get('estado'));
    const { data, error } = await q;
    return error ? json(res, 500, { error: error.message }) : json(res, 200, data);
  }

  // GET /proyectos/:id
  if (parts[0] === 'proyectos' && parts[1] && !parts[2]) {
    const { data, error } = await supabase
      .from('proyectos').select('*').eq('id', parts[1]).single();
    if (error) return json(res, error.code === 'PGRST116' ? 404 : 500, { error: error.message });
    return json(res, 200, data);
  }

  // GET /proyectos/:id/aportaciones
  if (parts[0] === 'proyectos' && parts[1] && parts[2] === 'aportaciones') {
    const { data, error } = await supabase
      .from('aportaciones').select('*').eq('proyecto_id', parts[1]).order('timestamp');
    return error ? json(res, 500, { error: error.message }) : json(res, 200, data);
  }

  // GET /backers/:address/aportaciones
  if (parts[0] === 'backers' && parts[1] && parts[2] === 'aportaciones') {
    const { data, error } = await supabase
      .from('aportaciones').select('*, proyectos(nombre,estado)')
      .eq('contribuidor', parts[1]).order('timestamp');
    return error ? json(res, 500, { error: error.message }) : json(res, 200, data);
  }

  // GET /eventos[?tipo=X&limit=N]
  if (parts[0] === 'eventos' && !parts[1]) {
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
    let q = supabase.from('eventos').select('*').order('ledger', { ascending: false }).limit(limit);
    if (url.searchParams.has('tipo')) q = q.eq('tipo', url.searchParams.get('tipo'));
    const { data, error } = await q;
    return error ? json(res, 500, { error: error.message }) : json(res, 200, data);
  }

  // GET /stats
  if (parts[0] === 'stats' && !parts[1]) {
    const [proyectos, aportaciones] = await Promise.all([
      supabase.from('proyectos').select('estado,total_aportado,yield_entregado,meta'),
      supabase.from('aportaciones').select('monto,retirado'),
    ]);
    if (proyectos.error) return json(res, 500, { error: proyectos.error.message });

    const ps = proyectos.data;
    const stats = {
      total_proyectos:   ps.length,
      activos:           ps.filter(p => ['EtapaInicial','EnProgreso','Liberado'].includes(p.estado)).length,
      total_aportado:    ps.reduce((s, p) => s + Number(p.total_aportado ?? 0), 0),
      total_yield:       ps.reduce((s, p) => s + Number(p.yield_entregado ?? 0), 0),
      capital_activo:    (aportaciones.data ?? [])
                           .filter(a => !a.retirado)
                           .reduce((s, a) => s + Number(a.monto ?? 0), 0),
    };
    return json(res, 200, stats);
  }

  // GET /sse — Server-Sent Events stream
  if (parts[0] === 'sse' && !parts[1]) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    });
    res.write(':ok\n\n');
    agregarCliente(res);
    req.on('close', () => eliminarCliente(res));
    return;
  }

  json(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  try {
    await route(req, res);
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Bimex API listening on port ${PORT}`));
