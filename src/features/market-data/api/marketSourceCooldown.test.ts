import { afterEach, describe, expect, it, vi } from 'vitest'
import { FetchJsonError } from '@shared/http/fetchJson'
import {
  enableMarketSourceCooldownForTests,
  getMarketSourceCooldown,
  getMarketSourceStatuses,
  isMarketSourceInCooldown,
  recordMarketSourceFailure,
  recordMarketSourceSuccess,
  resetMarketSourceCooldownForTests,
  runWithMarketSourceCooldown,
} from './marketSourceCooldown'

describe('marketSourceCooldown', () => {
  afterEach(() => {
    resetMarketSourceCooldownForTests()
    vi.restoreAllMocks()
  })

  it('abre cooldown para fallos transitorios', () => {
    recordMarketSourceFailure(
      'central-api',
      new FetchJsonError('Network request failed', {
        category: 'network',
        retriable: true,
      }),
      1_000,
    )

    const cooldown = getMarketSourceCooldown('central-api', 1_001)

    expect(cooldown).toMatchObject({
      source: 'central-api',
      failureCount: 1,
      reason: 'network',
    })
    expect(cooldown?.remainingMs).toBeGreaterThan(0)
  })

  it('expone ambas fuentes runtime cuando el modo local está habilitado', () => {
    recordMarketSourceFailure(
      'local-receiver',
      new FetchJsonError('HTTP 503', {
        category: 'http',
        status: 503,
        retriable: true,
      }),
      1_000,
    )

    expect(getMarketSourceStatuses(1_001, true)).toEqual([
      {
        source: 'central-api',
        state: 'ready',
        cooldown: null,
      },
      {
        source: 'local-receiver',
        state: 'cooldown',
        cooldown: expect.objectContaining({
          source: 'local-receiver',
          reason: 'http:503',
        }),
      },
    ])
  })

  it('oculta el receiver de los estados runtime en modo público', () => {
    recordMarketSourceFailure(
      'local-receiver',
      new FetchJsonError('HTTP 503', {
        category: 'http',
        status: 503,
        retriable: true,
      }),
      1_000,
    )

    expect(getMarketSourceStatuses(1_001, false)).toEqual([
      {
        source: 'central-api',
        state: 'ready',
        cooldown: null,
      },
    ])
  })

  it('no abre cooldown para abortos del usuario', () => {
    recordMarketSourceFailure(
      'central-api',
      new FetchJsonError('Request aborted', {
        category: 'abort',
        retriable: false,
      }),
      1_000,
    )

    expect(isMarketSourceInCooldown('central-api', 1_001)).toBe(false)
  })

  it('limpia cooldown cuando una fuente vuelve a responder', () => {
    recordMarketSourceFailure(
      'local-receiver',
      new FetchJsonError('HTTP 503', {
        category: 'http',
        status: 503,
        retriable: true,
      }),
      1_000,
    )

    expect(isMarketSourceInCooldown('local-receiver', 1_001)).toBe(true)

    recordMarketSourceSuccess('local-receiver')

    expect(isMarketSourceInCooldown('local-receiver', 1_001)).toBe(false)
  })

  it('evita ejecutar operaciones durante cooldown activo', async () => {
    enableMarketSourceCooldownForTests()
    recordMarketSourceFailure(
      'central-api',
      new FetchJsonError('Request timed out', {
        category: 'timeout',
        retriable: true,
      }),
      1_000,
    )

    const operation = vi.fn<() => Promise<string>>()

    await expect(
      runWithMarketSourceCooldown('central-api', operation, () => 1_001),
    ).rejects.toMatchObject({
      name: 'MarketSourceCooldownError',
      source: 'central-api',
    })

    expect(operation).not.toHaveBeenCalled()
  })
})
