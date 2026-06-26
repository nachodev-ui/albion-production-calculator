import type {
  AlbionServer,
  MarketCityId,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'
import { CENTRAL_MARKET_API_URL, MARKET_SERVER_IDS } from './localMarketApi'
import { mapMarketPriceRow, parsePriceRows } from './marketResponseMapping'

interface FetchCurrentCentralPricesParams {
  readonly server: AlbionServer
  readonly itemIdentifiers: readonly string[]
  readonly cities: readonly MarketCityId[]
  readonly quality: number
  readonly signal?: AbortSignal
}

export async function fetchCurrentCentralPrices({
  server,
  itemIdentifiers,
  cities,
  quality,
  signal,
}: FetchCurrentCentralPricesParams): Promise<
  ReadonlyMap<string, MarketPriceSnapshot>
> {
  const uniqueItems = Array.from(new Set(itemIdentifiers)).filter(Boolean)
  const uniqueCities = Array.from(new Set(cities)).filter(Boolean)

  if (uniqueItems.length === 0 || uniqueCities.length === 0) {
    return new Map()
  }

  const response = await fetch(`${CENTRAL_MARKET_API_URL}/prices/query`, {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      server: MARKET_SERVER_IDS[server],
      marketKeys: uniqueCities,
      entries: uniqueItems.map((itemIdentifier) => ({
        itemIdentifier,
        quality,
      })),
    }),
  })

  if (!response.ok) {
    throw new Error(`La API central respondió con estado ${response.status}`)
  }

  const rows = parsePriceRows(await response.json())
  const fetchedAt = new Date().toISOString()
  const result = new Map<string, MarketPriceSnapshot>()

  for (const row of rows) {
    const snapshot = mapMarketPriceRow({
      server,
      fallbackQuality: quality,
      row,
      source: 'central-api',
      fetchedAt,
    })

    if (!snapshot || !uniqueCities.includes(snapshot.city)) continue

    result.set(
      buildMarketCacheKey(
        snapshot.server,
        snapshot.city,
        snapshot.itemIdentifier,
        snapshot.quality,
      ),
      snapshot,
    )
  }

  return result
}
