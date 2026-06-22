import { useCallback, useEffect, useMemo } from 'react'
import type { MarketPriceTarget } from '../types/MarketPrice'
import {
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  resolvePurchasePrice,
  resolveSalePrice,
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

  const automaticPurchasePrices = useMemo(() => {
    const prices = new Map<string, number>()

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
      const price = resolvePurchasePrice(
        snapshot,
        config.purchaseStrategy,
      )

      if (price !== null) {
        prices.set(
          buildItemPriceKey(target.itemId, target.enchantment),
          price,
        )
      }
    }

    return prices
  }, [
    config.purchaseCity,
    config.purchaseStrategy,
    config.quality,
    config.server,
    materialTargets,
    snapshots,
  ])

  const saleSnapshot = useMemo(() => {
    if (!saleTarget) return null

    const itemIdentifier = buildMarketItemIdentifier(
      saleTarget.itemId,
      saleTarget.enchantment,
    )

    return (
      snapshots.get(
        buildMarketCacheKey(
          config.server,
          config.saleCity,
          itemIdentifier,
          config.quality,
        ),
      ) ?? null
    )
  }, [
    config.quality,
    config.saleCity,
    config.server,
    saleTarget,
    snapshots,
  ])

  const automaticSalePrice = resolveSalePrice(
    saleSnapshot,
    config.saleStrategy,
  )

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
    automaticSalePrice,
    purchasePriceLabel: PURCHASE_STRATEGY_LABELS[config.purchaseStrategy],
    salePriceLabel: SALE_STRATEGY_LABELS[config.saleStrategy],
    hasAnyCachedPrice:
      automaticPurchasePrices.size > 0 || automaticSalePrice !== null,
  }
}
