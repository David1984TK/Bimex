import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MemoryFixedWindowStore,
  MemorySseConnectionStore,
  getClientIp,
  getPublicEndpointPolicy,
  getRateLimitConfig,
  isIpWhitelisted,
  setRateLimitHeaders,
} from './rateLimiter.js';

test('fixed-window limiter allows up to the configured limit and then returns retry metadata', async () => {
  let currentTime = 1_000;
  const store = new MemoryFixedWindowStore({ now: () => currentTime });

  const first = await store.consume({ key: 'public:/eventos:203.0.113.5', limit: 2, windowMs: 60_000, policy: '2;w=60' });
  const second = await store.consume({ key: 'public:/eventos:203.0.113.5', limit: 2, windowMs: 60_000, policy: '2;w=60' });
  const third = await store.consume({ key: 'public:/eventos:203.0.113.5', limit: 2, windowMs: 60_000, policy: '2;w=60' });

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.equal(third.retryAfterSeconds, 60);

  currentTime += 60_001;
  const afterReset = await store.consume({ key: 'public:/eventos:203.0.113.5', limit: 2, windowMs: 60_000, policy: '2;w=60' });
  assert.equal(afterReset.allowed, true);
  assert.equal(afterReset.remaining, 1);
});

test('SSE limiter enforces simultaneous connection cap and releases connections', async () => {
  const store = new MemorySseConnectionStore();

  const one = await store.acquire({ id: '1', ip: '198.51.100.9', limit: 2 });
  const two = await store.acquire({ id: '2', ip: '198.51.100.9', limit: 2 });
  const three = await store.acquire({ id: '3', ip: '198.51.100.9', limit: 2 });

  assert.equal(one.allowed, true);
  assert.equal(two.allowed, true);
  assert.equal(three.allowed, false);
  assert.equal(three.remaining, 0);

  await store.release('1');
  const afterRelease = await store.acquire({ id: '3', ip: '198.51.100.9', limit: 2 });
  assert.equal(afterRelease.allowed, true);
  assert.equal(afterRelease.remaining, 0);
});

test('client IP extraction uses proxy headers and normalizes IPv4-mapped addresses', () => {
  const reqWithForwarded = {
    headers: { 'x-forwarded-for': '203.0.113.20, 10.0.0.1' },
    socket: { remoteAddress: '::ffff:127.0.0.1' },
  };
  assert.equal(getClientIp(reqWithForwarded), '203.0.113.20');

  const reqWithoutProxyTrust = {
    headers: { 'x-forwarded-for': '203.0.113.20' },
    socket: { remoteAddress: '::ffff:192.0.2.33' },
  };
  assert.equal(getClientIp(reqWithoutProxyTrust, { trustProxy: false }), '192.0.2.33');
});

test('IP whitelist supports exact IPs and IPv4 CIDR ranges', () => {
  assert.equal(isIpWhitelisted('203.0.113.7', ['203.0.113.7']), true);
  assert.equal(isIpWhitelisted('203.0.113.42', ['203.0.113.0/24']), true);
  assert.equal(isIpWhitelisted('203.0.114.42', ['203.0.113.0/24']), false);
});

test('public endpoint policy covers protected API families only', () => {
  const config = getRateLimitConfig({ RATE_LIMIT_STORE: 'memory' });

  assert.deepEqual(getPublicEndpointPolicy({ method: 'GET', url: '/eventos?limit=200' }, config), {
    limitName: 'public_api',
    endpoint: '/eventos',
    limit: 60,
    windowMs: 60_000,
  });

  assert.equal(getPublicEndpointPolicy({ method: 'GET', url: '/sse' }, config), null);
  assert.equal(getPublicEndpointPolicy({ method: 'POST', url: '/faucet' }, config), null);
});

test('rate-limit headers include RFC and legacy fields plus Retry-After when blocked', () => {
  const headers = new Map();
  const res = { setHeader: (key, value) => headers.set(key, value) };

  setRateLimitHeaders(res, {
    allowed: false,
    limit: 60,
    remaining: 0,
    resetAt: Date.now() + 30_000,
    retryAfterSeconds: 30,
    policy: '60;w=60',
  });

  assert.equal(headers.get('RateLimit-Limit'), '60');
  assert.equal(headers.get('RateLimit-Remaining'), '0');
  assert.equal(headers.get('RateLimit-Reset'), '30');
  assert.equal(headers.get('RateLimit-Policy'), '60;w=60');
  assert.equal(headers.get('X-RateLimit-Limit'), '60');
  assert.equal(headers.get('X-RateLimit-Remaining'), '0');
  assert.equal(headers.get('Retry-After'), '30');
});
