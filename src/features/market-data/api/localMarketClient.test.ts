import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCurrentLocalPrices } from './localMarketClient'
import { buildMarketCacheKey } from '../types/MarketPrice'

describe('fetchCurrentLocalPrices', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('mapea venta mínima y compra máxima desde la API batch local', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            count: 1,
            source: 'local-market-service',
            data: [
              {
                server: 'west',
                itemIdentifier: 'T6_MAIN_CURSEDSTAFF_CRYSTAL@3',
                location: { id: '5003', name: 'Brecilien' },
                quality: 4,
                sellPriceMin: 2_899_978,
                sellPriceMinDate: '2026-06-22T20:17:30Z',
                buyPriceMax: 1_901_190,
                buyPriceMaxDate: '2026-06-22T20:17:34Z',
              },
            ],
          }),
          { status: 200 },
        ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const snapshots = await fetchCurrentLocalPrices({
      server: 'americas',
      itemIdentifiers: ['T6_MAIN_CURSEDSTAFF_CRYSTAL@3'],
      cities: ['brecilien'],
      quality: 4,
    })

    const key = buildMarketCacheKey(
      'americas',
      'brecilien',
      'T6_MAIN_CURSEDSTAFF_CRYSTAL@3',
      4,
    )

    expect(snapshots.get(key)).toMatchObject({
      sellPriceMin: 2_899_978,
      buyPriceMax: 1_901_190,
      city: 'brecilien',
      quality: 4,
      source: 'local-receiver',
    })

    const request = fetchMock.mock.calls.at(0)?.[0]
    expect(String(request)).toContain('/api/v1/prices?')
    expect(String(request)).toContain('server=west')
    expect(String(request)).toContain('marketKey=brecilien')
  })
})
