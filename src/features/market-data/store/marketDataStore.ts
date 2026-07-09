import { create } from 'zustand'
import {
  fetchCurrentPricesWithFallback,
  fetchMarketsWithFallback,
} from '../api/marketReadService'
import type {
  MarketCatalogResult,
  MarketPriceReadResult,
} from '../api/marketReadService'
import {
  describeMarketCacheFallback,
  describeMarketError,
  isMarketRequestAbort,
} from '../api/marketErrorMessages'
import {
  loadMaterialPurchaseCities,
  saveMaterialPurchaseCities,
} from '../storage/materialPurchaseCityStorage'
import {
  clearStoredMarketCache,
  loadMarketCatalog,
  loadManualSellPrices,
  loadMarketCache,
  loadMarketConfig,
  saveManualSellPrices,
  saveMarketCatalog,
  saveMarketCache,
  saveMarketConfig,
} from '../storage/marketPriceStorage'
import type {
  MarketCatalogStatus,
  MarketCityId,
  MarketConfig,
  MarketDataSource,
  MarketDefinition,
  MarketLastAttempt,
  MarketLastAttemptKind,
  MarketPriceSnapshot,
  MarketPriceTarget,
  MarketRequestStatus,
  MaterialPurchaseCitiesByRoot,
} from '../types/MarketPrice'
import {
  MARKET_DATA_SOURCE_LABELS,
  MATERIAL_MARKET_QUALITY,
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  getMarketName,
  resolvePurchasePrice,
  resolvePurchasePriceDate,
  resolveSalePrice,
  resolveSalePriceDate,
} from '../types/MarketPrice'
import { classifyMarketRefreshOutcome } from '../types/MarketRefresh'
import type {
  MarketRefreshItemKind,
  MarketRefreshItemReport,
  MarketRefreshOrigin,
  MarketRefreshProgress,
  MarketRefreshReport,
} from '../types/MarketRefresh'

const MARKET_CACHE_TTL_MS = 5 * 60 * 1000
let latestRequestId = 0
let latestReportId = 0
let marketCatalogPromise: Promise<MarketCatalogResult> | null = null
let activePriceRefreshController: AbortController | null = null

interface RefreshMarketPricesParams {
  readonly rootKey: string
  readonly materialTargets: readonly MarketPriceTarget[]
  readonly reportMaterialTargets?: readonly MarketPriceTarget[]
  readonly saleTarget: MarketPriceTarget | null
  readonly force?: boolean
  readonly origin?: MarketRefreshOrigin
  readonly targetLabels?: ReadonlyMap<string, string>
  readonly manualOverrideCount?: number
}

interface ActiveRefreshTarget {
  readonly targetKey: string
  readonly itemIdentifier: string
  readonly label: string
  readonly kind: MarketRefreshItemKind
  readonly city: MarketCityId
  readonly quality: number
  readonly strategy:
    | MarketConfig['purchaseStrategy']
    | MarketConfig['saleStrategy']
}

interface RefreshRequestPlan {
  readonly combinationCount: number
  readonly execute: (signal: AbortSignal) => Promise<MarketPriceReadResult>
}

interface MarketDataState {
  readonly config: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly catalogStatus: MarketCatalogStatus
  readonly catalogError: string | null
  readonly catalogSource: MarketDataSource | null
  readonly catalogWarnings: readonly string[]
  readonly catalogLastAttempt: MarketLastAttempt | null
  readonly snapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly manualSellPrices: ReadonlyMap<string, number>
  readonly materialPurchaseCitiesByRoot: MaterialPurchaseCitiesByRoot
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly refreshWarnings: readonly string[]
  readonly lastSuccessfulFetchAt: string | null
  readonly priceLastAttempt: MarketLastAttempt | null
  readonly refreshProgress: MarketRefreshProgress | null
  readonly lastRefreshReport: MarketRefreshReport | null
  loadMarkets: () => Promise<readonly MarketDefinition[]>
  setConfig: (patch: Partial<MarketConfig>) => void
  refreshPrices: (params: RefreshMarketPricesParams) => Promise<void>
  dismissRefreshReport: () => void
  clearCache: () => void
  setManualSellPrice: (rootKey: string, price: number | null) => void
  setMaterialPurchaseCity: (
    rootKey: string,
    itemPriceKey: string,
    city: MarketCityId | null,
  ) => void
  clearMaterialPurchaseCities: (rootKey: string) => void
  applyMarketRecommendation: (
    rootKey: string,
    materialCities: ReadonlyMap<string, MarketCityId>,
    saleCity: MarketCityId | null,
  ) => void
}

