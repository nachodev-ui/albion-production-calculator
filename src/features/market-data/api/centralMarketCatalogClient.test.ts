import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCentralMarkets } from './centralMarketCatalogClient'

describe('fetchCentralMarkets', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('consume el catálogo público sin ids internos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              schemaVersion: 1,
              data: [
                {
                  key: 'martlock',
                  name: 'Martlock',
                  type: 'regular',
                  enabled: true,
                },
                {
                  key: 'black_market',
                  name: 'Black Market',
                  type: 'black-market',
                  enabled: false,
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    )

    await expect(fetchCentralMarkets()).resolves.toEqual([
      {
        key: 'martlock',
        name: 'Martlock',
        type: 'regular',
        enabled: true,
      },
    ])
  })
})
