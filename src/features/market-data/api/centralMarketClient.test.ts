import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMarketCacheKey } from '../types/MarketPrice'
import { fetchCurrentCentralPrices } from './centralMarketClient'

describe('fetchCurrentCentralPrices', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('consulta el contrato batch por marketKey sin exponer location ids', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            requestedAt: '2026-06-26T23:00:00Z',
            count: 1,
            data: [
              {
                server: 'west',
                marketKey: 'martlock',
                itemIdentifier: 'T4_BAG',
                quality: 1,
                sellPriceMin: 12_500,
                sellPriceMinDate: '2026-06-26T22:58:00Z',
                buyPriceMax: 11_000,
                buyPriceMaxDate: '2026-06-26T22:57:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const snapshots = await fetchCurrentCentralPrices({
      server: 'americas',
      itemIdentifiers: ['T4_BAG'],
      cities: ['martlock'],
      quality: 1,
    })

    expect(
      snapshots.get(buildMarketCacheKey('americas', 'martlock', 'T4_BAG', 1)),
    ).toMatchObject({
      city: 'martlock',
      sellPriceMin: 12_500,
      buyPriceMax: 11_000,
      source: 'central-api',
    })

    const [request, init] = fetchMock.mock.calls[0] ?? []
    expect(String(request)).toContain('/api/v1/prices/query')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      server: 'west',
      marketKeys: ['martlock'],
      entries: [{ itemIdentifier: 'T4_BAG', quality: 1 }],
    })
  })
})
