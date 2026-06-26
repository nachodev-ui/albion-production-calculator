import type {
  AlbionServer,
  MarketCityId,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'

import { LOCAL_MARKET_API_URL, MARKET_SERVER_IDS } from './localMarketApi'
import { mapMarketPriceRow, parsePriceRows } from './marketResponseMapping'

const MAX_URL_LENGTH = 3900

interface FetchCurrentLocalPricesParams {
  readonly server: AlbionServer
  readonly itemIdentifiers: readonly string[]
  readonly cities: readonly MarketCityId[]
  readonly quality: number
  readonly signal?: AbortSignal
}

function createRequestUrl(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
): string {
  const params = new URLSearchParams({
    server: MARKET_SERVER_IDS[server],
    itemIds: itemIdentifiers.join(','),
    marketKey: city,
    quality: String(quality),
  })

  return `${LOCAL_MARKET_API_URL}/prices?${params.toString()}`
}

function splitIntoUrlSafeBatches(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
): readonly (readonly string[])[] {
  const batches: string[][] = []
  let current: string[] = []

  for (const identifier of itemIdentifiers) {
    const candidate = [...current, identifier]
    const candidateUrl = createRequestUrl(server, candidate, city, quality)

    if (candidateUrl.length > MAX_URL_LENGTH && current.length > 0) {
      batches.push(current)
      current = [identifier]
    } else {
      current = candidate
    }
  }

  if (current.length > 0) batches.push(current)
  return batches
}

async function fetchBatch(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
  fetchedAt: string,
  signal?: AbortSignal,
): Promise<readonly MarketPriceSnapshot[]> {
  const response = await fetch(
    createRequestUrl(server, itemIdentifiers, city, quality),
    {
      signal,
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`El receiver local respondió con estado ${response.status}`)
  }

  return parsePriceRows(await response.json()).flatMap((row) => {
    const snapshot = mapMarketPriceRow({
      server,
      fallbackCity: city,
      fallbackQuality: quality,
      row,
      source: 'local-receiver',
      fetchedAt,
    })

    return snapshot ? [snapshot] : []
  })
}

export async function fetchCurrentLocalPrices({
  server,
  itemIdentifiers,
  cities,
  quality,
  signal,
}: FetchCurrentLocalPricesParams): Promise<
  ReadonlyMap<string, MarketPriceSnapshot>
> {
  const uniqueItems = Array.from(new Set(itemIdentifiers)).filter(Boolean)
  const uniqueCities = Array.from(new Set(cities)).filter(Boolean)

  if (uniqueItems.length === 0 || uniqueCities.length === 0) {
    return new Map()
  }

  const fetchedAt = new Date().toISOString()
  const result = new Map<string, MarketPriceSnapshot>()

  for (const city of uniqueCities) {
    const batches = splitIntoUrlSafeBatches(server, uniqueItems, city, quality)

    for (const batch of batches) {
      const snapshots = await fetchBatch(
        server,
        batch,
        city,
        quality,
        fetchedAt,
        signal,
      )

      for (const snapshot of snapshots) {
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
    }
  }

  return result
}
