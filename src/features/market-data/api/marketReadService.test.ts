import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildMarketCacheKey,
  resolvePurchasePriceDetail,
} from '../types/MarketPrice'
import {
  fetchCurrentPricesWithFallback,
  fetchMarketsWithFallback,
} from './marketReadService'

const cachedMarkets = [
  {
    key: 'martlock',
    name: 'Martlock',
    type: 'regular' as const,
    enabled: true,
  },
]

describe('marketReadService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('usa el receiver cuando el modo local está habilitado y la API central no responde', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                itemIdentifier: 'T4_BAG',
                quality: 1,
                sellPriceMin: 12_000,
                sellPriceMinDate: '2026-06-26T22:00:00Z',
                buyPriceMax: 10_000,
                buyPriceMaxDate: '2026-06-26T21:59:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchCurrentPricesWithFallback({
      server: 'americas',
      itemIdentifiers: ['T4_BAG'],
      cities: ['martlock'],
      quality: 1,
      localReceiverFallbackEnabled: true,
    })

    expect(result.sources).toContain('local-receiver')
    expect(result.warnings[0]).toContain('API central no disponible')
    expect(
      result.snapshots.get(
        buildMarketCacheKey('americas', 'martlock', 'T4_BAG', 1),
      )?.source,
    ).toBe('local-receiver')
  })

  it('completa con el receiver solo las combinaciones ausentes en modo local', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                marketKey: 'martlock',
                itemIdentifier: 'T4_BAG',
                quality: 1,
                sellPriceMin: 12_500,
                sellPriceMinDate: '2026-06-26T22:00:00Z',
                buyPriceMax: 11_000,
                buyPriceMaxDate: '2026-06-26T21:59:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                itemIdentifier: 'T5_BAG',
                quality: 1,
                sellPriceMin: 24_000,
                sellPriceMinDate: '2026-06-26T22:00:00Z',
                buyPriceMax: 21_000,
                buyPriceMaxDate: '2026-06-26T21:59:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchCurrentPricesWithFallback({
      server: 'americas',
      itemIdentifiers: ['T4_BAG', 'T5_BAG'],
      cities: ['martlock'],
      quality: 1,
      localReceiverFallbackEnabled: true,
    })

    expect(result.sources).toEqual(['central-api', 'local-receiver'])
    expect(result.snapshots.size).toBe(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('itemIds=T5_BAG')
  })

  it('completa un lado ausente sin perder el precio central disponible en modo local', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                marketKey: 'martlock',
                itemIdentifier: 'T4_BAG',
                quality: 1,
                sellPriceMin: 12_500,
                sellPriceMinDate: '2026-06-26T22:00:00Z',
                buyPriceMax: null,
                buyPriceMaxDate: null,
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                itemIdentifier: 'T4_BAG',
                quality: 1,
                sellPriceMin: null,
                sellPriceMinDate: null,
                buyPriceMax: 11_000,
                buyPriceMaxDate: '2026-06-26T21:59:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchCurrentPricesWithFallback({
      server: 'americas',
      itemIdentifiers: ['T4_BAG'],
      cities: ['martlock'],
      quality: 1,
      localReceiverFallbackEnabled: true,
    })
    const snapshot = result.snapshots.get(
      buildMarketCacheKey('americas', 'martlock', 'T4_BAG', 1),
    )

    expect(snapshot?.sellPriceMin).toBe(12_500)
    expect(snapshot?.buyPriceMax).toBe(11_000)
    expect(resolvePurchasePriceDetail(snapshot, 'buy-now').source).toBe(
      'central-api',
    )
    expect(resolvePurchasePriceDetail(snapshot, 'buy-order').source).toBe(
      'local-receiver',
    )
  })

  it('no consulta el receiver para completar precios en modo público', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              marketKey: 'martlock',
              itemIdentifier: 'T4_BAG',
              quality: 1,
              sellPriceMin: 12_500,
              sellPriceMinDate: '2026-06-26T22:00:00Z',
              buyPriceMax: null,
              buyPriceMaxDate: null,
            },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchCurrentPricesWithFallback({
      server: 'americas',
      itemIdentifiers: ['T4_BAG'],
      cities: ['martlock'],
      quality: 1,
      localReceiverFallbackEnabled: false,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.sources).toEqual(['central-api'])
    expect(
      result.snapshots.get(
        buildMarketCacheKey('americas', 'martlock', 'T4_BAG', 1),
      )?.buyPriceMax,
    ).toBeNull()
  })

  it('degrada también el catálogo al receiver cuando el modo local está habilitado', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                key: 'martlock',
                name: 'Martlock',
                type: 'regular',
                enabled: true,
              },
            ],
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketsWithFallback([], undefined, true)

    expect(result.source).toBe('local-receiver')
    expect(result.markets[0]?.key).toBe('martlock')
    expect(result.warnings[0]).toContain('API central no disponible')
  })

  it('restaura el catálogo cacheado cuando ambas fuentes locales están caídas', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketsWithFallback(cachedMarkets, undefined, true)

    expect(result.source).toBe('browser-cache')
    expect(result.markets).toEqual(cachedMarkets)
    expect(
      result.warnings.some((warning) =>
        warning.toLowerCase().includes('receiver local'),
      ),
    ).toBe(true)
  })

  it('en modo público usa caché sin intentar conectarse al receiver', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketsWithFallback(cachedMarkets, undefined, false)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.source).toBe('browser-cache')
    expect(result.markets).toEqual(cachedMarkets)
    expect(result.warnings.some((warning) => warning.includes('receiver'))).toBe(
      false,
    )
    expect(result.warnings.some((warning) => warning.includes('caché'))).toBe(
      true,
    )
  })

  it('en modo público informa solo el fallo central cuando no existe caché', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchCurrentPricesWithFallback({
        server: 'americas',
        itemIdentifiers: ['T4_BAG'],
        cities: ['martlock'],
        quality: 1,
        localReceiverFallbackEnabled: false,
      }),
    ).rejects.toThrow('No se pudo consultar precios')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
