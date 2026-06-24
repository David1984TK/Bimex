import 'dotenv/config';
import http from 'node:http';
import { Contract, rpc, TransactionBuilder, Networks, Address, Keypair, nativeToScVal } from '@stellar/stellar-sdk';
import supabase from './database.js';
import { agregarCliente, eliminarCliente } from './sse.js';
import {
  corsHeaders,
  createRateLimiter,
  getClientIp,
  getPublicEndpointPolicy,
  getRateLimitConfig,
  isIpWhitelisted,
  setRateLimitHeaders,
} from './rateLimiter.js';

const PORT = parseInt(process.env.API_PORT ?? '3002', 10);
const rateLimitConfig = getRateLimitConfig();
const rateLimiter = createRateLimiter({ supabase, config: rateLimitConfig });

// ─── Helpers ─────────────────────────────────────────────────────────────

function json(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders('*'),
    ...headers,
  });
  res.end(body);
}

function getUserAgent(req) {
  const userAgent = req.headers['user-agent'];
  return Array.isArray(userAgent) ? userAgent[0] : userAgent;
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

async function enforcePublicRateLimit(req, res) {
  const policy = getPublicEndpointPolicy(req, rateLimitConfig);
  if (!policy) return true;

  const ip = getClientIp(req, { trustProxy: rateLimitConfig.trustProxy });
  if (isIpWhitelisted(ip, rateLimitConfig.whitelist)) return true;

  const result = await rateLimiter.consumeFixedWindow({
    ...policy,
    identifier: ip,
    ip,
  });
  setRateLimitHeaders(res, result);

  if (result.allowed) return true;

  await rateLimiter.logBlocked({
    ip,
    endpoint: policy.endpoint,
    method: req.method,
    limitName: policy.limitName,
    identifier: ip,
    retryAfterSeconds: result.retryAfterSeconds,
    userAgent: getUserAgent(req),
  });

  json(res, 429, {
    error: 'Rate limit exceeded',
    message: `Máximo ${policy.limit} solicitudes cada ${Math.ceil(policy.windowMs / 1000)} segundos por IP para ${policy.endpoint}`,
  });
  return false;
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

    const wallet = String(destino).trim();
    if (!wallet) return json(res, 400, { error: 'Falta "destino" en el cuerpo' });

    const faucetLimit = await rateLimiter.consumeFixedWindow({
      limitName: 'faucet_wallet',
      identifier: wallet,
      ip: getClientIp(req, { trustProxy: rateLimitConfig.trustProxy }),
      endpoint: '/faucet',
      limit: rateLimitConfig.faucetLimit,
      windowMs: rateLimitConfig.faucetWindowMs,
    });
    setRateLimitHeaders(res, faucetLimit);

    if (!faucetLimit.allowed) {
      await rateLimiter.logBlocked({
        ip: getClientIp(req, { trustProxy: rateLimitConfig.trustProxy }),
        endpoint: '/faucet',
        method: req.method,
        limitName: 'faucet_wallet',
        identifier: wallet,
        retryAfterSeconds: faucetLimit.retryAfterSeconds,
        userAgent: getUserAgent(req),
      });
      return json(res, 429, { error: 'Límite de 3 solicitudes por hora por wallet' });
    }

    try {
      await mintearMXNe(wallet);
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
    const ip = getClientIp(req, { trustProxy: rateLimitConfig.trustProxy });
    const whitelisted = isIpWhitelisted(ip, rateLimitConfig.whitelist);
    let sseLease = null;
    let refreshTimer = null;

    if (!whitelisted) {
      sseLease = await rateLimiter.acquireSseConnection({
        ip,
        limit: rateLimitConfig.sseConnectionLimit,
        ttlSeconds: rateLimitConfig.sseTtlSeconds,
        userAgent: getUserAgent(req),
      });
      setRateLimitHeaders(res, sseLease.result);

      if (!sseLease.result.allowed) {
        await rateLimiter.logBlocked({
          ip,
          endpoint: '/sse',
          method: req.method,
          limitName: 'sse_connections',
          identifier: ip,
          retryAfterSeconds: sseLease.result.retryAfterSeconds,
          userAgent: getUserAgent(req),
        });
        return json(res, 429, {
          error: 'Too many SSE connections',
          message: `Máximo ${rateLimitConfig.sseConnectionLimit} conexiones SSE simultáneas por IP`,
        });
      }

      const refreshEveryMs = Math.max(15_000, Math.floor(rateLimitConfig.sseTtlSeconds * 500));
      refreshTimer = setInterval(() => sseLease.refresh(), refreshEveryMs);
      refreshTimer.unref?.();
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders(process.env.FRONTEND_URL || '*'),
    });
    res.write(':ok\n\n');
    agregarCliente(res);
    req.on('close', async () => {
      if (refreshTimer) clearInterval(refreshTimer);
      eliminarCliente(res);
      if (sseLease) await sseLease.release();
    });
    return;
  }

  json(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...corsHeaders('*'),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  try {
    const allowed = await enforcePublicRateLimit(req, res);
    if (!allowed) return;
    await route(req, res);
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Bimex API listening on port ${PORT}`));