function createRunningAttempt(
  kind: MarketLastAttemptKind,
  message: string,
  startedAt = new Date().toISOString(),
): MarketLastAttempt {
  return {
    kind,
    status: 'running',
    startedAt,
    finishedAt: null,
    message,
  }
}

function finishAttempt(
  kind: MarketLastAttemptKind,
  status: 'success' | 'error',
  startedAt: string,
  message: string,
): MarketLastAttempt {
  return {
    kind,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    message,
  }
}

function abortActivePriceRefresh(): void {
  activePriceRefreshController?.abort()
  activePriceRefreshController = null
}

function isSnapshotFresh(snapshot: MarketPriceSnapshot | undefined): boolean {
  if (!snapshot || snapshot.source === 'browser-cache') return false
  return Date.now() - Date.parse(snapshot.fetchedAt) < MARKET_CACHE_TTL_MS
}

function buildActiveRefreshTargets(
  params: RefreshMarketPricesParams,
  config: MarketConfig,
  materialPurchaseCitiesByRoot: MaterialPurchaseCitiesByRoot,
): readonly ActiveRefreshTarget[] {
  const targets = new Map<string, ActiveRefreshTarget>()
  const overrides = materialPurchaseCitiesByRoot.get(params.rootKey)

  for (const target of params.reportMaterialTargets ?? params.materialTargets) {
    const targetKey = buildItemPriceKey(target.itemId, target.enchantment)
    const itemIdentifier = buildMarketItemIdentifier(
      target.itemId,
      target.enchantment,
    )

    targets.set(`material:${targetKey}`, {
      targetKey,
      itemIdentifier,
      label: params.targetLabels?.get(targetKey) ?? itemIdentifier,
      kind: 'material',
      city: overrides?.get(targetKey) ?? config.purchaseCity,
      quality: MATERIAL_MARKET_QUALITY,
      strategy: config.purchaseStrategy,
    })
  }

  if (params.saleTarget) {
    const targetKey = buildItemPriceKey(
      params.saleTarget.itemId,
      params.saleTarget.enchantment,
    )
    const itemIdentifier = buildMarketItemIdentifier(
      params.saleTarget.itemId,
      params.saleTarget.enchantment,
    )

    targets.set(`sale:${targetKey}`, {
      targetKey,
      itemIdentifier,
      label: params.targetLabels?.get(targetKey) ?? itemIdentifier,
      kind: 'sale',
      city: config.saleCity,
      quality: config.quality,
      strategy: config.saleStrategy,
    })
  }

  return Array.from(targets.values())
}

function resolveTargetValue(
  target: ActiveRefreshTarget,
  snapshot: MarketPriceSnapshot | undefined,
  config: MarketConfig,
): number | null {
  return target.kind === 'material'
    ? resolvePurchasePrice(snapshot, config.purchaseStrategy)
    : resolveSalePrice(snapshot, config.saleStrategy)
}

function resolveTargetDate(
  target: ActiveRefreshTarget,
  snapshot: MarketPriceSnapshot | undefined,
  config: MarketConfig,
): string | null {
  return target.kind === 'material'
    ? resolvePurchasePriceDate(snapshot, config.purchaseStrategy)
    : resolveSalePriceDate(snapshot, config.saleStrategy)
}

