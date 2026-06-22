import type { CraftCostNode } from '@core/domain/entities/CraftCostNode'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { RecipeTier } from '@core/domain/entities/Recipe'
import { getRecipeOptions } from '@core/domain/entities/Recipe'
import type { MarketPriceTarget } from '../types/MarketPrice'
import { buildItemPriceKey } from '../types/MarketPrice'

function addTarget(
  targets: Map<string, MarketPriceTarget>,
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
): void {
  targets.set(buildItemPriceKey(itemId, enchantment), {
    itemId,
    enchantment,
  })
}

function collectTreeLeaves(
  node: CraftCostNode,
  targets: Map<string, MarketPriceTarget>,
): void {
  if (node.children.length === 0) {
    addTarget(targets, node.itemId, node.enchantment)
    return
  }

  for (const child of node.children) {
    collectTreeLeaves(child, targets)
  }
}

/**
 * Reúne las hojas visibles del árbol y los ingredientes directos de todas
 * las variantes de la receta raíz. Esto permite precargar también las tres
 * opciones de equipo Real antes de que el usuario cambie de variante.
 */
export function collectMarketPriceTargets(
  rootNode: CraftCostNode,
  rootTier: RecipeTier | null,
): readonly MarketPriceTarget[] {
  const targets = new Map<string, MarketPriceTarget>()

  for (const child of rootNode.children) {
    collectTreeLeaves(child, targets)
  }

  if (rootTier) {
    for (const option of getRecipeOptions(rootTier)) {
      for (const ingredient of option.ingredients) {
        addTarget(
          targets,
          ingredient.itemId,
          ingredient.enchantment,
        )
      }
    }
  }

  return Array.from(targets.values())
}
