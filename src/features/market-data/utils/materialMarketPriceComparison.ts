import type {
  AlbionServer,
  MarketDefinition,
  MarketPriceSnapshot,
  MaterialMarketPriceOption,
  PurchaseStrategy,
} from '../types/MarketPrice'
import {
  MATERIAL_MARKET_QUALITY,
  buildMarketCacheKey,
  resolvePurchasePriceDetail,
} from '../types/MarketPrice'

interface BuildMaterialMarketPriceOptionsParams {
  readonly markets: readonly MarketDefinition[]
  readonly snapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly purchaseStrategy: PurchaseStrategy
  readonly now?: number
}

export function buildMaterialMarketPriceOptions({
  markets,
  snapshots,
  server,
  itemIdentifier,
  purchaseStrategy,
  now = Date.now(),
}: BuildMaterialMarketPriceOptionsParams): readonly MaterialMarketPriceOption[] {
  const options = markets.map((market) => {
    const snapshot = snapshots.get(
      buildMarketCacheKey(
        server,
        market.key,
        itemIdentifier,
        MATERIAL_MARKET_QUALITY,
      ),
    )
    const detail = resolvePurchasePriceDetail(
      snapshot,
      purchaseStrategy,
      now,
    )

    return {
      city: market.key,
      value: detail.value,
      updatedAt: detail.updatedAt,
      freshness: detail.freshness,
      badge: null,
    } satisfies MaterialMarketPriceOption
  })

  const availableValues = options.flatMap((option) =>
    option.value === null ? [] : [option.value],
  )

  if (availableValues.length === 0) return options

  const minimum = Math.min(...availableValues)
  const maximum = Math.max(...availableValues)
  const allEqual = minimum === maximum

  return options.map((option) => {
    if (option.value === null) return option

    if (availableValues.length === 1) {
      return { ...option, badge: 'only' }
    }

    if (allEqual) {
      return { ...option, badge: 'same' }
    }

    if (option.value === minimum) {
      return { ...option, badge: 'best' }
    }

    if (option.value === maximum) {
      return { ...option, badge: 'highest' }
    }

    return option
  })
}