function buildRefreshReport({
  rootKey,
  activeTargets,
  beforeSnapshots,
  afterSnapshots,
  config,
  markets,
  startedAt,
  completedAt,
  requestedCombinations,
  requestCount,
  manualOverrideCount,
}: {
  readonly rootKey: string
  readonly activeTargets: readonly ActiveRefreshTarget[]
  readonly beforeSnapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly afterSnapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly config: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly startedAt: string
  readonly completedAt: string
  readonly requestedCombinations: number
  readonly requestCount: number
  readonly manualOverrideCount: number
}): MarketRefreshReport {
  const items: MarketRefreshItemReport[] = activeTargets.map((target) => {
    const cacheKey = buildMarketCacheKey(
      config.server,
      target.city,
      target.itemIdentifier,
      target.quality,
    )
    const beforeSnapshot = beforeSnapshots.get(cacheKey)
    const afterSnapshot = afterSnapshots.get(cacheKey)
    const previousValue = resolveTargetValue(target, beforeSnapshot, config)
    const currentValue = resolveTargetValue(target, afterSnapshot, config)
    const outcome = classifyMarketRefreshOutcome(previousValue, currentValue)

    return {
      targetKey: target.targetKey,
      itemIdentifier: target.itemIdentifier,
      label: target.label,
      kind: target.kind,
      city: target.city,
      cityName: getMarketName(markets, target.city),
      quality: target.quality,
      strategy: target.strategy,
      previousValue,
      currentValue,
      updatedAt: resolveTargetDate(target, afterSnapshot, config),
      outcome,
    }
  })

  return {
    id: ++latestReportId,
    rootKey,
    startedAt,
    completedAt,
    requestedCombinations,
    requestCount,
    updated: items.filter((item) => item.outcome === 'updated').length,
    unchanged: items.filter((item) => item.outcome === 'unchanged').length,
    missing: items.filter((item) => item.outcome === 'missing').length,
    manualPreserved: Math.max(0, Math.floor(manualOverrideCount)),
    items,
  }
}

const initialSnapshots = loadMarketCache()
const initialMarkets = loadMarketCatalog()
const initialConfig = loadMarketConfig()
const initialSellPrices = loadManualSellPrices()
const initialMaterialPurchaseCities = loadMaterialPurchaseCities()

