import type { Page } from '@playwright/test'

export const MOCK_ADDRESS = 'GCTEST1234MOCKADDRESSBIMEXSTELLARTESTNETABCDE56789XYZ'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

export async function mockFreighterConnected(page: Page): Promise<void> {
  await page.addInitScript(
    ({ address, passphrase }: { address: string; passphrase: string }) => {
      const freighter = {
        isConnected: async () => ({ isConnected: true }),
        isAllowed: async () => ({ isAllowed: true }),
        getAddress: async () => ({ address }),
        getNetwork: async () => ({
          network: 'TESTNET',
          networkPassphrase: passphrase,
        }),
        requestAccess: async () => ({ address }),
        signTransaction: async (xdr: string) => ({ signedTxXdr: xdr }),
      }
      ;(window as any).freighter = freighter
      ;(window as any).__freighterApi = {
        isConnected: freighter.isConnected,
        isAllowed: freighter.isAllowed,
        getAddress: freighter.getAddress,
        getNetwork: freighter.getNetwork,
        requestAccess: freighter.requestAccess,
        signTransaction: freighter.signTransaction,
        setAllowed: async () => ({ isAllowed: false }),
      }
    },
    { address: MOCK_ADDRESS, passphrase: TESTNET_PASSPHRASE }
  )
}

export async function mockFreighterDisconnected(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as any).freighter = undefined
    ;(window as any).__freighterApi = {
      isConnected: async () => ({ isConnected: false }),
      isAllowed: async () => ({ isAllowed: false }),
      getAddress: async () => ({ address: '' }),
      getNetwork: async () => ({ network: '', networkPassphrase: '' }),
      requestAccess: async () => { throw new Error('Freighter not installed') },
      setAllowed: async () => ({ isAllowed: false }),
    }
  })
}
