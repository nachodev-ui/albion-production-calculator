import { describe, expect, it } from 'vitest'
import { FetchJsonError } from '@shared/http/fetchJson'
import { MarketSourceCooldownError } from './marketSourceCooldown'
import {
  describeMarketCacheFallback,
  describeMarketError,
  describeNoMarketData,
  isMarketRequestAbort,
} from './marketErrorMessages'

describe('marketErrorMessages', () => {
  it('describe timeouts as recoverable user-facing errors', () => {
    expect(
      describeMarketError(
        new FetchJsonError('Request timed out', {
          category: 'timeout',
          retriable: true,
        }),
        { source: 'central-api' },
      ),
    ).toContain('API central tardó demasiado')
  })

  it('describe network failures with source context', () => {
    expect(
      describeMarketError(
        new FetchJsonError('Network request failed', {
          category: 'network',
          retriable: true,
        }),
        { source: 'local-receiver' },
      ),
    ).toContain('receiver local no responde')
  })

  it('describe cooldown without exposing technical error names', () => {
    const message = describeMarketError(
      new MarketSourceCooldownError({
        source: 'central-api',
        failureCount: 2,
        blockedUntil: 31_000,
        remainingMs: 30_000,
        reason: 'timeout',
      }),
    )

    expect(message).toContain('API central está en cooldown temporal')
    expect(message).not.toContain('MarketSourceCooldownError')
  })

  it('recognizes request aborts as normal cancellation', () => {
    expect(
      isMarketRequestAbort(
        new FetchJsonError('Request aborted', {
          category: 'abort',
          retriable: false,
        }),
      ),
    ).toBe(true)
  })

  it('describes cache fallback and no-data states', () => {
    expect(describeMarketCacheFallback('history')).toContain(
      'historial guardado',
    )
    expect(describeNoMarketData('prices')).toContain(
      'no hay precios disponibles',
    )
  })
})
