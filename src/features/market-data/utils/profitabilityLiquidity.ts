import type { MarketHistorySnapshot } from '../types/MarketHistory'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type {
  AlbionServer,
  MarketCityId,
  MarketPriceTarget,
  MaterialMarketPriceComparisons,
  PurchaseStrategy,
  SaleMarketPriceOption,
  SaleStrategy,
} from '../types/MarketPrice'
import {
  MATERIAL_MARKET_QUALITY,
  buildItemPriceKey,
  buildMarketItemIdentifier,
} from '../types/MarketPrice'
import type { MarketLiquidityAssessment } from './marketLiquidity'
import { assessMarketLiquidity } from './marketLiquidity'

export type MaterialLiquidityAssessments = ReadonlyMap<
  string,
  ReadonlyMap<MarketCityId, MarketLiquidityAssessment>
>

export type SaleLiquidityAssessments = ReadonlyMap<
  MarketCityId,
  MarketLiquidityAssessment
>

interface BuildMaterialLiquidityAssessmentsParams {
  readonly targets: readonly MarketPriceTarget[]
  readonly comparisons: MaterialMarketPriceComparisons
  readonly requiredQuantities: ReadonlyMap<string, number>
  readonly snapshots: ReadonlyMap<string, MarketHistorySnapshot>
  readonly server: AlbionServer
  readonly strategy: PurchaseStrategy
}

export function buildMaterialLiquidityAssessments({
  targets,
  comparisons,
  requiredQuantities,
  snapshots,
  server,
  strategy,
}: BuildMaterialLiquidityAssessmentsParams): MaterialLiquidityAssessments {
  const result = new Map<
    string,
    ReadonlyMap<MarketCityId, MarketLiquidityAssessment>
  >()

  for (const target of targets) {
    const itemPriceKey = buildItemPriceKey(target.itemId, target.enchantment)
    if (result.has(itemPriceKey)) continue

    const itemIdentifier = buildMarketItemIdentifier(
      target.itemId,
      target.enchantment,
    )
    const assessments = new Map<MarketCityId, MarketLiquidityAssessment>()

    for (const option of comparisons.get(itemPriceKey) ?? []) {
      const snapshot = snapshots.get(
        buildMarketHistoryCacheKey(
          server,
          option.city,
          itemIdentifier,
          MATERIAL_MARKET_QUALITY,
        ),
      )

      assessments.set(
        option.city,
        assessMarketLiquidity({
          city: option.city,
          side: 'purchase',
          strategy,
          currentPrice: option.value,
          freshness: option.freshness,
          requiredQuantity: requiredQuantities.get(itemPriceKey) ?? 1,
          snapshot,
        }),
      )
    }

    result.set(itemPriceKey, assessments)
  }

  return result
}

interface BuildSaleLiquidityAssessmentsParams {
  readonly target: MarketPriceTarget | null
  readonly options: readonly SaleMarketPriceOption[]
  readonly requiredQuantity: number
  readonly snapshots: ReadonlyMap<string, MarketHistorySnapshot>
  readonly server: AlbionServer
  readonly quality: number
  readonly strategy: SaleStrategy
}

export function buildSaleLiquidityAssessments({
  target,
  options,
  requiredQuantity,
  snapshots,
  server,
  quality,
  strategy,
}: BuildSaleLiquidityAssessmentsParams): SaleLiquidityAssessments {
  const result = new Map<MarketCityId, MarketLiquidityAssessment>()
  if (!target) return result

  const itemIdentifier = buildMarketItemIdentifier(
    target.itemId,
    target.enchantment,
  )

  for (const option of options) {
    const snapshot = snapshots.get(
      buildMarketHistoryCacheKey(
        server,
        option.city,
        itemIdentifier,
        quality,
      ),
    )

    result.set(
      option.city,
      assessMarketLiquidity({
        city: option.city,
        side: 'sale',
        strategy,
        currentPrice: option.value,
        freshness: option.freshness,
        requiredQuantity,
        snapshot,
      }),
    )
  }

  return result
}
