import type {
  MarketHistoryPoint,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
import type {
  AlbionServer,
  MarketCityId,
} from '../types/MarketPrice'
import {
  LOCAL_MARKET_API_URL,
  LOCAL_SERVER_IDS,
} from './localMarketApi'

interface LocalHistoryPoint {
  readonly timestamp?: unknown
  readonly itemCount?: unknown
  readonly averageUnitPrice?: unknown
}

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

function normalizeFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? value : null
}

function mapHistoryPoints(value: unknown): readonly MarketHistoryPoint[] {
  if (!Array.isArray(value)) return []

  const points: MarketHistoryPoint[] = []

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue

    const point = candidate as LocalHistoryPoint
    const timestamp = normalizeTimestamp(point.timestamp)
    if (!timestamp) continue

    const count = normalizeFiniteNumber(point.itemCount)
    const averagePrice = normalizeFiniteNumber(point.averageUnitPrice)

    points.push({
      timestamp,
      averagePrice:
        averagePrice !== null && averagePrice > 0 ? averagePrice : null,
      itemCount: count === null ? 0 : Math.max(0, count),
    })
  }

  return points.sort(
    (left, right) =>
      Date.parse(left.timestamp) - Date.parse(right.timestamp),
  )
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
    fetchedAt: new Date().toISOString(),
  }
}
