import type {
  CentralHistoryEnvelope,
  CentralHistorySeriesPayload,
} from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type {
  MarketHistoryCandidate,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type { AlbionServer } from '../types/MarketPrice'
import {
  CENTRAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
  MARKET_SERVER_IDS,
} from './localMarketApi'
import {
  mapHistoryPoints,
  normalizeHistoryTimestamp,
} from './marketHistoryResponseMapping'
import { runWithMarketSourceCooldown } from './marketSourceCooldown'

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

  return runWithMarketSourceCooldown('central-api', async () => {
    const marketKeys = Array.from(
      new Set(Array.from(requested.values(), (candidate) => candidate.city)),
    )

    const entryKeys = new Set<string>()
    const entries: {
      readonly itemIdentifier: string
      readonly quality: number
    }[] = []

    for (const candidate of requested.values()) {
      const entryKey = `${candidate.itemIdentifier}|${candidate.quality}`
      if (entryKeys.has(entryKey)) continue

      entryKeys.add(entryKey)
      entries.push({
        itemIdentifier: candidate.itemIdentifier,
        quality: candidate.quality,
      })
    }

    const envelope = await fetchJson<CentralHistoryEnvelope>(
      `${CENTRAL_MARKET_API_URL}/history/query`,
      {
        method: 'POST',
        signal,
        timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
        retryAttempts: 1,
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
      },
    )

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
  })
}
