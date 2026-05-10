import { describe, it, expect, vi } from 'vitest';

vi.mock('@stellar/stellar-sdk', () => ({
  Contract: vi.fn(),
  Networks: { TESTNET: 'Test SDF Network ; September 2015', PUBLIC: 'Public Global Stellar Network ; September 2015' },
  rpc: {
    Server: vi.fn(),
    Api: {
      isSimulationError: vi.fn(() => false),
      isSimulationRestore: vi.fn(() => false),
      GetTransactionStatus: { SUCCESS: 'SUCCESS', FAILED: 'FAILED' },
    },
  },
  TransactionBuilder: vi.fn(),
  BASE_FEE: '100',
  Address: vi.fn(),
  Keypair: { random: vi.fn(() => ({ publicKey: () => 'GABC123' })), fromSecret: vi.fn() },
  nativeToScVal: vi.fn(),
  scValToNative: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => ({
  signTransaction: vi.fn(),
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  setAllowed: vi.fn(),
}));

import { stroopsAMXNe, mxneAStroops } from '../stellar/contrato.js';

describe('stroopsAMXNe', () => {
  it('converts 10_000_000 stroops to a string containing "1" and "MXNe"', () => {
    const result = stroopsAMXNe(BigInt(10_000_000));
    expect(result).toContain('1');
    expect(result).toContain('MXNe');
  });

  it('converts 0 stroops to a string containing "0" and "MXNe"', () => {
    const result = stroopsAMXNe(BigInt(0));
    expect(result).toContain('0');
    expect(result).toContain('MXNe');
  });

  it('converts 15_000_000 stroops to a string containing "1.5" or "1,5" and "MXNe"', () => {
    const result = stroopsAMXNe(BigInt(15_000_000));
    expect(result).toMatch(/1[.,]5[0-9]*\s+MXNe/);
  });

  it('returns a string type', () => {
    expect(typeof stroopsAMXNe(BigInt(10_000_000))).toBe('string');
  });

  it('converts 100_000_000 stroops to contain "10" and "MXNe"', () => {
    const result = stroopsAMXNe(BigInt(100_000_000));
    expect(result).toContain('10');
    expect(result).toContain('MXNe');
  });
});

describe('mxneAStroops', () => {
  it('converts 1 MXNe to 10_000_000 stroops as BigInt', () => {
    expect(mxneAStroops(1)).toBe(BigInt(10_000_000));
  });

  it('converts 0 MXNe to 0 stroops as BigInt', () => {
    expect(mxneAStroops(0)).toBe(BigInt(0));
  });

  it('converts 1.5 MXNe to 15_000_000 stroops as BigInt', () => {
    expect(mxneAStroops(1.5)).toBe(BigInt(15_000_000));
  });

  it('converts 100 MXNe to 1_000_000_000 stroops as BigInt', () => {
    expect(mxneAStroops(100)).toBe(BigInt(1_000_000_000));
  });

  it('returns a BigInt type', () => {
    expect(typeof mxneAStroops(1)).toBe('bigint');
  });
});
