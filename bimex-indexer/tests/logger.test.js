import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogger } from '../logger.js';

function capture(opts = {}) {
  const lines = [];
  const sink = { write: (s) => lines.push(s) };
  const log = createLogger({ out: sink, err: sink, env: {}, ...opts });
  return { log, lines };
}

test('every line is valid JSON with level and msg', () => {
  const { log, lines } = capture({ level: 'debug' });
  log.debug('a'); log.info('b'); log.warn('c'); log.error('d');
  assert.equal(lines.length, 4);
  for (const l of lines) {
    const o = JSON.parse(l);
    assert.ok(o.ts && o.level && typeof o.msg === 'string');
  }
});

test('LOG_LEVEL filters lower levels', () => {
  const { log, lines } = capture({ level: 'warn' });
  log.debug('x'); log.info('x'); log.warn('y'); log.error('z');
  assert.deepEqual(lines.map((l) => JSON.parse(l).level), ['warn', 'error']);
});

test('invalid LOG_LEVEL falls back to info', () => {
  const { log, lines } = capture({ level: 'nonsense' });
  log.debug('x'); log.info('y');
  assert.equal(lines.length, 1);
});

test('[tag] prefix becomes route', () => {
  const { log, lines } = capture();
  log.info('[db-read] fetched rows', { count: 3 });
  const o = JSON.parse(lines[0]);
  assert.equal(o.route, 'db-read');
  assert.equal(o.msg, 'fetched rows');
  assert.equal(o.count, 3);
});

test('does not emit SUPABASE_KEY from env, in message or fields', () => {
  const secret = 'sb_secret_abcdef123456';
  const { log, lines } = capture({ env: { SUPABASE_KEY: secret } });
  log.error(`connect failed with ${secret}`, { detail: `key=${secret}`, headers: { authorization: 'Bearer abc' } }, new Error(`bad ${secret}`));
  assert.ok(!lines.join('').includes(secret));
  assert.ok(!lines.join('').includes('Bearer abc'));
});

test('child logger adds request_id', () => {
  const { log, lines } = capture();
  log.child({ request_id: 'r1' }).info('hi');
  assert.equal(JSON.parse(lines[0]).request_id, 'r1');
});