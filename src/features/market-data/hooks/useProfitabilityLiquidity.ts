import { useCallback, useEffect, useMemo } from 'react'
import { useMarketHistoryStore } from '../store/marketHistoryStore'
import type { MarketHistoryCandidate } from '../types/MarketHistory'
import type {
  MarketConfig,
  MarketDefinition,
  MarketPriceTarget,
  MaterialMarketPriceComparisons,
  SaleMarketPriceOption,
} from '../types/MarketPrice'
import {
  MATERIAL_MARKET_QUALITY,
  buildItemPriceKey,
  buildMarketItemIdentifier,
  isUsableMarket,
} from '../types/MarketPrice'

interface UseProfitabilityLiquidityParams {
  readonly materialTargets: readonly MarketPriceTarget[]
  readonly materialComparisons: MaterialMarketPriceComparisons
  readonly saleTarget: MarketPriceTarget | null
  readonly saleOptions: readonly SaleMarketPriceOption[]
  readonly markets: readonly MarketDefinition[]
  readonly config: MarketConfig
}

export function useProfitabilityLiquidity({
  materialTargets,
  materialComparisons,
  saleTarget,
  saleOptions,
  markets,
  config,
}: UseProfitabilityLiquidityParams) {
  const snapshots = useMarketHistoryStore((state) => state.snapshots)
  const status = useMarketHistoryStore((state) => state.optimizerStatus)
  const error = useMarketHistoryStore((state) => state.optimizerError)
  const warnings = useMarketHistoryStore((state) => state.optimizerWarnings)
  const progress = useMarketHistoryStore((state) => state.optimizerProgress)
  const refreshCandidates = useMarketHistoryStore(
    (state) => state.refreshCandidates,
  )

  const usableCities = useMemo(
    () =>
      new Set(
        markets.filter(isUsableMarket).map((market) => market.key),
      ),
    [markets],
  )

  const candidates = useMemo<readonly MarketHistoryCandidate[]>(() => {
    const result = new Map<string, MarketHistoryCandidate>()

    for (const target of materialTargets) {
      const itemPriceKey = buildItemPriceKey(target.itemId, target.enchantment)
      const itemIdentifier = buildMarketItemIdentifier(
        target.itemId,
        target.enchantment,
      )

      for (const option of materialComparisons.get(itemPriceKey) ?? []) {
        if (
          option.value === null ||
          option.value <= 0 ||
          !usableCities.has(option.city)
        ) {
          continue
        }

        const candidate: MarketHistoryCandidate = {
          server: config.server,
          itemIdentifier,
          city: option.city,
          quality: MATERIAL_MARKET_QUALITY,
        }
        result.set(
          `${candidate.server}|${candidate.city}|${candidate.itemIdentifier}|${candidate.quality}`,
          candidate,
        )
      }
    }

    if (saleTarget) {
      const itemIdentifier = buildMarketItemIdentifier(
        saleTarget.itemId,
        saleTarget.enchantment,
      )

      for (const option of saleOptions) {
        if (
          option.value === null ||
          option.value <= 0 ||
          !usableCities.has(option.city)
        ) {
          continue
        }

        const candidate: MarketHistoryCandidate = {
          server: config.server,
          itemIdentifier,
          city: option.city,
          quality: config.quality,
        }
        result.set(
          `${candidate.server}|${candidate.city}|${candidate.itemIdentifier}|${candidate.quality}`,
          candidate,
        )
      }
    }

    return Array.from(result.values())
  }, [
    config.quality,
    config.server,
    materialComparisons,
    materialTargets,
    saleOptions,
    saleTarget,
    usableCities,
  ])

  useEffect(() => {
    void refreshCandidates({ candidates })
  }, [candidates, refreshCandidates])

  const refresh = useCallback(
    () => refreshCandidates({ candidates, force: true }),
    [candidates, refreshCandidates],
  )

  return {
    snapshots,
    status,
    error,
    warnings,
    progress,
    refresh,
    candidateCount: candidates.length,
  }
}
