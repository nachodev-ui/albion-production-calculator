import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import { fetchCentralMarketHistory } from './centralHistoryClient'

describe('fetchCentralMarketHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('consulta el historial batch por marketKey sin exponer location_id', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(
        JSON.stringify({
          requestedAt: '2026-06-26T23:00:00Z',
          rangeStart: '2026-05-30',
          rangeEnd: '2026-06-26',
          count: 1,
          bucketCount: 1,
          data: [
            {
              server: 'west',
              marketKey: 'martlock',
              itemIdentifier: 'T4_BAG',
              quality: 1,
              history: [
                {
                  timestamp: '2026-06-25T00:00:00Z',
                  itemCount: 12,
                  averageUnitPrice: 4500,
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const snapshots = await fetchCentralMarketHistory({
      server: 'americas',
      candidates: [
        {
          server: 'americas',
          city: 'martlock',
          itemIdentifier: 'T4_BAG',
          quality: 1,
        },
      ],
      rangeStart: '2026-05-30',
      rangeEnd: '2026-06-26',
    })

    expect(
      snapshots.get(
        buildMarketHistoryCacheKey('americas', 'martlock', 'T4_BAG', 1),
      ),
    ).toMatchObject({
      source: 'central-api',
      fetchedAt: '2026-06-26T23:00:00Z',
      points: [
        {
          timestamp: '2026-06-25T00:00:00Z',
          itemCount: 12,
          averagePrice: 4500,
        },
      ],
    })

    const [request, init] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>

    expect(String(request)).toContain('/api/v1/history/query')
    expect(init?.method).toBe('POST')
    expect(body).toEqual({
      server: 'west',
      marketKeys: ['martlock'],
      entries: [{ itemIdentifier: 'T4_BAG', quality: 1 }],
      rangeStart: '2026-05-30',
      rangeEnd: '2026-06-26',
    })
    expect(JSON.stringify(body)).not.toContain('location_id')
    expect(JSON.stringify(body)).not.toContain('locationId')
  })
})
