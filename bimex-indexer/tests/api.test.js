import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Environment MUST be set before any imports that read env vars ─────────
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_KEY  = 'mockkey';
process.env.STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
process.env.TOKEN_MXNE  = 'CA7QYNF7SOWQ3GLR2BGMZEHXR2YW6GKQJ6LMBSEPAMQ';
// Valid Stellar testnet secret key (fake, but passes Keypair.fromSecret validation)
process.env.FAUCET_SECRET = 'SCZANGBA5IOZSBA4K5NKMQ6MBWCQELZUYFQ3HMVH7VLEP6HWLDM3NAR';
process.env.API_PORT = '3009';

// ─── Mock @supabase/supabase-js (prevents real createClient from throwing) ─
vi.mock('@supabase/supabase-js', () => {
  const _mockSub = {
    _activeTable: null,
    _isInsert: false,
    _isDelete: false,
    _walletFilter: null,
    _grantedAtFilter: null,
    _data: null,
    _error: null,
    _rateLimitRecords: [],

    from: vi.fn().mockImplementation(function(table) {
      this._activeTable = table;
      this._isInsert = false;
      this._isDelete = false;
      this._walletFilter = null;
      this._grantedAtFilter = null;
      return this;
    }),
    rpc:    vi.fn(),
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    limit:  vi.fn().mockReturnThis(),
    eq:     vi.fn().mockImplementation(function(col, val) {
      if (col === 'wallet') {
        this._walletFilter = val;
      } else if (col === 'granted_at') {
        this._grantedAtFilter = val;
      }
      return this;
    }),
    gte:    vi.fn().mockReturnThis(),
    lte:    vi.fn().mockReturnThis(),
    range:  vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockImplementation(function(row) {
      this._isInsert = true;
      if (this._activeTable === 'faucet_rate_limit') {
        this._rateLimitRecords.push({
          wallet: row.wallet,
          granted_at: new Date().toISOString(),
        });
      }
      return this;
    }),
    delete: vi.fn().mockImplementation(function() {
      this._isDelete = true;
      return this;
    }),
    then: vi.fn().mockImplementation(function(resolve) {
      if (this._activeTable === 'faucet_rate_limit') {
        if (this._isDelete) {
          const idx = this._rateLimitRecords.findIndex(r => r.wallet === this._walletFilter && r.granted_at === this._grantedAtFilter);
          if (idx !== -1) {
            this._rateLimitRecords.splice(idx, 1);
          }
          return Promise.resolve({ error: null }).then(resolve);
        }
        if (!this._isInsert) {
          // It's a select
          const filtered = this._rateLimitRecords.filter(r => r.wallet === this._walletFilter);
          return Promise.resolve({ data: filtered, error: null }).then(resolve);
        }
      }
      return Promise.resolve({ data: this._data, error: this._error }).then(resolve);
    }),
  };
  return { createClient: () => _mockSub };
});

// ─── Mock @stellar/stellar-sdk ─────────────────────────────────────────────
vi.mock('@stellar/stellar-sdk', () => {
  return {
    Contract: function() { return { call: () => ({}) }; },
    rpc: {
      Server: function() {
        return {
          getAccount: async () => ({ sequence: '123456' }),
          prepareTransaction: async (tx) => ({ ...tx, sign: () => {} }),
          sendTransaction: async () => ({ status: 'PENDING', hash: 'fakehash' }),
          getTransaction: async () => ({ status: 'SUCCESS' }),
        };
      },
      Api: { GetTransactionStatus: { SUCCESS: 'SUCCESS', FAILED: 'FAILED' } },
    },
    TransactionBuilder: function(account, opts) {
      return {
        addOperation: function() { return this; },
        setTimeout:   function() { return this; },
        build:        function() { return { sign: function() {} }; },
      };
    },
    Networks:     { TESTNET: 'Test SDF Network ; September 2015' },
    Address:      function() { return { toScVal: () => ({}) }; },
    Keypair:      {
      fromSecret: function() {
        return { publicKey: () => 'GBPUBLICKEY', sign: () => {} };
      },
    },
    nativeToScVal: function() { return {}; },
  };
});

// ─── Import the server (starts listening on port 3009) ─────────────────────
import '../api.js';
import http from 'node:http';
import mockSupabase from '../database.js';

// ─── HTTP helper ───────────────────────────────────────────────────────────
async function req(options, body = null) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { hostname: '127.0.0.1', port: 3009, ...options },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    r.on('error', reject);
    if (body !== null) {
      r.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    r.end();
  });
}

async function reqHeaders(options) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { hostname: '127.0.0.1', port: 3009, ...options },
      (res) => {
        resolve({ status: res.statusCode, headers: res.headers });
        res.destroy();
      }
    );
    r.on('error', reject);
    r.end();
  });
}

