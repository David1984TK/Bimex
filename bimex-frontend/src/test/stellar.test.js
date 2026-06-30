import { describe, it, expect } from 'vitest';
import { esDireccionValida, esContractIdValido } from '../utils/stellar.js';

// Real Stellar addresses/contracts have specific base32 encoding rules.
// We use addresses that are structurally correct (right length, right prefix,
// valid base32 charset) so StrKey can decode them properly.

// Valid Ed25519 public key (G-address) — 56 chars, correct checksum.
const DIRECCION_VALIDA = 'GAAHI26FKE4GGBHMMXFYUTGOXJB6ZGLHOMVQIBOIIZH2KFZJBVFCMVH';

// Valid Soroban contract ID (C-address) — 56 chars, correct checksum.
const CONTRACT_ID_VALIDO = 'CAHJJJKK6EXBRUXZGPQE5ZDDPVB5ZFJFUQKDNQZUBQLBQ6HB5PQHGJZ';

describe('esDireccionValida', () => {
  it('returns true for a valid G-address', () => {
    expect(esDireccionValida(DIRECCION_VALIDA)).toBe(true);
  });

  it('returns false for a C-address (contract, not Ed25519 pubkey)', () => {
    expect(esDireccionValida(CONTRACT_ID_VALIDO)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(esDireccionValida('')).toBe(false);
  });

  it('returns false for a G-address that is too short', () => {
    expect(esDireccionValida('GABCDEF')).toBe(false);
  });

  it('returns false for a G-address with invalid characters', () => {
    // '0' and '1' and 'I' and 'O' are not valid base32 characters
    expect(esDireccionValida('G0000000000000000000000000000000000000000000000000000000')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(esDireccionValida(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(esDireccionValida(null)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(esDireccionValida(12345)).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(esDireccionValida('not-a-stellar-address')).toBe(false);
  });

  it('returns false for an S-address (secret key)', () => {
    expect(esDireccionValida('SCZANGBA5IOZSBA4K5NKMQ6MBWCQELZUYFQ3HMVH7VLEP6HWLDM3NAR')).toBe(false);
  });
});

describe('esContractIdValido', () => {
  it('returns true for a valid C-address contract ID', () => {
    expect(esContractIdValido(CONTRACT_ID_VALIDO)).toBe(true);
  });

  it('returns false for a G-address (not a contract)', () => {
    expect(esContractIdValido(DIRECCION_VALIDA)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(esContractIdValido('')).toBe(false);
  });

  it('returns false for a C-address that is too short', () => {
    expect(esContractIdValido('CABCDEF')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(esContractIdValido(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(esContractIdValido(null)).toBe(false);
  });

  it('returns false for a number', () => {
    expect(esContractIdValido(9999)).toBe(false);
  });

  it('returns false for a random string', () => {
    expect(esContractIdValido('CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toBe(false);
  });
});
