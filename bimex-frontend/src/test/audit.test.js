import { describe, it, expect } from 'vitest';
import { construirAuditParams, construirAuditCsvUrl } from '../utils/audit.js';

// Valid Ed25519 public key (G-address) — 56 chars, correct checksum.
const DIRECCION_VALIDA = 'GCWXHQPEOQEVUJ2NLIVNAOMYOJ5N5L4W753EPV7R4PU7WWNBSEJMZSU2';

describe('construirAuditParams', () => {
  it('omits the action param when the filter is "Todos"', () => {
    const params = construirAuditParams({ action: 'Todos' });
    expect(params.has('action')).toBe(false);
  });

  it('percent-encodes an action value containing URL/HTML metacharacters', () => {
    const params = construirAuditParams({ action: '<img src=x onerror=alert(1)>&foo=bar' });
    const raw = params.toString();
    expect(raw).not.toContain('<');
    expect(raw).not.toContain('>');
    // the attacker-controlled "&foo=bar" must not become a second, independent query param
    expect(params.get('action')).toBe('<img src=x onerror=alert(1)>&foo=bar');
    expect(params.has('foo')).toBe(false);
  });

  it('rejects an actor value that is not a valid Stellar address', () => {
    const params = construirAuditParams({ actor: '"><script>alert(1)</script>' });
    expect(params.has('actor')).toBe(false);
  });

  it('accepts a valid Stellar actor address', () => {
    const params = construirAuditParams({ actor: DIRECCION_VALIDA });
    expect(params.get('actor')).toBe(DIRECCION_VALIDA);
  });

  it('percent-encodes date values', () => {
    const params = construirAuditParams({ startDate: '2026-01-01&x=1', endDate: '2026-02-01' });
    expect(params.get('start_date')).toBe('2026-01-01&x=1');
    expect(params.toString()).not.toMatch(/start_date=2026-01-01&x=1(?!%)/);
  });

  it('merges extra params (e.g. pagination) alongside the filters', () => {
    const params = construirAuditParams({ action: 'Retiro' }, { limit: 10, offset: 0 });
    expect(params.get('limit')).toBe('10');
    expect(params.get('offset')).toBe('0');
    expect(params.get('action')).toBe('Retiro');
  });
});

describe('construirAuditCsvUrl', () => {
  it('builds a URL whose query is fully encoded, never raw-interpolated', () => {
    const url = construirAuditCsvUrl('https://api.example.com', {
      action: '"><svg onload=alert(1)>',
      actor: DIRECCION_VALIDA,
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(url.startsWith('https://api.example.com/audit?')).toBe(true);
    expect(url).not.toContain('<svg');
    expect(url).not.toContain('"');
    expect(url).toContain('format=csv');
    expect(url).toContain(`actor=${DIRECCION_VALIDA}`);
  });

  it('defaults to just format=csv when no filters are set', () => {
    const url = construirAuditCsvUrl('https://api.example.com', {});
    expect(url).toBe('https://api.example.com/audit?format=csv');
  });
});
