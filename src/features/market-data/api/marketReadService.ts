import type {
  AlbionServer,
  MarketCityId,
  MarketDataSource,
  MarketDefinition,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'
import { fetchCentralMarkets } from './centralMarketCatalogClient'
import { fetchCurrentCentralPrices } from './centralMarketClient'
import { fetchLocalMarkets } from './localMarketCatalogClient'
import { fetchCurrentLocalPrices } from './localMarketClient'

export interface MarketCatalogResult {
  readonly markets: readonly MarketDefinition[]
  readonly source: MarketDataSource
  readonly warnings: readonly string[]
}

export interface MarketPriceReadResult {
  readonly snapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly sources: readonly Exclude<MarketDataSource, 'browser-cache'>[]
  readonly warnings: readonly string[]
}

interface FetchCurrentPricesParams {
  readonly server: AlbionServer
  readonly itemIdentifiers: readonly string[]
  readonly cities: readonly MarketCityId[]
  readonly quality: number
  readonly signal?: AbortSignal
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export async function fetchMarketsWithFallback(
  cachedMarkets: readonly MarketDefinition[] = [],
  signal?: AbortSignal,
): Promise<MarketCatalogResult> {
  try {
    return {
      markets: await fetchCentralMarkets(signal),
      source: 'central-api',
      warnings: [],
    }
  } catch (centralError) {
    try {
      return {
        markets: await fetchLocalMarkets(signal),
        source: 'local-receiver',
        warnings: [`API central no disponible: ${describeError(centralError)}`],
      }
    } catch (localError) {
      if (cachedMarkets.length > 0) {
        return {
          markets: cachedMarkets,
          source: 'browser-cache',
          warnings: [
            `API central no disponible: ${describeError(centralError)}`,
            `Receiver local no disponible: ${describeError(localError)}`,
          ],
        }
      }

      throw new Error(
        `No fue posible cargar mercados. API central: ${describeError(centralError)}. Receiver local: ${describeError(localError)}`,
        { cause: localError },
      )
    }
  }
}

function requestedKeys({
  server,
  itemIdentifiers,
  cities,
  quality,
}: FetchCurrentPricesParams): readonly string[] {
  return Array.from(new Set(cities)).flatMap((city) =>
    Array.from(new Set(itemIdentifiers)).map((itemIdentifier) =>
      buildMarketCacheKey(server, city, itemIdentifier, quality),
    ),
  )
}

function needsLocalCompletion(
  snapshot: MarketPriceSnapshot | undefined,
): boolean {
  return (
    !snapshot || snapshot.sellPriceMin === null || snapshot.buyPriceMax === null
  )
}

function mergeSnapshots(
  primary: MarketPriceSnapshot | undefined,
  fallback: MarketPriceSnapshot,
): { readonly snapshot: MarketPriceSnapshot; readonly contributed: boolean } {
  if (!primary) return { snapshot: fallback, contributed: true }

  const useFallbackSell =
    primary.sellPriceMin === null && fallback.sellPriceMin !== null
  const useFallbackBuy =
    primary.buyPriceMax === null && fallback.buyPriceMax !== null

  if (!useFallbackSell && !useFallbackBuy) {
    return { snapshot: primary, contributed: false }
  }

  return {
    contributed: true,
    snapshot: {
      ...primary,
      sellPriceMin: useFallbackSell
        ? fallback.sellPriceMin
        : primary.sellPriceMin,
      sellPriceMinDate: useFallbackSell
        ? fallback.sellPriceMinDate
        : primary.sellPriceMinDate,
      sellPriceSource: useFallbackSell
        ? (fallback.sellPriceSource ?? fallback.source)
        : (primary.sellPriceSource ?? primary.source),
      buyPriceMax: useFallbackBuy ? fallback.buyPriceMax : primary.buyPriceMax,
      buyPriceMaxDate: useFallbackBuy
        ? fallback.buyPriceMaxDate
        : primary.buyPriceMaxDate,
      buyPriceSource: useFallbackBuy
        ? (fallback.buyPriceSource ?? fallback.source)
        : (primary.buyPriceSource ?? primary.source),
      fetchedAt:
        Date.parse(fallback.fetchedAt) > Date.parse(primary.fetchedAt)
          ? fallback.fetchedAt
          : primary.fetchedAt,
    },
  }
}

export async function fetchCurrentPricesWithFallback(
  params: FetchCurrentPricesParams,
): Promise<MarketPriceReadResult> {
  const keys = requestedKeys(params)
  if (keys.length === 0) {
    return { snapshots: new Map(), sources: [], warnings: [] }
  }

  const result = new Map<string, MarketPriceSnapshot>()
  const sources = new Set<Exclude<MarketDataSource, 'browser-cache'>>()
  const warnings: string[] = []
  let centralSucceeded = false
  let localSucceeded = false
  let centralError: unknown = null
  const localErrors: string[] = []

  try {
    const central = await fetchCurrentCentralPrices(params)
    centralSucceeded = true
    sources.add('central-api')
    for (const [key, snapshot] of central) result.set(key, snapshot)
  } catch (error) {
    centralError = error
    warnings.push(`API central no disponible: ${describeError(error)}`)
  }

  const missingByCity = new Map<MarketCityId, string[]>()
  for (const city of Array.from(new Set(params.cities))) {
    const missingItems = Array.from(new Set(params.itemIdentifiers)).filter(
      (itemIdentifier) =>
        needsLocalCompletion(
          result.get(
            buildMarketCacheKey(
              params.server,
              city,
              itemIdentifier,
              params.quality,
            ),
          ),
        ),
    )

    if (missingItems.length > 0) missingByCity.set(city, missingItems)
  }

  const localSettled = await Promise.allSettled(
    Array.from(missingByCity.entries()).map(async ([city, itemIdentifiers]) =>
      fetchCurrentLocalPrices({
        ...params,
        cities: [city],
        itemIdentifiers,
      }),
    ),
  )

  for (const settled of localSettled) {
    if (settled.status === 'fulfilled') {
      localSucceeded = true
      for (const [key, snapshot] of settled.value) {
        const merged = mergeSnapshots(result.get(key), snapshot)
        result.set(key, merged.snapshot)
        if (merged.contributed) sources.add('local-receiver')
      }
    } else {
      localErrors.push(describeError(settled.reason))
    }
  }

  if (localErrors.length > 0) {
    warnings.push(
      `Receiver local incompleto: ${Array.from(new Set(localErrors)).join('; ')}`,
    )
  }

  if (!centralSucceeded && !localSucceeded) {
    throw new Error(
      `No se pudo consultar precios. API central: ${describeError(centralError)}. Receiver local: ${localErrors.join('; ') || 'sin respuesta'}`,
    )
  }

  return {
    snapshots: result,
    sources: Array.from(sources),
    warnings,
  }
}
