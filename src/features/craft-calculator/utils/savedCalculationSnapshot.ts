import type { CraftCostNode } from '@core/domain/entities/CraftCostNode'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import type { MarketQuality } from '@features/market-data/types/MarketPrice'
import type { CalculationSummarySnapshot } from './calculationSummary'

export interface UsedMaterialPrice {
  readonly name: string
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  readonly unitPrice: number
  readonly totalCost: number
  readonly source: 'manual' | 'automatic'
}

export interface SavedCalculationSnapshot extends CalculationSummarySnapshot {
  readonly quality?: MarketQuality
  readonly usedPrices?: readonly UsedMaterialPrice[]
}

export function collectUsedMaterialPrices(
  root: CraftCostNode,
  repository: ItemRepository,
): readonly UsedMaterialPrice[] {
  const prices = new Map<string, UsedMaterialPrice>()

  function visit(node: CraftCostNode) {
    if (node.children.length > 0) {
      node.children.forEach(visit)
      return
    }
    if (!node.priceSource || !node.hasValidPrice) return

    const key = `${node.itemId}@${node.enchantment}@${node.unitCost}@${node.priceSource}`
    const current = prices.get(key)
    const quantity = (current?.quantity ?? 0) + node.quantity
    const totalCost = (current?.totalCost ?? 0) + node.totalCost
    prices.set(key, {
      name: repository.getById(node.itemId)?.name ?? String(node.itemId),
      enchantment: node.enchantment,
      quantity,
      unitPrice: node.unitCost,
      totalCost,
      source: node.priceSource,
    })
  }

  visit(root)
  return [...prices.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'es'),
  )
}
