import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  MarketCityId,
  MarketFreshnessSummary,
  MarketPriceTarget,
  MaterialMarketPriceComparisons,
  MaterialPurchaseCityOverrides,
} from '../types/MarketPrice'
import {
  MATERIAL_MARKET_QUALITY,
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  resolveMaterialPurchaseCity,
  resolvePurchasePriceDetail,
  resolveSalePriceDetail,
} from '../types/MarketPrice'
import { useMarketDataStore } from '../store/marketDataStore'
import { buildMaterialMarketPriceOptions } from '../utils/materialMarketPriceComparison'
import { buildSaleMarketPriceOptions } from '../utils/saleMarketPriceComparison'
import type { MarketRefreshItemReport } from '../types/MarketRefresh'

interface UseCurrentMarketPricesParams {
  readonly rootKey: string
  readonly materialTargets: readonly MarketPriceTarget[]
  readonly reportMaterialTargets?: readonly MarketPriceTarget[]
  readonly saleTarget: MarketPriceTarget | null
  readonly targetLabels?: ReadonlyMap<string, string>
  readonly manualOverrideCount?: number
}

const EMPTY_TARGET_LABELS: ReadonlyMap<string, string> = new Map()
const EMPTY_MATERIAL_CITY_OVERRIDES: MaterialPurchaseCityOverrides = new Map()

