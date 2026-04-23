import 'dotenv/config';
import http from 'node:http';
import supabase from './database.js';

const PORT = parseInt(process.env.API_PORT ?? '3001', 10);

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

async function route(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const parts = url.pathname.replace(/^\//, '').split('/');

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

  json(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' });
    return res.end();
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  try {
    await route(req, res);
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`Bimex API listening on port ${PORT}`));
