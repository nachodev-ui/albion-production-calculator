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
import {
  describeMarketCacheFallback,
  describeMarketError,
  describeMarketFallbackWarning,
} from './marketErrorMessages'
import { fetchLocalMarkets } from './localMarketCatalogClient'
import { fetchCurrentLocalPrices } from './localMarketClient'
import { LOCAL_RECEIVER_FALLBACK_ENABLED } from './localMarketApi'

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
  readonly localReceiverFallbackEnabled?: boolean
}

export async function fetchMarketsWithFallback(
  cachedMarkets: readonly MarketDefinition[] = [],
  signal?: AbortSignal,
  localReceiverFallbackEnabled = LOCAL_RECEIVER_FALLBACK_ENABLED,
): Promise<MarketCatalogResult> {
  try {
    return {
      markets: await fetchCentralMarkets(signal),
      source: 'central-api',
      warnings: [],
    }
  } catch (centralError) {
    const centralWarning = describeMarketFallbackWarning(
      'central-api',
      centralError,
    )

    if (!localReceiverFallbackEnabled) {
      if (cachedMarkets.length > 0) {
        return {
          markets: cachedMarkets,
          source: 'browser-cache',
          warnings: [centralWarning, describeMarketCacheFallback('catalog')],
        }
      }

      throw new Error(
        `No fue posible cargar mercados. ${describeMarketError(centralError, {
          source: 'central-api',
        })}`,
        { cause: centralError },
      )
    }

    try {
      return {
        markets: await fetchLocalMarkets(signal),
        source: 'local-receiver',
        warnings: [centralWarning],
      }
    } catch (localError) {
      if (cachedMarkets.length > 0) {
        return {
          markets: cachedMarkets,
          source: 'browser-cache',
          warnings: [
            centralWarning,
            describeMarketFallbackWarning('local-receiver', localError),
            describeMarketCacheFallback('catalog'),
          ],
        }
      }

      throw new Error(
        `No fue posible cargar mercados. ${describeMarketError(centralError, {
          source: 'central-api',
        })} ${describeMarketError(localError, { source: 'local-receiver' })}`,
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

  const localReceiverFallbackEnabled =
    params.localReceiverFallbackEnabled ?? LOCAL_RECEIVER_FALLBACK_ENABLED
  const centralParams = {
    server: params.server,
    itemIdentifiers: params.itemIdentifiers,
    cities: params.cities,
    quality: params.quality,
    signal: params.signal,
  }
  const result = new Map<string, MarketPriceSnapshot>()
  const sources = new Set<Exclude<MarketDataSource, 'browser-cache'>>()
  const warnings: string[] = []
  let centralSucceeded = false
  let localSucceeded = false
  let centralError: unknown = null
  const localErrors: string[] = []

  try {
    const central = await fetchCurrentCentralPrices(centralParams)
    centralSucceeded = true
    sources.add('central-api')
    for (const [key, snapshot] of central) result.set(key, snapshot)
  } catch (error) {
    centralError = error
    warnings.push(describeMarketFallbackWarning('central-api', error))
  }

  if (localReceiverFallbackEnabled) {
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
          server: params.server,
          cities: [city],
          itemIdentifiers,
          quality: params.quality,
          signal: params.signal,
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
        localErrors.push(
          describeMarketError(settled.reason, { source: 'local-receiver' }),
        )
      }
    }

    if (localErrors.length > 0) {
      warnings.push(
        `Receiver local incompleto: ${Array.from(new Set(localErrors)).join('; ')}`,
      )
    }
  }

  if (!centralSucceeded && !localSucceeded) {
    const centralMessage = describeMarketError(centralError, {
      source: 'central-api',
    })

    throw new Error(
      localReceiverFallbackEnabled
        ? `No se pudo consultar precios. ${centralMessage} ${
            localErrors.length > 0
              ? `Receiver local: ${localErrors.join('; ')}`
              : 'Receiver local: sin respuesta.'
          }`
        : `No se pudo consultar precios. ${centralMessage}`,
    )
  }

  return {
    snapshots: result,
    sources: Array.from(sources),
    warnings,
  }
}
