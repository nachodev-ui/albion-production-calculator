import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import { fetchMarketHistoryWithFallback } from './historyReadService'

const candidate = {
  server: 'americas' as const,
  city: 'martlock',
  itemIdentifier: 'T4_BAG',
  quality: 1,
}
const rangeStart = '2026-05-30'
const rangeEnd = '2026-06-26'

function centralEnvelope(
  data: readonly Record<string, unknown>[],
): Response {
  return new Response(
    JSON.stringify({
      requestedAt: '2026-06-26T23:00:00Z',
      rangeStart,
      rangeEnd,
      count: data.length,
      data,
    }),
    { status: 200 },
  )
}

function historySeries(
  marketKey: string,
  itemIdentifier: string,
  averageUnitPrice: number,
): Record<string, unknown> {
  return {
    server: 'west',
    marketKey,
    itemIdentifier,
    quality: 1,
    history: [
      {
        timestamp: '2026-06-25T00:00:00Z',
        itemCount: 12,
        averageUnitPrice,
      },
    ],
  }
}

describe('fetchMarketHistoryWithFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('usa la API central cuando está disponible', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      centralEnvelope([historySeries('martlock', 'T4_BAG', 4500)]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketHistoryWithFallback({
      candidates: [candidate],
      rangeStart,
      rangeEnd,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.sources).toEqual(['central-api'])
    expect(
      result.snapshots.get(
        buildMarketHistoryCacheKey('americas', 'martlock', 'T4_BAG', 1),
      )?.source,
    ).toBe('central-api')
  })

  it('usa el receiver local cuando falla la API central', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            count: 1,
            data: [
              {
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

    const result = await fetchMarketHistoryWithFallback({
      candidates: [candidate],
      rangeStart,
      rangeEnd,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.sources).toEqual(['local-receiver'])
    expect(result.warnings[0]).toContain('API central no disponible')
    expect(
      result.snapshots.get(
        buildMarketHistoryCacheKey('americas', 'martlock', 'T4_BAG', 1),
      )?.source,
    ).toBe('local-receiver')
  })


  it('consulta el receiver solo para las combinaciones ausentes en la API central', async () => {
    const candidates = [
      candidate,
      {
        server: 'americas' as const,
        city: 'martlock',
        itemIdentifier: 'T5_BAG',
        quality: 1,
      },
    ]
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        centralEnvelope([historySeries('martlock', 'T4_BAG', 4500)]),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            count: 1,
            data: [
              {
                history: [
                  {
                    timestamp: '2026-06-25T00:00:00Z',
                    itemCount: 9,
                    averageUnitPrice: 8200,
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketHistoryWithFallback({
      candidates,
      rangeStart,
      rangeEnd,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.sources).toEqual(['central-api', 'local-receiver'])
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('itemId=T5_BAG')
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('itemId=T4_BAG')
  })

  it('restaura la caché cuando ambas fuentes están caídas', async () => {
    const cacheKey = buildMarketHistoryCacheKey(
      'americas',
      'martlock',
      'T4_BAG',
      1,
    )
    const cached: MarketHistorySnapshot = {
      ...candidate,
      rangeStart,
      rangeEnd,
      points: [
        {
          timestamp: '2026-06-24T00:00:00Z',
          itemCount: 8,
          averagePrice: 4300,
        },
      ],
      source: 'central-api',
      fetchedAt: '2026-06-25T10:00:00Z',
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketHistoryWithFallback({
      candidates: [candidate],
      rangeStart,
      rangeEnd,
      cachedSnapshots: new Map([[cacheKey, cached]]),
    })

    expect(result.failedKeys).toEqual([])
    expect(result.sources).toEqual(['browser-cache'])
    expect(result.snapshots.get(cacheKey)).toMatchObject({
      source: 'browser-cache',
      fetchedAt: '2026-06-25T10:00:00Z',
    })
  })

  it('consulta múltiples candidatos en un solo batch central', async () => {
    const candidates = [
      candidate,
      {
        server: 'americas' as const,
        city: 'fort_sterling',
        itemIdentifier: 'T5_BAG',
        quality: 1,
      },
    ]
    const fetchMock = vi.fn<typeof fetch>(async () =>
      centralEnvelope([
        historySeries('martlock', 'T4_BAG', 4500),
        historySeries('fort_sterling', 'T5_BAG', 8500),
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketHistoryWithFallback({
      candidates,
      rangeStart,
      rangeEnd,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.requestCount).toBe(1)
    expect(result.snapshots.size).toBe(2)

    const body = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as Record<string, unknown>
    expect(body['marketKeys']).toEqual(['martlock', 'fort_sterling'])
    expect(body['entries']).toEqual([
      { itemIdentifier: 'T4_BAG', quality: 1 },
      { itemIdentifier: 'T5_BAG', quality: 1 },
    ])
  })
})
