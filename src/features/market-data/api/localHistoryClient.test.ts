import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLocalMarketHistory } from './localHistoryClient'

describe('fetchLocalMarketHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('mapea el historial normalizado del servicio local', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          count: 1,
          source: 'local-market-service',
          data: [
            {
              history: [
                {
                  timestamp: '2026-06-20T00:00:00Z',
                  itemCount: 12,
                  averageUnitPrice: 4500,
                },
              ],
            },
          ],
        }),
        { status: 200 },
      )
    })

    vi.stubGlobal('fetch', fetchMock)

    const snapshot = await fetchLocalMarketHistory({
      server: 'americas',
      itemIdentifier: 'T4_SWORD',
      city: 'martlock',
      quality: 1,
      rangeStart: '2026-05-24',
      rangeEnd: '2026-06-20',
    })

    expect(snapshot.points).toEqual([
      {
        timestamp: '2026-06-20T00:00:00Z',
        averagePrice: 4500,
        itemCount: 12,
      },
    ])

    const request = fetchMock.mock.calls.at(0)?.[0]
    expect(String(request)).toContain('http://127.0.0.1:8787/api/v1/history?')
    expect(String(request)).toContain('server=west')
    expect(String(request)).toContain('marketKey=martlock')
    expect(String(request)).toContain('quality=1')
    expect(String(request)).toContain('period=4-weeks')
  })

  it('devuelve una serie vacía cuando la base local no conoce la combinación', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () =>
        new Response(JSON.stringify({ count: 0, data: [] }), { status: 200 }),
      ),
    )

    const snapshot = await fetchLocalMarketHistory({
      server: 'americas',
      itemIdentifier: 'T8_UNKNOWN',
      city: 'brecilien',
      quality: 5,
      rangeStart: '2026-05-24',
      rangeEnd: '2026-06-20',
    })

    expect(snapshot.points).toEqual([])
  })
})
