import crypto from 'node:crypto';
import net from 'node:net';

export const DEFAULT_PUBLIC_LIMIT = 60;
export const DEFAULT_PUBLIC_WINDOW_MS = 60 * 1000;
export const DEFAULT_FAUCET_LIMIT = 3;
export const DEFAULT_FAUCET_WINDOW_MS = 60 * 60 * 1000;
export const DEFAULT_SSE_CONNECTION_LIMIT = 5;
export const DEFAULT_SSE_TTL_SECONDS = 90;

const HEADER_EXPOSE_LIST = [
  'RateLimit-Limit',
  'RateLimit-Remaining',
  'RateLimit-Reset',
  'RateLimit-Policy',
  'Retry-After',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
].join(', ');

export function getRateLimitConfig(env = process.env) {
  const publicWindowMs = parsePositiveInt(env.RATE_LIMIT_PUBLIC_WINDOW_MS, DEFAULT_PUBLIC_WINDOW_MS);
  const faucetWindowMs = parsePositiveInt(env.RATE_LIMIT_FAUCET_WINDOW_MS, DEFAULT_FAUCET_WINDOW_MS);

  return {
    disabled: env.RATE_LIMIT_DISABLED === 'true',
    store: (env.RATE_LIMIT_STORE || 'supabase').toLowerCase(),
    trustProxy: env.TRUST_PROXY !== 'false',
    publicLimit: parsePositiveInt(env.RATE_LIMIT_PUBLIC_MAX, DEFAULT_PUBLIC_LIMIT),
    publicWindowMs,
    faucetLimit: parsePositiveInt(env.RATE_LIMIT_FAUCET_MAX, DEFAULT_FAUCET_LIMIT),
    faucetWindowMs,
    sseConnectionLimit: parsePositiveInt(env.RATE_LIMIT_SSE_CONNECTIONS, DEFAULT_SSE_CONNECTION_LIMIT),
    sseTtlSeconds: parsePositiveInt(env.RATE_LIMIT_SSE_TTL_SECONDS, DEFAULT_SSE_TTL_SECONDS),
    whitelist: parseIpWhitelist(env.RATE_LIMIT_WHITELIST_IPS || env.INTERNAL_IP_WHITELIST || ''),
  };
}

function parsePositiveInt(raw, fallback) {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getClientIp(req, { trustProxy = true } = {}) {
  if (trustProxy) {
    const forwardedFor = req.headers?.['x-forwarded-for'];
    const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (firstForwarded) {
      const firstIp = firstForwarded.split(',')[0]?.trim();
      if (firstIp) return normalizeIp(firstIp);
    }

    const realIp = req.headers?.['x-real-ip'];
    const firstRealIp = Array.isArray(realIp) ? realIp[0] : realIp;
    if (firstRealIp) return normalizeIp(firstRealIp);
  }

  return normalizeIp(req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown');
}

export function normalizeIp(rawIp) {
  if (!rawIp) return 'unknown';
  let ip = String(rawIp).trim();

  if (ip.startsWith('[')) {
    const closing = ip.indexOf(']');
    if (closing !== -1) ip = ip.slice(1, closing);
  } else if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(':'));
  }

  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip || 'unknown';
}

export function parseIpWhitelist(raw) {
  return String(raw || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

export function isIpWhitelisted(ip, whitelist = []) {
  const normalizedIp = normalizeIp(ip);
  return whitelist.some(entry => ipMatchesWhitelistEntry(normalizedIp, entry));
}

function ipMatchesWhitelistEntry(ip, entry) {
  const normalizedEntry = normalizeIp(entry);
  if (normalizedEntry === ip) return true;

  if (!normalizedEntry.includes('/')) return false;
  const [rangeIp, bitsRaw] = normalizedEntry.split('/');
  const bits = Number.parseInt(bitsRaw, 10);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (net.isIP(ip) !== 4 || net.isIP(rangeIp) !== 4) return false;

  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(rangeIp);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);
}

function makeRateLimitResult({ allowed, limit, remaining, resetAt, retryAfterSeconds = 0, current = 0, policy, store = 'memory' }) {
  return {
    allowed,
    limit,
    remaining: Math.max(0, remaining),
    resetAt,
    retryAfterSeconds: Math.max(0, retryAfterSeconds),
    current,
    policy,
    store,
  };
}

export class MemoryFixedWindowStore {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.buckets = new Map();
  }

  async consume({ key, limit, windowMs, policy }) {
    const now = this.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);

    const allowed = bucket.count <= limit;
    const retryAfterSeconds = allowed ? 0 : secondsUntil(bucket.resetAt, now);

    return makeRateLimitResult({
      allowed,
      limit,
      remaining: limit - bucket.count,
      resetAt: bucket.resetAt,
      retryAfterSeconds,
      current: bucket.count,
      policy,
      store: 'memory',
    });
  }
}

