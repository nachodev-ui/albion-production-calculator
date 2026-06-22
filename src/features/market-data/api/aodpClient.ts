import type {
  AlbionServer,
  MarketCityId,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import {
  MARKET_CITY_NAMES,
  buildMarketCacheKey,
} from '../types/MarketPrice'

const AODP_HOSTS: Record<AlbionServer, string> = {
  americas: 'https://west.albion-online-data.com',
  asia: 'https://east.albion-online-data.com',
  europe: 'https://europe.albion-online-data.com',
}

const MAX_URL_LENGTH = 3900

interface AodpPriceRow {
  readonly item_id?: unknown
  readonly city?: unknown
  readonly quality?: unknown
  readonly sell_price_min?: unknown
  readonly sell_price_min_date?: unknown
  readonly buy_price_max?: unknown
  readonly buy_price_max_date?: unknown
}

interface FetchCurrentPricesParams {
  readonly server: AlbionServer
  readonly itemIdentifiers: readonly string[]
  readonly cities: readonly MarketCityId[]
  readonly quality: number
  readonly signal?: AbortSignal
}

function normalizePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  if (value.startsWith('0001-01-01')) return null

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? value : null
}

function normalizeQuality(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : fallback
}

function findCityId(cityName: string): MarketCityId | null {
  const normalized = cityName.toLocaleLowerCase('en-US')

  for (const [id, name] of Object.entries(MARKET_CITY_NAMES)) {
    if (name.toLocaleLowerCase('en-US') === normalized) {
      return id as MarketCityId
    }
  }

  return null
}

function createRequestUrl(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  cities: readonly MarketCityId[],
  quality: number,
): string {
  const encodedItems = itemIdentifiers
    .map((identifier) => encodeURIComponent(identifier))
    .join(',')
  const locationNames = cities.map((city) => MARKET_CITY_NAMES[city]).join(',')
  const params = new URLSearchParams({
    locations: locationNames,
    qualities: String(quality),
  })

  return `${AODP_HOSTS[server]}/api/v2/stats/prices/${encodedItems}.json?${params.toString()}`
}

function splitIntoUrlSafeBatches(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  cities: readonly MarketCityId[],
  quality: number,
): readonly (readonly string[])[] {
  const batches: string[][] = []
  let current: string[] = []

  for (const identifier of itemIdentifiers) {
    const candidate = [...current, identifier]
    const candidateUrl = createRequestUrl(server, candidate, cities, quality)

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

function mapRow(
  server: AlbionServer,
  row: AodpPriceRow,
  fallbackQuality: number,
  fetchedAt: string,
): MarketPriceSnapshot | null {
  if (typeof row.item_id !== 'string' || typeof row.city !== 'string') {
    return null
  }

  const city = findCityId(row.city)
  if (!city) return null

  return {
    server,
    itemIdentifier: row.item_id,
    city,
    quality: normalizeQuality(row.quality, fallbackQuality),
    sellPriceMin: normalizePrice(row.sell_price_min),
    sellPriceMinDate: normalizeDate(row.sell_price_min_date),
    buyPriceMax: normalizePrice(row.buy_price_max),
    buyPriceMaxDate: normalizeDate(row.buy_price_max_date),
    fetchedAt,
  }
}

export async function fetchCurrentAodpPrices({
  server,
  itemIdentifiers,
  cities,
  quality,
  signal,
}: FetchCurrentPricesParams): Promise<ReadonlyMap<string, MarketPriceSnapshot>> {
  const uniqueItems = Array.from(new Set(itemIdentifiers)).filter(Boolean)
  const uniqueCities = Array.from(new Set(cities))

  if (uniqueItems.length === 0 || uniqueCities.length === 0) {
    return new Map()
  }

  const fetchedAt = new Date().toISOString()
  const result = new Map<string, MarketPriceSnapshot>()
  const batches = splitIntoUrlSafeBatches(
    server,
    uniqueItems,
    uniqueCities,
    quality,
  )

  for (const batch of batches) {
    const response = await fetch(
      createRequestUrl(server, batch, uniqueCities, quality),
      {
        signal,
        headers: {
          Accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`AODP respondió con estado ${response.status}`)
    }

    const payload: unknown = await response.json()

    if (!Array.isArray(payload)) {
      throw new Error('AODP devolvió una respuesta inesperada')
    }

    for (const candidate of payload) {
      if (!candidate || typeof candidate !== 'object') continue

      const snapshot = mapRow(
        server,
        candidate as AodpPriceRow,
        quality,
        fetchedAt,
      )

      if (!snapshot) continue

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

  /*
   * AODP puede omitir combinaciones sin datos. Se guardan igualmente como
   * snapshots vacíos para no repetir la misma consulta en cada render.
   */
  for (const itemIdentifier of uniqueItems) {
    for (const city of uniqueCities) {
      const key = buildMarketCacheKey(server, city, itemIdentifier, quality)

      if (result.has(key)) continue

      result.set(key, {
        server,
        itemIdentifier,
        city,
        quality,
        sellPriceMin: null,
        sellPriceMinDate: null,
        buyPriceMax: null,
        buyPriceMaxDate: null,
        fetchedAt,
      })
    }
  }

  return result
}
