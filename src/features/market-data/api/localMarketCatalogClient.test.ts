import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLocalMarkets } from './localMarketCatalogClient'

describe('fetchLocalMarkets', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('carga únicamente mercados habilitados con ubicación observada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  key: 'thetford',
                  name: 'Thetford',
                  type: 'regular',
                  cityLocationId: '0000',
                  marketLocationId: '0007',
                  enabled: true,
                },
                {
                  key: 'black_market',
                  name: 'Black Market',
                  type: 'black-market',
                  cityLocationId: '3003',
                  marketLocationId: null,
                  enabled: false,
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    )

    await expect(fetchLocalMarkets()).resolves.toEqual([
      {
        key: 'thetford',
        name: 'Thetford',
        type: 'regular',
        enabled: true,
      },
    ])
  })
})
