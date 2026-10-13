import '@testing-library/jest-dom';
import { vi } from 'vitest';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

Object.defineProperty(window.navigator, 'standalone', {
  configurable: true,
  value: false,
});

vi.mock('passkey-kit', () => ({
  PasskeyKit: class { sign = vi.fn() }
}));

vi.mock('../stellar/walletKit.js', () => ({
  getConnectedAddress: vi.fn().mockResolvedValue(null),
  openWalletModal: vi.fn().mockResolvedValue(null),
  signWithWalletKit: vi.fn().mockResolvedValue('signed-xdr'),
  getWalletKit: vi.fn(),
}));

