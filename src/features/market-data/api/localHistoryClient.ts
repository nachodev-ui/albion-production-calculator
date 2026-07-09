import type {
  LocalHistoryEnvelope,
  LocalHistoryRecord,
} from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import type {
  AlbionServer,
  MarketCityId,
} from '../types/MarketPrice'
import {
  LOCAL_MARKET_API_URL,
  LOCAL_SERVER_IDS,
  MARKET_REQUEST_TIMEOUT_MS,
} from './localMarketApi'
import { mapHistoryPoints } from './marketHistoryResponseMapping'
import { runWithMarketSourceCooldown } from './marketSourceCooldown'

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
  return runWithMarketSourceCooldown('local-receiver', async () => {
    const payload = await fetchJson<LocalHistoryEnvelope>(
      createHistoryRequestUrl({
        server,
        itemIdentifier,
        city,
        quality,
      }),
      {
        signal,
        timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
        retryAttempts: 1,
        headers: {
          Accept: 'application/json',
        },
      },
    )

    const data = payload.data
    const firstRecord =
      Array.isArray(data) && data.length > 0 ? data[0] : undefined
    const history =
      firstRecord && typeof firstRecord === 'object'
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
  })
}