export class MemorySseConnectionStore {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.connectionsByIp = new Map();
    this.connectionIp = new Map();
  }

  async acquire({ id, ip, limit, retryAfterSeconds = 60 }) {
    const connections = this.connectionsByIp.get(ip) || new Set();
    const active = connections.size;

    if (active >= limit) {
      return makeRateLimitResult({
        allowed: false,
        limit,
        remaining: 0,
        resetAt: this.now() + retryAfterSeconds * 1000,
        retryAfterSeconds,
        current: active,
        policy: `${limit};concurrent`,
        store: 'memory',
      });
    }

    connections.add(id);
    this.connectionsByIp.set(ip, connections);
    this.connectionIp.set(id, ip);

    return makeRateLimitResult({
      allowed: true,
      limit,
      remaining: limit - connections.size,
      resetAt: this.now() + retryAfterSeconds * 1000,
      retryAfterSeconds: 0,
      current: connections.size,
      policy: `${limit};concurrent`,
      store: 'memory',
    });
  }

  async release(id) {
    const ip = this.connectionIp.get(id);
    if (!ip) return;

    const connections = this.connectionsByIp.get(ip);
    if (connections) {
      connections.delete(id);
      if (connections.size === 0) this.connectionsByIp.delete(ip);
    }
    this.connectionIp.delete(id);
  }
}

