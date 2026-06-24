import type {
  AlbionServer,
  MarketCityId,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'

import { LOCAL_MARKET_API_URL, LOCAL_SERVER_IDS } from './localMarketApi'

const MAX_URL_LENGTH = 3900

interface LocalPriceRow {
  readonly server?: unknown
  readonly itemIdentifier?: unknown
  readonly marketKey?: unknown
  readonly location?: unknown
  readonly quality?: unknown
  readonly sellPriceMin?: unknown
  readonly sellPriceMinDate?: unknown
  readonly buyPriceMax?: unknown
  readonly buyPriceMaxDate?: unknown
}

interface LocalPriceEnvelope {
  readonly data?: unknown
}

interface FetchCurrentLocalPricesParams {
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

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? value : null
}

function normalizeQuality(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : fallback
}

function createRequestUrl(
  server: AlbionServer,
  itemIdentifiers: readonly string[],
  city: MarketCityId,
  quality: number,
): string {
  const params = new URLSearchParams({
    server: LOCAL_SERVER_IDS[server],
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

function mapRow(
  server: AlbionServer,
  city: MarketCityId,
  row: LocalPriceRow,
  fallbackQuality: number,
  fetchedAt: string,
): MarketPriceSnapshot | null {
  if (typeof row.itemIdentifier !== 'string') return null

  return {
    server,
    itemIdentifier: row.itemIdentifier,
    city,
    quality: normalizeQuality(row.quality, fallbackQuality),
    sellPriceMin: normalizePrice(row.sellPriceMin),
    sellPriceMinDate: normalizeDate(row.sellPriceMinDate),
    buyPriceMax: normalizePrice(row.buyPriceMax),
    buyPriceMaxDate: normalizeDate(row.buyPriceMaxDate),
    fetchedAt,
  }
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
    throw new Error(`El servicio local respondió con estado ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') {
    throw new Error('El servicio local devolvió una respuesta inesperada')
  }

  const rows = (payload as LocalPriceEnvelope).data
  if (!Array.isArray(rows)) {
    throw new Error('El servicio local no devolvió la lista de precios esperada')
  }

  return rows.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []

    const snapshot = mapRow(
      server,
      city,
      candidate as LocalPriceRow,
      quality,
      fetchedAt,
    )

    return snapshot ? [snapshot] : []
  })
}

export async function fetchCurrentLocalPrices({
  server,
  itemIdentifiers,
  cities,
  quality,
  signal,
}: FetchCurrentLocalPricesParams): Promise<ReadonlyMap<string, MarketPriceSnapshot>> {
  const uniqueItems = Array.from(new Set(itemIdentifiers)).filter(Boolean)
  const uniqueCities = Array.from(new Set(cities))

  if (uniqueItems.length === 0 || uniqueCities.length === 0) {
    return new Map()
  }

  const fetchedAt = new Date().toISOString()
  const result = new Map<string, MarketPriceSnapshot>()

  for (const city of uniqueCities) {
    const batches = splitIntoUrlSafeBatches(
      server,
      uniqueItems,
      city,
      quality,
    )

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

  // El servicio devuelve una fila vacía cuando no conoce una combinación,
  // pero completamos igualmente el mapa para mantener el contrato del store.
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
