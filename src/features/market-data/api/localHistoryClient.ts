import type { MarketHistorySnapshot } from '../types/MarketHistory'
import type {
  AlbionServer,
  MarketCityId,
} from '../types/MarketPrice'
import {
  LOCAL_MARKET_API_URL,
  LOCAL_SERVER_IDS,
} from './localMarketApi'
import { mapHistoryPoints } from './marketHistoryResponseMapping'

interface LocalHistoryRecord {
  readonly history?: unknown
}

interface LocalHistoryEnvelope {
  readonly data?: unknown
}

interface FetchLocalMarketHistoryParams {
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly city: MarketCityId
  readonly quality: number
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly signal?: AbortSignal
}

function createHistoryRequestUrl({
  server,
  itemIdentifier,
  city,
  quality,
}: Omit<FetchLocalMarketHistoryParams, 'rangeStart' | 'rangeEnd' | 'signal'>): string {
  const params = new URLSearchParams({
    server: LOCAL_SERVER_IDS[server],
    itemId: itemIdentifier,
    marketKey: city,
    quality: String(quality),
    period: '4-weeks',
    limit: '1',
  })

  return `${LOCAL_MARKET_API_URL}/history?${params.toString()}`
}

export async function fetchLocalMarketHistory({
  server,
  itemIdentifier,
  city,
  quality,
  rangeStart,
  rangeEnd,
  signal,
}: FetchLocalMarketHistoryParams): Promise<MarketHistorySnapshot> {
  const response = await fetch(
    createHistoryRequestUrl({
      server,
      itemIdentifier,
      city,
      quality,
    }),
    {
      signal,
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`El servicio local respondió con estado ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') {
    throw new Error('El servicio local devolvió un historial inesperado')
  }

  const data = (payload as LocalHistoryEnvelope).data
  const firstRecord = Array.isArray(data) && data.length > 0
    ? data[0]
    : undefined
  const history = firstRecord && typeof firstRecord === 'object'
    ? (firstRecord as LocalHistoryRecord).history
    : undefined

  return {
    server,
    itemIdentifier,
    city,
    quality,
    rangeStart,
    rangeEnd,
    points: mapHistoryPoints(history),
    source: 'local-receiver',
    fetchedAt: new Date().toISOString(),
  }
}
