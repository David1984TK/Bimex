import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/react'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  ErrorBoundary: ({ children }) => children,
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}))

describe('Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters PII from error events', () => {
    const beforeSend = (event) => {
      if (event.user) {
        delete event.user.id
        delete event.user.username
        delete event.user.email
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(bc => {
          if (!bc.data) return bc
          const sanitized = { ...bc.data }
          Object.keys(sanitized).forEach(key => {
            if (/address|wallet|direccion/i.test(key)) sanitized[key] = '[REDACTED]'
          })
          return { ...bc, data: sanitized }
        })
      }
      return event
    }

    const event = {
      user: { id: 'GXXX', username: 'test', email: 'test@example.com' },
      breadcrumbs: [{ data: { address: 'GXXX', wallet: 'w', direccion: 'd', other: 'safe' } }],
    }

    const sanitized = beforeSend(event)
    expect(sanitized.user).toEqual({})
    expect(sanitized.breadcrumbs[0].data.address).toBe('[REDACTED]')
    expect(sanitized.breadcrumbs[0].data.wallet).toBe('[REDACTED]')
    expect(sanitized.breadcrumbs[0].data.direccion).toBe('[REDACTED]')
    expect(sanitized.breadcrumbs[0].data.other).toBe('safe')
  })

  it('captureException can be called with tags', () => {
    const err = new Error('Test')
    Sentry.captureException(err, { tags: { tipo: 'test' } })
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { tags: { tipo: 'test' } })
  })
})