export function useCurrentMarketPrices({
  rootKey,
  materialTargets,
  reportMaterialTargets = materialTargets,
  saleTarget,
  targetLabels = EMPTY_TARGET_LABELS,
  manualOverrideCount = 0,
}: UseCurrentMarketPricesParams) {
  const config = useMarketDataStore((state) => state.config)
  const markets = useMarketDataStore((state) => state.markets)
  const catalogStatus = useMarketDataStore((state) => state.catalogStatus)
  const catalogError = useMarketDataStore((state) => state.catalogError)
  const loadMarkets = useMarketDataStore((state) => state.loadMarkets)
  const snapshots = useMarketDataStore((state) => state.snapshots)
  const status = useMarketDataStore((state) => state.status)
  const error = useMarketDataStore((state) => state.error)
  const setConfig = useMarketDataStore((state) => state.setConfig)
  const refreshPrices = useMarketDataStore((state) => state.refreshPrices)
  const clearCache = useMarketDataStore((state) => state.clearCache)
  const refreshProgress = useMarketDataStore((state) => state.refreshProgress)
  const lastRefreshReport = useMarketDataStore(
    (state) => state.lastRefreshReport,
  )
  const dismissRefreshReport = useMarketDataStore(
    (state) => state.dismissRefreshReport,
  )
  const setMaterialPurchaseCityInStore = useMarketDataStore(
    (state) => state.setMaterialPurchaseCity,
  )
  const clearMaterialPurchaseCitiesInStore = useMarketDataStore(
    (state) => state.clearMaterialPurchaseCities,
  )
  const applyMarketRecommendationInStore = useMarketDataStore(
    (state) => state.applyMarketRecommendation,
  )
  const materialPurchaseCityOverrides = useMarketDataStore(
    (state) =>
      state.materialPurchaseCitiesByRoot.get(rootKey) ??
      EMPTY_MATERIAL_CITY_OVERRIDES,
  )
  const [now, setNow] = useState(() => Date.now())
  const previousManualOverrideCount = useRef(manualOverrideCount)

  useEffect(() => {
    void loadMarkets().catch(() => undefined)
  }, [loadMarkets])

  useEffect(() => {
    if (previousManualOverrideCount.current === manualOverrideCount) return

    previousManualOverrideCount.current = manualOverrideCount
    dismissRefreshReport()
  }, [dismissRefreshReport, manualOverrideCount])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 60 * 1000)

    return () => window.clearInterval(interval)
  }, [])

  const targetSignature = useMemo(() => {
    const identifiers = materialTargets.map((target) =>
      buildMarketItemIdentifier(target.itemId, target.enchantment),
    )

    if (saleTarget) {
      identifiers.push(
        buildMarketItemIdentifier(
          saleTarget.itemId,
          saleTarget.enchantment,
        ),
      )
    }

    return Array.from(new Set(identifiers)).sort().join(',')
  }, [materialTargets, saleTarget])

  const resolvedMaterialPurchaseCities = useMemo(() => {
    const cities = new Map<string, MarketCityId>()

    for (const target of materialTargets) {
      const itemPriceKey = buildItemPriceKey(
        target.itemId,
        target.enchantment,
      )

      cities.set(
        itemPriceKey,
        resolveMaterialPurchaseCity(
          materialPurchaseCityOverrides,
          itemPriceKey,
          config.purchaseCity,
        ),
      )
    }

    return cities
  }, [
    config.purchaseCity,
    materialPurchaseCityOverrides,
    materialTargets,
  ])

  const materialCitySignature = useMemo(
    () =>
      Array.from(resolvedMaterialPurchaseCities.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([itemPriceKey, city]) => `${itemPriceKey}:${city}`)
        .join(','),
    [resolvedMaterialPurchaseCities],
  )

  useEffect(() => {
    void refreshPrices({
      rootKey,
      materialTargets,
      saleTarget,
      origin: 'automatic',
    })
  }, [
    config.quality,
    config.saleCity,
    config.server,
    materialCitySignature,
    materialTargets,
    refreshPrices,
    rootKey,
    saleTarget,
    targetSignature,
  ])

  const automaticPurchasePriceDetails = useMemo(() => {
    const details = new Map<
      string,
      ReturnType<typeof resolvePurchasePriceDetail>
    >()

    for (const target of materialTargets) {
      const itemPriceKey = buildItemPriceKey(
        target.itemId,
        target.enchantment,
      )
      const itemIdentifier = buildMarketItemIdentifier(
        target.itemId,
        target.enchantment,
      )
      const city =
        resolvedMaterialPurchaseCities.get(itemPriceKey) ??
        config.purchaseCity
      const snapshot = snapshots.get(
        buildMarketCacheKey(
          config.server,
          city,
          itemIdentifier,
          MATERIAL_MARKET_QUALITY,
        ),
      )

      details.set(
        itemPriceKey,
        resolvePurchasePriceDetail(
          snapshot,
          config.purchaseStrategy,
          now,
        ),
      )
    }

    return details
  }, [
    config.purchaseCity,
    config.purchaseStrategy,
    config.server,
    materialTargets,
    now,
    resolvedMaterialPurchaseCities,
    snapshots,
  ])

  const automaticPurchasePrices = useMemo(() => {
    const prices = new Map<string, number>()

    for (const [key, detail] of automaticPurchasePriceDetails) {
      if (detail.value !== null) {
        prices.set(key, detail.value)
      }
    }

    return prices
  }, [automaticPurchasePriceDetails])

  const materialMarketPriceComparisons =
    useMemo<MaterialMarketPriceComparisons>(() => {
      const comparisons = new Map<
        string,
        ReturnType<typeof buildMaterialMarketPriceOptions>
      >()

      for (const target of materialTargets) {
        const itemPriceKey = buildItemPriceKey(
          target.itemId,
          target.enchantment,
        )

        if (comparisons.has(itemPriceKey)) continue

        comparisons.set(
          itemPriceKey,
          buildMaterialMarketPriceOptions({
            markets,
            snapshots,
            server: config.server,
            itemIdentifier: buildMarketItemIdentifier(
              target.itemId,
              target.enchantment,
            ),
            purchaseStrategy: config.purchaseStrategy,
            now,
          }),
        )
      }

      return comparisons
    }, [
      config.purchaseStrategy,
      config.server,
      markets,
      materialTargets,
      now,
      snapshots,
    ])

  const automaticSalePriceDetail = useMemo(() => {
    if (!saleTarget) {
      return resolveSalePriceDetail(null, config.saleStrategy, now)
    }

    const itemIdentifier = buildMarketItemIdentifier(
      saleTarget.itemId,
      saleTarget.enchantment,
    )
    const snapshot = snapshots.get(
      buildMarketCacheKey(
        config.server,
        config.saleCity,
        itemIdentifier,
        config.quality,
      ),
    )

    return resolveSalePriceDetail(snapshot, config.saleStrategy, now)
  }, [
    config.quality,
    config.saleCity,
    config.saleStrategy,
    config.server,
    now,
    saleTarget,
    snapshots,
  ])

  const automaticSalePrice = automaticSalePriceDetail.value

  const saleMarketPriceOptions = useMemo(() => {
    if (!saleTarget) return []

    return buildSaleMarketPriceOptions({
      markets,
      snapshots,
      server: config.server,
      itemIdentifier: buildMarketItemIdentifier(
        saleTarget.itemId,
        saleTarget.enchantment,
      ),
      quality: config.quality,
      saleStrategy: config.saleStrategy,
      now,
    })
  }, [
    config.quality,
    config.saleStrategy,
    config.server,
    markets,
    now,
    saleTarget,
    snapshots,
  ])

  const freshnessSummary = useMemo<MarketFreshnessSummary>(() => {
    const summary = {
      recent: 0,
      acceptable: 0,
      stale: 0,
      missing: 0,
    }

    for (const detail of automaticPurchasePriceDetails.values()) {
      summary[detail.freshness] += 1
    }

    if (saleTarget) {
      summary[automaticSalePriceDetail.freshness] += 1
    }

    return summary
  }, [
    automaticPurchasePriceDetails,
    automaticSalePriceDetail.freshness,
    saleTarget,
  ])

  const refresh = useCallback(
    () =>
      refreshPrices({
        rootKey,
        materialTargets,
        reportMaterialTargets,
        saleTarget,
        force: true,
        origin: 'manual',
        targetLabels,
        manualOverrideCount,
      }),
    [
      manualOverrideCount,
      materialTargets,
      reportMaterialTargets,
      refreshPrices,
      rootKey,
      saleTarget,
      targetLabels,
    ],
  )

  const scopedRefreshReport = useMemo(
    () =>
      lastRefreshReport?.rootKey === rootKey
        ? lastRefreshReport
        : null,
    [lastRefreshReport, rootKey],
  )

  const materialRefreshResults = useMemo(() => {
    const results = new Map<string, MarketRefreshItemReport>()

    for (const item of scopedRefreshReport?.items ?? []) {
      const selectedCity = resolvedMaterialPurchaseCities.get(item.targetKey)

      if (
        item.kind === 'material' &&
        item.city === selectedCity &&
        item.strategy === config.purchaseStrategy
      ) {
        results.set(item.targetKey, item)
      }
    }

    return results
  }, [
    config.purchaseStrategy,
    resolvedMaterialPurchaseCities,
    scopedRefreshReport,
  ])

  const saleRefreshResult = useMemo(
    () =>
      scopedRefreshReport?.items.find(
        (item) =>
          item.kind === 'sale' &&
          item.city === config.saleCity &&
          item.quality === config.quality &&
          item.strategy === config.saleStrategy,
      ) ?? null,
    [
      config.quality,
      config.saleCity,
      config.saleStrategy,
      scopedRefreshReport,
    ],
  )

  const setMaterialPurchaseCity = useCallback(
    (itemPriceKey: string, city: MarketCityId | null) => {
      setMaterialPurchaseCityInStore(rootKey, itemPriceKey, city)
    },
    [rootKey, setMaterialPurchaseCityInStore],
  )

  const clearMaterialPurchaseCities = useCallback(() => {
    clearMaterialPurchaseCitiesInStore(rootKey)
  }, [clearMaterialPurchaseCitiesInStore, rootKey])

  const applyMarketRecommendation = useCallback(
    (
      materialCities: ReadonlyMap<string, MarketCityId>,
      saleCity: MarketCityId | null,
    ) => {
      applyMarketRecommendationInStore(rootKey, materialCities, saleCity)
    },
    [applyMarketRecommendationInStore, rootKey],
  )

  return {
    config,
    markets,
    catalogStatus,
    catalogError,
    status,
    error,
    setConfig,
    clearCache,
    refresh,
    refreshProgress,
    refreshReport: scopedRefreshReport,
    dismissRefreshReport,
    materialRefreshResults,
    saleRefreshResult,
    automaticPurchasePrices,
    automaticPurchasePriceDetails,
    materialMarketPriceComparisons,
    automaticSalePrice,
    automaticSalePriceDetail,
    saleMarketPriceOptions,
    freshnessSummary,
    materialPurchaseCityOverrides,
    resolvedMaterialPurchaseCities,
    materialCityOverrideCount: materialPurchaseCityOverrides.size,
    setMaterialPurchaseCity,
    clearMaterialPurchaseCities,
    applyMarketRecommendation,
    purchasePriceLabel: PURCHASE_STRATEGY_LABELS[config.purchaseStrategy],
    salePriceLabel: SALE_STRATEGY_LABELS[config.saleStrategy],
    hasAnyCachedPrice:
      automaticPurchasePrices.size > 0 || automaticSalePrice !== null,
  }
}