export const useMarketDataStore = create<MarketDataState>((set, get) => ({
  config: initialConfig,
  markets: initialMarkets,
  catalogStatus: 'idle',
  catalogError: null,
  catalogSource: initialMarkets.length > 0 ? 'browser-cache' : null,
  catalogWarnings: [],
  catalogLastAttempt: null,
  snapshots: initialSnapshots,
  manualSellPrices: initialSellPrices,
  materialPurchaseCitiesByRoot: initialMaterialPurchaseCities,
  status: 'idle',
  error: null,
  refreshWarnings: [],
  lastSuccessfulFetchAt: null,
  priceLastAttempt: null,
  refreshProgress: null,
  lastRefreshReport: null,

  loadMarkets: async () => {
    if (get().markets.length > 0 && get().catalogSource !== 'browser-cache') {
      return get().markets
    }

    const startedAt = new Date().toISOString()
    set({
      catalogStatus: 'loading',
      catalogError: null,
      catalogLastAttempt: createRunningAttempt(
        'catalog',
        'Cargando catálogo de mercados…',
        startedAt,
      ),
    })
    marketCatalogPromise ??= fetchMarketsWithFallback(get().markets).finally(
      () => {
        marketCatalogPromise = null
      },
    )

    try {
      const catalogResult = await marketCatalogPromise
      const markets = catalogResult.markets
      const validKeys = new Set(markets.map((market) => market.key))
      const current = get().config
      const fallback = markets[0]?.key
      const config = fallback
        ? {
            ...current,
            purchaseCity: validKeys.has(current.purchaseCity)
              ? current.purchaseCity
              : fallback,
            saleCity: validKeys.has(current.saleCity)
              ? current.saleCity
              : fallback,
          }
        : current

      const currentMaterialCities = get().materialPurchaseCitiesByRoot
      const sanitizedMaterialCities = new Map<
        string,
        ReadonlyMap<string, MarketCityId>
      >()

      for (const [rootKey, overrides] of currentMaterialCities) {
        const validOverrides = new Map(
          Array.from(overrides.entries()).filter(([, key]) =>
            validKeys.has(key),
          ),
        )
        if (validOverrides.size > 0) {
          sanitizedMaterialCities.set(rootKey, validOverrides)
        }
      }

      saveMarketConfig(config)
      saveMaterialPurchaseCities(sanitizedMaterialCities)
      if (catalogResult.source !== 'browser-cache') {
        saveMarketCatalog(markets)
      }
      set({
        markets,
        config,
        materialPurchaseCitiesByRoot: sanitizedMaterialCities,
        catalogStatus: 'success',
        catalogError: null,
        catalogSource: catalogResult.source,
        catalogWarnings: catalogResult.warnings,
        catalogLastAttempt: finishAttempt(
          'catalog',
          'success',
          startedAt,
          `Catálogo cargado desde ${MARKET_DATA_SOURCE_LABELS[catalogResult.source]}.`,
        ),
      })
      return markets
    } catch (error) {
      const message = describeMarketError(error, {
        fallback: 'No fue posible cargar el catálogo de mercados',
      })
      set({
        catalogStatus: 'error',
        catalogError: message,
        catalogSource: null,
        catalogWarnings: [],
        catalogLastAttempt: finishAttempt('catalog', 'error', startedAt, message),
      })
      throw error
    }
  },

  setConfig: (patch) => {
    const config = {
      ...get().config,
      ...patch,
    }

    saveMarketConfig(config)
    set({
      config,
      error: null,
      refreshWarnings: [],
      lastRefreshReport: null,
    })
  },

  refreshPrices: async (params) => {
    const {
      rootKey,
      materialTargets,
      saleTarget,
      force = false,
      origin = 'automatic',
      manualOverrideCount = 0,
    } = params

    if (get().markets.length === 0) {
      const startedAt = new Date().toISOString()
      try {
        await get().loadMarkets()
      } catch (error) {
        if (isMarketRequestAbort(error)) return

        const message = describeMarketError(error, {
          fallback: 'No fue posible cargar el catálogo de mercados',
        })
        set({
          status: 'error',
          refreshProgress: null,
          priceLastAttempt: finishAttempt('prices', 'error', startedAt, message),
          error: message,
        })
        return
      }
    }

    const config = get().config
    const snapshots = get().snapshots
    const markets = get().markets
    const activeTargets = buildActiveRefreshTargets(
      { ...params, rootKey, materialTargets, saleTarget },
      config,
      get().materialPurchaseCitiesByRoot,
    )
    const materialIdentifiersByCity = new Map<MarketCityId, string[]>()
    const materialIdentifiers = Array.from(
      new Set(
        materialTargets.map((target) =>
          buildMarketItemIdentifier(target.itemId, target.enchantment),
        ),
      ),
    )

    for (const market of markets) {
      const identifiersToRefresh = materialIdentifiers.filter((identifier) => {
        if (force) return true

        const cacheKey = buildMarketCacheKey(
          config.server,
          market.key,
          identifier,
          MATERIAL_MARKET_QUALITY,
        )

        return !isSnapshotFresh(snapshots.get(cacheKey))
      })

      if (identifiersToRefresh.length > 0) {
        materialIdentifiersByCity.set(market.key, identifiersToRefresh)
      }
    }

    const saleIdentifier = saleTarget
      ? buildMarketItemIdentifier(saleTarget.itemId, saleTarget.enchantment)
      : null
    const saleCitiesToRefresh = saleIdentifier
      ? markets.filter((market) => {
          if (force) return true

          return !isSnapshotFresh(
            snapshots.get(
              buildMarketCacheKey(
                config.server,
                market.key,
                saleIdentifier,
                config.quality,
              ),
            ),
          )
        })
      : []

    const plans: RefreshRequestPlan[] = []

    for (const [city, identifiers] of materialIdentifiersByCity) {
      plans.push({
        combinationCount: identifiers.length,
        execute: (signal) =>
          fetchCurrentPricesWithFallback({
            server: config.server,
            itemIdentifiers: identifiers,
            cities: [city],
            quality: MATERIAL_MARKET_QUALITY,
            signal,
          }),
      })
    }

    if (saleIdentifier) {
      for (const market of saleCitiesToRefresh) {
        plans.push({
          combinationCount: 1,
          execute: (signal) =>
            fetchCurrentPricesWithFallback({
              server: config.server,
              itemIdentifiers: [saleIdentifier],
              cities: [market.key],
              quality: config.quality,
              signal,
            }),
        })
      }
    }

    if (plans.length === 0) {
      const startedAt = new Date().toISOString()
      latestRequestId += 1
      abortActivePriceRefresh()
      set({
        status: 'success',
        error: null,
        refreshProgress: null,
        priceLastAttempt: finishAttempt(
          'prices',
          'success',
          startedAt,
          'No había precios pendientes; se mantuvieron datos vigentes.',
        ),
      })
      return
    }

    const requestId = ++latestRequestId
    abortActivePriceRefresh()
    const requestController = new AbortController()
    activePriceRefreshController = requestController
    const startedAt = new Date().toISOString()
    const totalCombinations = plans.reduce(
      (total, plan) => total + plan.combinationCount,
      0,
    )
    let completedRequests = 0
    let completedCombinations = 0

    set({
      status: 'loading',
      error: null,
      refreshWarnings: [],
      priceLastAttempt: createRunningAttempt(
        'prices',
        'Actualizando precios de mercado…',
        startedAt,
      ),
      refreshProgress: {
        origin,
        completedRequests: 0,
        totalRequests: plans.length,
        completedCombinations: 0,
        totalCombinations,
      },
    })

    const settledGroups = await Promise.all(
      plans.map(async (plan) => {
        try {
          return {
            status: 'fulfilled' as const,
            result: await plan.execute(requestController.signal),
          }
        } catch (error) {
          return { status: 'rejected' as const, error }
        } finally {
          completedRequests += 1
          completedCombinations += plan.combinationCount

          if (requestId === latestRequestId) {
            set({
              refreshProgress: {
                origin,
                completedRequests,
                totalRequests: plans.length,
                completedCombinations,
                totalCombinations,
              },
            })
          }
        }
      }),
    )

    if (requestId !== latestRequestId) return
    if (activePriceRefreshController === requestController) {
      activePriceRefreshController = null
    }

    const nextSnapshots = new Map(get().snapshots)
    const warnings: string[] = []
    let successfulPlans = 0

    for (const settled of settledGroups) {
      if (settled.status === 'rejected') {
        if (!isMarketRequestAbort(settled.error)) {
          warnings.push(
            describeMarketError(settled.error, {
              fallback: 'Una consulta de precios no pudo completarse',
            }),
          )
        }
        continue
      }

      successfulPlans += 1
      warnings.push(...settled.result.warnings)

      for (const [key, snapshot] of settled.result.snapshots) {
        nextSnapshots.set(key, snapshot)
      }
    }

    const uniqueWarnings = Array.from(new Set(warnings))

    if (successfulPlans === 0) {
      const cachedSnapshots = new Map(
        Array.from(nextSnapshots.entries()).map(([key, snapshot]) => [
          key,
          {
            ...snapshot,
            source: 'browser-cache' as const,
            sellPriceSource:
              snapshot.sellPriceMin === null
                ? null
                : ('browser-cache' as const),
            buyPriceSource:
              snapshot.buyPriceMax === null ? null : ('browser-cache' as const),
          },
        ]),
      )
      const fallbackWarnings =
        cachedSnapshots.size > 0
          ? [...uniqueWarnings, describeMarketCacheFallback('prices')]
          : uniqueWarnings
      const message =
        fallbackWarnings.join(' · ') ||
        'No fue posible consultar precios. Puedes reintentar o continuar con precios manuales.'

      saveMarketCache(cachedSnapshots)
      set({
        snapshots: cachedSnapshots,
        status: 'error',
        refreshProgress: null,
        refreshWarnings: fallbackWarnings,
        priceLastAttempt: finishAttempt('prices', 'error', startedAt, message),
        error: message,
      })
      return
    }

    const completedAt = new Date().toISOString()
    const report =
      origin === 'manual'
        ? buildRefreshReport({
            rootKey,
            activeTargets,
            beforeSnapshots: snapshots,
            afterSnapshots: nextSnapshots,
            config,
            markets,
            startedAt,
            completedAt,
            requestedCombinations: totalCombinations,
            requestCount: plans.length,
            manualOverrideCount,
          })
        : get().lastRefreshReport
    const successMessage =
      uniqueWarnings.length > 0
        ? `Actualización completada con degradación: ${uniqueWarnings.join(' · ')}`
        : `Actualización completada: ${totalCombinations} combinaciones consultadas.`

    saveMarketCache(nextSnapshots)
    set({
      snapshots: nextSnapshots,
      status: 'success',
      error: null,
      refreshWarnings: uniqueWarnings,
      refreshProgress: null,
      lastRefreshReport: report,
      lastSuccessfulFetchAt: completedAt,
      priceLastAttempt: finishAttempt(
        'prices',
        'success',
        startedAt,
        successMessage,
      ),
    })
  },

  dismissRefreshReport: () => {
    set({ lastRefreshReport: null })
  },

  clearCache: () => {
    latestRequestId += 1
    abortActivePriceRefresh()
    clearStoredMarketCache()
    set({
      snapshots: new Map(),
      status: 'idle',
      error: null,
      refreshWarnings: [],
      refreshProgress: null,
      lastRefreshReport: null,
      lastSuccessfulFetchAt: null,
      priceLastAttempt: null,
    })
  },

  setManualSellPrice: (rootKey, price) => {
    const next = new Map(get().manualSellPrices)

    if (price === null) {
      next.delete(rootKey)
    } else if (Number.isFinite(price) && price >= 0) {
      next.set(rootKey, price)
    } else {
      return
    }

    saveManualSellPrices(next)
    set({ manualSellPrices: next, lastRefreshReport: null })
  },

  setMaterialPurchaseCity: (rootKey, itemPriceKey, city) => {
    if (!rootKey || !itemPriceKey) return

    const nextByRoot = new Map(get().materialPurchaseCitiesByRoot)
    const nextForRoot = new Map(nextByRoot.get(rootKey) ?? [])

    if (city === null) {
      nextForRoot.delete(itemPriceKey)
    } else {
      nextForRoot.set(itemPriceKey, city)
    }

    if (nextForRoot.size === 0) {
      nextByRoot.delete(rootKey)
    } else {
      nextByRoot.set(rootKey, nextForRoot)
    }

    saveMaterialPurchaseCities(nextByRoot)
    set({
      materialPurchaseCitiesByRoot: nextByRoot,
      error: null,
      lastRefreshReport: null,
    })
  },

  clearMaterialPurchaseCities: (rootKey) => {
    const nextByRoot = new Map(get().materialPurchaseCitiesByRoot)
    nextByRoot.delete(rootKey)

    saveMaterialPurchaseCities(nextByRoot)
    set({
      materialPurchaseCitiesByRoot: nextByRoot,
      error: null,
      lastRefreshReport: null,
    })
  },

  applyMarketRecommendation: (rootKey, materialCities, saleCity) => {
    const nextByRoot = new Map(get().materialPurchaseCitiesByRoot)
    const nextForRoot = new Map(nextByRoot.get(rootKey) ?? [])

    for (const [itemPriceKey, city] of materialCities) {
      nextForRoot.set(itemPriceKey, city)
    }

    if (nextForRoot.size > 0) {
      nextByRoot.set(rootKey, nextForRoot)
    } else {
      nextByRoot.delete(rootKey)
    }

    const config = saleCity ? { ...get().config, saleCity } : get().config

    saveMaterialPurchaseCities(nextByRoot)
    saveMarketConfig(config)
    set({
      config,
      materialPurchaseCitiesByRoot: nextByRoot,
      error: null,
      lastRefreshReport: null,
    })
  },
}))
