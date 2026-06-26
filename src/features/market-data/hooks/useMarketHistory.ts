import { useCallback, useEffect, useMemo } from 'react'
import { useMarketHistoryStore } from '../store/marketHistoryStore'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type { MarketConfig, MarketPriceTarget } from '../types/MarketPrice'
import { buildMarketItemIdentifier } from '../types/MarketPrice'

interface UseMarketHistoryParams {
  readonly saleTarget: MarketPriceTarget | null
  readonly config: MarketConfig
}

export function useMarketHistory({
  saleTarget,
  config,
}: UseMarketHistoryParams) {
  const snapshots = useMarketHistoryStore((state) => state.snapshots)
  const status = useMarketHistoryStore((state) => state.status)
  const error = useMarketHistoryStore((state) => state.error)
  const warnings = useMarketHistoryStore((state) => state.warnings)
  const refreshHistory = useMarketHistoryStore(
    (state) => state.refreshHistory,
  )
  const clearCache = useMarketHistoryStore((state) => state.clearCache)

  const itemIdentifier = useMemo(
    () =>
      saleTarget
        ? buildMarketItemIdentifier(
            saleTarget.itemId,
            saleTarget.enchantment,
          )
        : null,
    [saleTarget],
  )

  const cacheKey = useMemo(
    () =>
      itemIdentifier
        ? buildMarketHistoryCacheKey(
            config.server,
            config.saleCity,
            itemIdentifier,
            config.quality,
          )
        : null,
    [config.quality, config.saleCity, config.server, itemIdentifier],
  )

  useEffect(() => {
    void refreshHistory({ target: saleTarget, config })
  }, [config, refreshHistory, saleTarget])

  const refresh = useCallback(
    () => refreshHistory({ target: saleTarget, config, force: true }),
    [config, refreshHistory, saleTarget],
  )

  return {
    snapshot: cacheKey ? snapshots.get(cacheKey) ?? null : null,
    status,
    error,
    warnings,
    refresh,
    clearCache,
    hasCachedHistory: cacheKey ? snapshots.has(cacheKey) : false,
  }
}
