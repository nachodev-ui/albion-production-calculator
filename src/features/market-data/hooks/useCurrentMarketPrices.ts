import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  MarketFreshnessSummary,
  MarketPriceTarget,
} from '../types/MarketPrice'
import {
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  resolvePurchasePriceDetail,
  resolveSalePriceDetail,
} from '../types/MarketPrice'
import { useMarketDataStore } from '../store/marketDataStore'

interface UseCurrentMarketPricesParams {
  readonly materialTargets: readonly MarketPriceTarget[]
  readonly saleTarget: MarketPriceTarget | null
}

export function useCurrentMarketPrices({
  materialTargets,
  saleTarget,
}: UseCurrentMarketPricesParams) {
  const config = useMarketDataStore((state) => state.config)
  const snapshots = useMarketDataStore((state) => state.snapshots)
  const status = useMarketDataStore((state) => state.status)
  const error = useMarketDataStore((state) => state.error)
  const setConfig = useMarketDataStore((state) => state.setConfig)
  const refreshPrices = useMarketDataStore((state) => state.refreshPrices)
  const clearCache = useMarketDataStore((state) => state.clearCache)
  const [now, setNow] = useState(() => Date.now())

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

  useEffect(() => {
    void refreshPrices({ materialTargets, saleTarget })
  }, [
    config.server,
    config.purchaseCity,
    config.saleCity,
    config.quality,
    targetSignature,
    materialTargets,
    refreshPrices,
    saleTarget,
  ])

  const automaticPurchasePriceDetails = useMemo(() => {
    const details = new Map<
      string,
      ReturnType<typeof resolvePurchasePriceDetail>
    >()

    for (const target of materialTargets) {
      const itemIdentifier = buildMarketItemIdentifier(
        target.itemId,
        target.enchantment,
      )
      const snapshot = snapshots.get(
        buildMarketCacheKey(
          config.server,
          config.purchaseCity,
          itemIdentifier,
          config.quality,
        ),
      )

      details.set(
        buildItemPriceKey(target.itemId, target.enchantment),
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
    config.quality,
    config.server,
    materialTargets,
    now,
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
    () => refreshPrices({ materialTargets, saleTarget, force: true }),
    [materialTargets, refreshPrices, saleTarget],
  )

  return {
    config,
    status,
    error,
    setConfig,
    clearCache,
    refresh,
    automaticPurchasePrices,
    automaticPurchasePriceDetails,
    automaticSalePrice,
    automaticSalePriceDetail,
    freshnessSummary,
    purchasePriceLabel: PURCHASE_STRATEGY_LABELS[config.purchaseStrategy],
    salePriceLabel: SALE_STRATEGY_LABELS[config.saleStrategy],
    hasAnyCachedPrice:
      automaticPurchasePrices.size > 0 || automaticSalePrice !== null,
  }
}