function expectSecurityHeaders(headers) {
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('no-referrer');
}

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('api.js REST Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation(function(table) {
      this._activeTable = table;
      this._isInsert = false;
      this._isDelete = false;
      this._walletFilter = null;
      this._grantedAtFilter = null;
      return this;
    });
    mockSupabase._data  = null;
    mockSupabase._error = null;
    mockSupabase._rateLimitRecords.length = 0;
  });

  // ── misc ────────────────────────────────────────────────────────────────
  it('GET /unknown returns 404', async () => {
    const res = await req({ path: '/unknown', method: 'GET' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('OPTIONS returns CORS preflight headers', async () => {
    const res = await req({ path: '/proyectos', method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
  });

  describe('security headers', () => {
    it('adds the headers to JSON responses', async () => {
      const res = await req({ path: '/unknown', method: 'GET' });

      expectSecurityHeaders(res.headers);
    });

    it('adds the headers to audit CSV downloads', async () => {
      mockSupabase._data = [];

      const res = await req({ path: '/audit?format=csv', method: 'GET' });

      expect(res.headers['content-type']).toBe('text/csv');
      expectSecurityHeaders(res.headers);
    });

    it('adds the headers to SSE streams', async () => {
      const res = await reqHeaders({ path: '/sse', method: 'GET' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/event-stream');
      expectSecurityHeaders(res.headers);
    });
  });

  // ── GET /proyectos ───────────────────────────────────────────────────────
  describe('GET /proyectos', () => {
    it('returns 200 and project list', async () => {
      const projects = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }];
      mockSupabase._data  = projects;
      mockSupabase._error = null;

      const res = await req({ path: '/proyectos', method: 'GET' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(projects);
    });

    it('returns 500 when supabase errors', async () => {
      mockSupabase._data  = null;
      mockSupabase._error = { message: 'relation "proyectos" does not exist' };

      const res = await req({ path: '/proyectos', method: 'GET' });
      expect(res.status).toBe(500);
      // Must NOT expose raw Supabase internals to the client
      expect(res.body.error).toBe('Error de base de datos');
      expect(res.body.error).not.toContain('relation');
    });
  });

  // ── GET /proyectos/:id ───────────────────────────────────────────────────
  describe('GET /proyectos/:id', () => {
    it('returns 200 for found project', async () => {
      const project = { id: 5, nombre: 'Test' };
      // .single() is the last call – make it resolve with project
      mockSupabase.single.mockResolvedValue({ data: project, error: null });

      const res = await req({ path: '/proyectos/5', method: 'GET' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(project);
    });

    it('returns 404 on PGRST116 error with generic message', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
      });

      const res = await req({ path: '/proyectos/999', method: 'GET' });
      expect(res.status).toBe(404);
      // Must return a safe message, not the raw PostgREST error
      expect(res.body.error).toBe('Proyecto no encontrado');
    });
  });

  // ── GET /eventos ─────────────────────────────────────────────────────────
  describe('GET /eventos', () => {
    it('returns 200 and event list', async () => {
      const events = [{ tx_hash: 'abc', ledger: 100 }];
      mockSupabase._data  = events;
      mockSupabase._error = null;

      const res = await req({ path: '/eventos', method: 'GET' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: events });
    });
  });

  // ── GET /stats ────────────────────────────────────────────────────────────
  describe('GET /stats', () => {
    it('returns computed stats', async () => {
      const proyectosData = {
        data: [
          { estado: 'EtapaInicial', total_aportado: '1000', yield_entregado: '50',  meta: '5000' },
          { estado: 'Liberado',     total_aportado: '2000', yield_entregado: '100', meta: '2000' },
        ],
        error: null,
      };
      const aportacionesData = {
        data: [
          { monto: '1000', retirado: false },
          { monto: '500',  retirado: true  },
        ],
        error: null,
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'proyectos') {
          return { select: () => ({ then: (r) => Promise.resolve(proyectosData).then(r) }) };
        }
        if (table === 'aportaciones') {
          return { select: () => ({ then: (r) => Promise.resolve(aportacionesData).then(r) }) };
        }
      });

      const res = await req({ path: '/stats', method: 'GET' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total_proyectos:       2,
        activos:               2,
        total_aportado:        3000,
        total_yield:           150,
        capital_activo:        1000,
        numero_contribuidores: 0,
      });
    });
  });

  // ── POST /faucet ──────────────────────────────────────────────────────────
  describe('POST /faucet', () => {
    it('returns 400 when body is malformed JSON', async () => {
      const res = await req({ path: '/faucet', method: 'POST' }, 'not-json');
      expect(res.status).toBe(400);
    });

    it('returns 400 when destino is missing', async () => {
      const res = await req({ path: '/faucet', method: 'POST' }, {});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Falta/);
    });

    it('returns 413 when the body exceeds MAX_BODY_BYTES (64KB)', async () => {
      const cuerpoGigante = JSON.stringify({ destino: 'G' + 'X'.repeat(70 * 1024) });
      const res = await req({ path: '/faucet', method: 'POST' }, cuerpoGigante);
      expect(res.status).toBe(413);
      expect(res.body.error).toBe('Cuerpo demasiado grande');
    });

    it('accepts a body within MAX_BODY_BYTES normally', async () => {
      const wallet = 'GTEST_BODY_WITHIN_LIMIT_' + Date.now();
      const res = await req({ path: '/faucet', method: 'POST' }, { destino: wallet });
      expect(res.status).not.toBe(413);
    });

    it('enforces rate limit – 4th request to same wallet returns 429', { timeout: 15000 }, async () => {
      // Use a unique wallet so it starts fresh
      const wallet = 'GRATE_LIMIT_TEST_' + Date.now();
      // Fire 3 allowed requests (may succeed or error on mint, doesn't matter)
      await req({ path: '/faucet', method: 'POST' }, { destino: wallet });
      await req({ path: '/faucet', method: 'POST' }, { destino: wallet });
      await req({ path: '/faucet', method: 'POST' }, { destino: wallet });

      // 4th call MUST be rate-limited
      const res4 = await req({ path: '/faucet', method: 'POST' }, { destino: wallet });
      expect(res4.status).toBe(429);
      expect(res4.body.error).toMatch(/Límite/);
    });

    it('returns 200 and minting result when mocking works', async () => {
      // Use a unique wallet so rate limit does not apply
      const wallet = 'GTEST_FRESH_WALLET_MINT_' + Date.now();
      const res = await req({ path: '/faucet', method: 'POST' }, { destino: wallet });
      // SDK is mocked to succeed, expect 200
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ exito: true, cantidad: 100 });
    });
  });
});
