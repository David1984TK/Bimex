import { describe, it, expect } from 'vitest';
import { createLogger } from '../logger.js';

function capture(opts = {}) {
  const lines = [];
  const sink = { write: (s) => lines.push(s) };
  const log = createLogger({ out: sink, err: sink, env: {}, ...opts });
  return { log, lines };
}

describe('logger', () => {
  it('every line is valid JSON with level and msg', () => {
    const { log, lines } = capture({ level: 'debug' });
    log.debug('a'); log.info('b'); log.warn('c'); log.error('d');
    expect(lines.length).toBe(4);
    for (const l of lines) {
      const o = JSON.parse(l);
      expect(o.ts && o.level && typeof o.msg === 'string').toBeTruthy();
    }
  });

  it('LOG_LEVEL filters lower levels', () => {
    const { log, lines } = capture({ level: 'warn' });
    log.debug('x'); log.info('x'); log.warn('y'); log.error('z');
    expect(lines.map((l) => JSON.parse(l).level)).toEqual(['warn', 'error']);
  });

  it('invalid LOG_LEVEL falls back to info', () => {
    const { log, lines } = capture({ level: 'nonsense' });
    log.debug('x'); log.info('y');
    expect(lines.length).toBe(1);
  });

  it('[tag] prefix becomes route', () => {
    const { log, lines } = capture();
    log.info('[db-read] fetched rows', { count: 3 });
    const o = JSON.parse(lines[0]);
    expect(o.route).toBe('db-read');
    expect(o.msg).toBe('fetched rows');
    expect(o.count).toBe(3);
  });

  it('does not emit SUPABASE_KEY from env, in message or fields', () => {
    // Not a real credential — synthetic fixture value, placeholder only.
    const fixtureValue = 'fixture-redact-me-12345';
    const { log, lines } = capture({ env: { SUPABASE_KEY: fixtureValue } });
    log.error(`connect failed with ${fixtureValue}`, { detail: `key=${fixtureValue}`, headers: { authorization: 'Bearer abc' } }, new Error(`bad ${fixtureValue}`));
    expect(lines.join('')).not.toContain(fixtureValue);
    expect(lines.join('')).not.toContain('Bearer abc');
  });

  it('child logger adds request_id', () => {
    const { log, lines } = capture();
    log.child({ request_id: 'r1' }).info('hi');
    expect(JSON.parse(lines[0]).request_id).toBe('r1');
  });
});
