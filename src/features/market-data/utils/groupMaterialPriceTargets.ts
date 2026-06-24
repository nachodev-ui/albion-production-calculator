import type {
  MarketCityId,
  MarketPriceTarget,
  MaterialPurchaseCityOverrides,
} from '../types/MarketPrice'
import {
  buildItemPriceKey,
  buildMarketItemIdentifier,
  resolveMaterialPurchaseCity,
} from '../types/MarketPrice'

export interface MaterialPriceTargetGroup {
  readonly city: MarketCityId
  readonly itemIdentifiers: readonly string[]
}

export function groupMaterialPriceTargetsByCity(
  targets: readonly MarketPriceTarget[],
  overrides: MaterialPurchaseCityOverrides | undefined,
  defaultCity: MarketCityId,
): readonly MaterialPriceTargetGroup[] {
  const identifiersByCity = new Map<MarketCityId, Set<string>>()

  for (const target of targets) {
    const itemPriceKey = buildItemPriceKey(
      target.itemId,
      target.enchantment,
    )
    const city = resolveMaterialPurchaseCity(
      overrides,
      itemPriceKey,
      defaultCity,
    )
    const identifiers = identifiersByCity.get(city) ?? new Set<string>()

    identifiers.add(
      buildMarketItemIdentifier(target.itemId, target.enchantment),
    )
    identifiersByCity.set(city, identifiers)
  }

  return Array.from(identifiersByCity.entries()).map(
    ([city, identifiers]) => ({
      city,
      itemIdentifiers: Array.from(identifiers),
    }),
  )
}
