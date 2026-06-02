import type { Page } from '@playwright/test'

export const MOCK_ADDRESS = 'GCTEST1234MOCKADDRESSBIMEXSTELLARTESTNETABCDE56789XYZ'
export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

// The freighter-api library communicates with the extension via window.postMessage.
// Requests have source:"FREIGHTER_EXTERNAL_MSG_REQUEST" and a messageId.
// Responses must have source:"FREIGHTER_EXTERNAL_MSG_RESPONSE" and messagedId (library typo).
function interceptFreighterMessages(
  page: Page,
  getResponse: (type: string, messageId: number) => Record<string, unknown> | null
) {
  return page.addInitScript((handler: string) => {
    const _postMessage = window.postMessage.bind(window)
    window.postMessage = (data: any, targetOrigin: any, transfer?: any) => {
      if (data?.source === 'FREIGHTER_EXTERNAL_MSG_REQUEST') {
        const fn = new Function('return ' + handler)() as (t: string, id: number) => Record<string, unknown> | null
        const resp = fn(data.type, data.messageId)
        if (resp !== null) {
          setTimeout(() =>
            window.dispatchEvent(new MessageEvent('message', {
              data: { source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE', messagedId: data.messageId, ...resp },
              source: window,
              origin: window.location.origin,
            }))
          , 0)
          return
        }
      }
      return _postMessage(data, targetOrigin, transfer)
    }
  }, getResponse.toString())
}

export async function mockFreighterConnected(page: Page): Promise<void> {
  await page.addInitScript(
    ({ address, passphrase }: { address: string; passphrase: string }) => {
      // isConnected() short-circuits when window.freighter is truthy
      ;(window as any).freighter = true

      // Intercept postMessage to fake Freighter extension responses
      const _postMessage = window.postMessage.bind(window)
      window.postMessage = (data: any, targetOrigin: any, transfer?: any) => {
        if (data?.source === 'FREIGHTER_EXTERNAL_MSG_REQUEST') {
          const { messageId, type } = data
          const resp: Record<string, unknown> = {}
          switch (type) {
            case 'REQUEST_ALLOWED_STATUS': resp.isAllowed = true; break
            case 'REQUEST_PUBLIC_KEY': resp.publicKey = address; break
            case 'REQUEST_NETWORK':
              resp.network = 'TESTNET'
              resp.networkPassphrase = passphrase
              break
            case 'REQUEST_NETWORK_DETAILS':
              resp.network = 'TESTNET'
              resp.networkPassphrase = passphrase
              resp.networkUrl = 'https://horizon-testnet.stellar.org'
              break
            case 'REQUEST_CONNECTION_STATUS': resp.isConnected = true; break
            case 'SET_ALLOWED_STATUS': resp.isAllowed = false; break
            default: resp.error = { code: -1, message: 'unknown' }
          }
          setTimeout(() =>
            window.dispatchEvent(new MessageEvent('message', {
              data: { source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE', messagedId: messageId, ...resp },
              source: window,
              origin: window.location.origin,
            }))
          , 0)
          return
        }
        return _postMessage(data, targetOrigin, transfer)
      }
    },
    { address: MOCK_ADDRESS, passphrase: TESTNET_PASSPHRASE }
  )
}

export async function mockFreighterDisconnected(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as any).freighter = undefined

    const _postMessage = window.postMessage.bind(window)
    window.postMessage = (data: any, targetOrigin: any, transfer?: any) => {
      if (data?.source === 'FREIGHTER_EXTERNAL_MSG_REQUEST') {
        const { messageId, type } = data
        const resp: Record<string, unknown> = {}
        switch (type) {
          case 'REQUEST_ALLOWED_STATUS': resp.isAllowed = false; break
          case 'REQUEST_PUBLIC_KEY': resp.publicKey = ''; break
          case 'REQUEST_NETWORK': resp.network = ''; resp.networkPassphrase = ''; break
          case 'REQUEST_CONNECTION_STATUS': resp.isConnected = false; break
          case 'SET_ALLOWED_STATUS': resp.isAllowed = false; break
          default: resp.error = { code: -1, message: 'unknown' }
        }
        setTimeout(() =>
          window.dispatchEvent(new MessageEvent('message', {
            data: { source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE', messagedId: messageId, ...resp },
            source: window,
            origin: window.location.origin,
          }))
        , 0)
        return
      }
      return _postMessage(data, targetOrigin, transfer)
    }
  })
}
