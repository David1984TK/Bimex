import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryFixedWindowStore,
  MemorySseConnectionStore,
  buildWalletRateLimitKey,
  isIpWhitelisted,
  normalizeIp,
  setRateLimitHeaders,
} from '../rateLimiter.js';

function fakeResponse() {
  const headers = new Map();
  return {
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value));
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
  };
}

test('fixed-window limiter allows 60 requests/minute and blocks the 61st', () => {
  let now = Date.UTC(2026, 5, 25, 13, 0, 0);
  const store = new MemoryFixedWindowStore({ now: () => now });
  const limit = 60;
  const windowMs = 60_000;
  const key = 'public-api:/proyectos:ip:203.0.113.10';

  let result;
  for (let i = 0; i < limit; i += 1) {
    result = store.consume(key, limit, windowMs);
    assert.equal(result.allowed, true, `request ${i + 1} should be allowed`);
  }

  assert.equal(result.remaining, 0);

  const blocked = store.consume(key, limit, windowMs);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfter, 60);

  now += windowMs + 1;
  const afterReset = store.consume(key, limit, windowMs);
  assert.equal(afterReset.allowed, true);
  assert.equal(afterReset.remaining, 59);
});

test('faucet limiter keeps the 3 requests/hour policy per wallet', () => {
  const store = new MemoryFixedWindowStore({ now: () => Date.UTC(2026, 5, 25, 13, 0, 0) });
  const key = buildWalletRateLimitKey('faucet', 'GABCDEF1234567890');

  assert.equal(store.consume(key, 3, 3_600_000).allowed, true);
  assert.equal(store.consume(key, 3, 3_600_000).allowed, true);
  assert.equal(store.consume(key, 3, 3_600_000).allowed, true);

  const blocked = store.consume(key, 3, 3_600_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 3600);
});

test('rate-limit headers include RFC and requested compatibility headers', () => {
  const res = fakeResponse();
  const result = {
    limit: 60,
    remaining: 0,
    resetAt: Date.now() + 45_000,
    retryAfter: 45,
  };

  setRateLimitHeaders(res, result, { retryAfter: true, policyWindowMs: 60_000 });

  assert.equal(res.getHeader('ratelimit-limit'), '60');
  assert.equal(res.getHeader('ratelimit-remaining'), '0');
  assert.equal(res.getHeader('ratelimit-policy'), '60;w=60');
  assert.equal(res.getHeader('x-ratelimit-limit'), '60');
  assert.equal(res.getHeader('x-ratelimit-remaining'), '0');
  assert.equal(res.getHeader('retry-after'), '45');
});

test('SSE limiter caps simultaneous connections and releases slots', () => {
  const store = new MemorySseConnectionStore();
  const limit = 5;
  const key = 'sse:ip:198.51.100.20';
  const releases = [];

  for (let i = 0; i < limit; i += 1) {
    const acquired = store.acquire(key, limit);
    assert.equal(acquired.allowed, true, `SSE connection ${i + 1} should be allowed`);
    releases.push(acquired.release);
  }

  const blocked = store.acquire(key, limit);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);

  releases[0]();
  const afterRelease = store.acquire(key, limit);
  assert.equal(afterRelease.allowed, true);
  assert.equal(afterRelease.remaining, 0);

  afterRelease.release();
  for (const release of releases.slice(1)) release();
});

test('IP normalization and whitelist support exact IPs and IPv4 CIDR ranges', () => {
  assert.equal(normalizeIp('::ffff:203.0.113.5'), '203.0.113.5');
  assert.equal(normalizeIp('203.0.113.5:54321'), '203.0.113.5');
  assert.equal(normalizeIp('198.51.100.7, 10.0.0.1'), '198.51.100.7');

  const whitelist = ['203.0.113.5', '198.51.100.0/24'];
  assert.equal(isIpWhitelisted('203.0.113.5', whitelist), true);
  assert.equal(isIpWhitelisted('198.51.100.42', whitelist), true);
  assert.equal(isIpWhitelisted('192.0.2.42', whitelist), false);
});