class SupabaseFixedWindowStore {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async consume({ key, limitName, ip, identifier, limit, windowMs, policy }) {
    const windowSeconds = Math.ceil(windowMs / 1000);
    const { data, error } = await this.supabase.rpc('consume_api_rate_limit', {
      p_key: key,
      p_limit_name: limitName,
      p_ip: ip,
      p_identifier: identifier,
      p_window_seconds: windowSeconds,
      p_max_requests: limit,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Respuesta vacía desde consume_api_rate_limit');

    const resetAt = row.reset_at ? new Date(row.reset_at).getTime() : Date.now() + windowMs;
    return makeRateLimitResult({
      allowed: Boolean(row.allowed),
      limit,
      remaining: Number(row.remaining ?? 0),
      resetAt,
      retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
      current: Number(row.current_count ?? 0),
      policy,
      store: 'supabase',
    });
  }
}

class SupabaseSseConnectionStore {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async acquire({ id, ip, limit, ttlSeconds, userAgent }) {
    const { data, error } = await this.supabase.rpc('acquire_api_sse_connection', {
      p_id: id,
      p_ip: ip,
      p_max_connections: limit,
      p_ttl_seconds: ttlSeconds,
      p_user_agent: userAgent || null,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Respuesta vacía desde acquire_api_sse_connection');

    return makeRateLimitResult({
      allowed: Boolean(row.allowed),
      limit,
      remaining: Number(row.remaining ?? 0),
      resetAt: Date.now() + (Number(row.retry_after_seconds) || 60) * 1000,
      retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
      current: Number(row.active_connections ?? 0),
      policy: `${limit};concurrent`,
      store: 'supabase',
    });
  }

  async refresh(id, ttlSeconds) {
    const { error } = await this.supabase
      .from('api_sse_connections')
      .update({ expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async release(id) {
    const { error } = await this.supabase.rpc('release_api_sse_connection', { p_id: id });
    if (error) throw error;
  }
}

export function createRateLimiter({ supabase = null, config = getRateLimitConfig(), now = () => Date.now() } = {}) {
  const memoryFixedWindow = new MemoryFixedWindowStore({ now });
  const memorySse = new MemorySseConnectionStore({ now });
  const supabaseFixedWindow = supabase ? new SupabaseFixedWindowStore(supabase) : null;
  const supabaseSse = supabase ? new SupabaseSseConnectionStore(supabase) : null;
  const fallbackWarnings = new Set();
  const supabaseBackoffUntil = new Map();

  function shouldUseSupabase(scope) {
    const backoffUntil = supabaseBackoffUntil.get(scope) || 0;
    return config.store === 'supabase' && supabaseFixedWindow && supabaseSse && now() >= backoffUntil;
  }

  function warnFallback(scope, err) {
    supabaseBackoffUntil.set(scope, now() + 60_000);
    if (fallbackWarnings.has(scope)) return;
    fallbackWarnings.add(scope);
    console.warn(`[rate-limit] Supabase store unavailable for ${scope}; falling back to in-memory store. Run bimex-indexer/schema.sql migration for shared limits.`, err?.message || err);
  }

  async function consumeFixedWindow({ limitName, identifier, ip, endpoint, limit, windowMs }) {
    const policy = `${limit};w=${Math.ceil(windowMs / 1000)}`;
    const key = `${limitName}:${endpoint}:${identifier}`;

    if (config.disabled) {
      return makeRateLimitResult({
        allowed: true,
        limit,
        remaining: limit,
        resetAt: now() + windowMs,
        policy,
        store: 'disabled',
      });
    }

    if (shouldUseSupabase('fixed-window')) {
      try {
        return await supabaseFixedWindow.consume({ key, limitName, ip, identifier, limit, windowMs, policy });
      } catch (err) {
        warnFallback('fixed-window', err);
      }
    }

    return memoryFixedWindow.consume({ key, limit, windowMs, policy });
  }

  async function acquireSseConnection({ ip, limit, ttlSeconds, userAgent }) {
    const id = crypto.randomUUID();

    if (config.disabled) {
      return {
        id,
        result: makeRateLimitResult({
          allowed: true,
          limit,
          remaining: limit,
          resetAt: now() + 60_000,
          policy: `${limit};concurrent`,
          store: 'disabled',
        }),
        refresh: () => {},
        release: async () => {},
      };
    }

    let result;
    let store = memorySse;

    if (shouldUseSupabase('sse')) {
      try {
        result = await supabaseSse.acquire({ id, ip, limit, ttlSeconds, userAgent });
        store = supabaseSse;
      } catch (err) {
        warnFallback('sse', err);
      }
    }

    if (!result) result = await memorySse.acquire({ id, ip, limit });

    return {
      id,
      result,
      refresh: () => {
        if (result.allowed && result.store === 'supabase') {
          return store.refresh(id, ttlSeconds).catch(err => warnFallback('sse-refresh', err));
        }
      },
      release: async () => {
        try {
          await store.release(id);
        } catch (err) {
          warnFallback('sse-release', err);
        }
      },
    };
  }

  async function logBlocked({ ip, endpoint, method, limitName, identifier, retryAfterSeconds, userAgent }) {
    console.warn('[rate-limit] blocked request', JSON.stringify({
      ip,
      endpoint,
      method,
      limitName,
      identifier,
      retryAfterSeconds,
      userAgent,
    }));

    if (!shouldUseSupabase('blocked-log')) return;

    try {
      const { error } = await supabase
        .from('api_rate_limit_blocks')
        .insert({
          ip,
          endpoint,
          method,
          limit_name: limitName,
          identifier,
          retry_after_seconds: retryAfterSeconds,
          user_agent: userAgent || null,
        });
      if (error) throw error;
    } catch (err) {
      warnFallback('blocked-log', err);
    }
  }

  return {
    config,
    consumeFixedWindow,
    acquireSseConnection,
    logBlocked,
  };
}

export function getPublicEndpointPolicy(req, config) {
  if (req.method !== 'GET') return null;

  const url = new URL(req.url, 'http://localhost');
  const firstSegment = url.pathname.replace(/^\//, '').split('/')[0];
  if (!['proyectos', 'eventos', 'stats'].includes(firstSegment)) return null;

  return {
    limitName: 'public_api',
    endpoint: `/${firstSegment}`,
    limit: config.publicLimit,
    windowMs: config.publicWindowMs,
  };
}

export function setRateLimitHeaders(res, result) {
  const now = Date.now();
  const resetSeconds = Math.max(result.retryAfterSeconds || secondsUntil(result.resetAt, now), 0);
  const resetEpochSeconds = Math.ceil(result.resetAt / 1000);

  res.setHeader('RateLimit-Limit', String(result.limit));
  res.setHeader('RateLimit-Remaining', String(result.remaining));
  res.setHeader('RateLimit-Reset', String(resetSeconds));
  if (result.policy) res.setHeader('RateLimit-Policy', result.policy);

  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(resetEpochSeconds));

  if (!result.allowed && resetSeconds > 0) {
    res.setHeader('Retry-After', String(resetSeconds));
  }
}

export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Expose-Headers': HEADER_EXPOSE_LIST,
  };
}

function secondsUntil(timestampMs, nowMs = Date.now()) {
  return Math.max(1, Math.ceil((timestampMs - nowMs) / 1000));
}
