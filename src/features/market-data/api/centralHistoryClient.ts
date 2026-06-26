import type {
  MarketHistoryCandidate,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type { AlbionServer } from '../types/MarketPrice'
import { CENTRAL_MARKET_API_URL, MARKET_SERVER_IDS } from './localMarketApi'
import {
  mapHistoryPoints,
  normalizeHistoryTimestamp,
} from './marketHistoryResponseMapping'

interface CentralHistorySeriesPayload {
  readonly server?: unknown
  readonly marketKey?: unknown
  readonly itemIdentifier?: unknown
  readonly quality?: unknown
  readonly history?: unknown
}

interface CentralHistoryEnvelope {
  readonly requestedAt?: unknown
  readonly data?: unknown
}

interface FetchCentralHistoryParams {
  readonly server: AlbionServer
  readonly candidates: readonly MarketHistoryCandidate[]
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly signal?: AbortSignal
}

function normalizeQuality(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isInteger(parsed) ? parsed : null
  }
  return null
}

export async function fetchCentralMarketHistory({
  server,
  candidates,
  rangeStart,
  rangeEnd,
  signal,
}: FetchCentralHistoryParams): Promise<
  ReadonlyMap<string, MarketHistorySnapshot>
> {
  const requested = new Map<string, MarketHistoryCandidate>()

  for (const candidate of candidates) {
    if (candidate.server !== server) continue
    requested.set(
      buildMarketHistoryCacheKey(
        candidate.server,
        candidate.city,
        candidate.itemIdentifier,
        candidate.quality,
      ),
      candidate,
    )
  }

  if (requested.size === 0) return new Map()

  const marketKeys = Array.from(
    new Set(Array.from(requested.values(), (candidate) => candidate.city)),
  )
  const entryKeys = new Set<string>()
  const entries: { readonly itemIdentifier: string; readonly quality: number }[] = []

  for (const candidate of requested.values()) {
    const entryKey = `${candidate.itemIdentifier}|${candidate.quality}`
    if (entryKeys.has(entryKey)) continue
    entryKeys.add(entryKey)
    entries.push({
      itemIdentifier: candidate.itemIdentifier,
      quality: candidate.quality,
    })
  }

  const response = await fetch(`${CENTRAL_MARKET_API_URL}/history/query`, {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      server: MARKET_SERVER_IDS[server],
      marketKeys,
      entries,
      rangeStart,
      rangeEnd,
    }),
  })

  if (!response.ok) {
    throw new Error(`La API central respondió con estado ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') {
    throw new Error('La API central devolvió un historial inesperado')
  }

  const envelope = payload as CentralHistoryEnvelope
  const rows = Array.isArray(envelope.data) ? envelope.data : []
  const requestedAt =
    normalizeHistoryTimestamp(envelope.requestedAt) ?? new Date().toISOString()
  const result = new Map<string, MarketHistorySnapshot>()

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue

    const candidate = row as CentralHistorySeriesPayload
    if (
      typeof candidate.marketKey !== 'string' ||
      typeof candidate.itemIdentifier !== 'string'
    ) {
      continue
    }

    const quality = normalizeQuality(candidate.quality)
    if (quality === null) continue

    const cacheKey = buildMarketHistoryCacheKey(
      server,
      candidate.marketKey,
      candidate.itemIdentifier,
      quality,
    )
    if (!requested.has(cacheKey)) continue

    result.set(cacheKey, {
      server,
      city: candidate.marketKey,
      itemIdentifier: candidate.itemIdentifier,
      quality,
      rangeStart,
      rangeEnd,
      points: mapHistoryPoints(candidate.history),
      source: 'central-api',
      fetchedAt: requestedAt,
    })
  }

  return result
}
