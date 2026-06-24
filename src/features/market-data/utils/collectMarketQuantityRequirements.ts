import type { CraftCostNode } from '@core/domain/entities/CraftCostNode'
import { isReturnEligibleIngredient } from '@core/domain/entities/ResourceReturnEligibility'
import { getRecipeOption, getRecipeTier } from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { buildItemPriceKey } from '../types/MarketPrice'

/**
 * Agrega la cantidad económica efectiva de cada hoja comprada en el mercado.
 *
 * La cantidad incorpora la escala del lote, las salidas por tirada y el RRR
 * de cada etapa. No representa el inventario inicial exacto necesario para
 * encadenar crafteos, sino la cantidad neta que explica el costo calculado.
 */
export function collectMarketQuantityRequirements(
  root: CraftCostNode,
  repository: ItemRepository,
): ReadonlyMap<string, number> {
  const requirements = new Map<string, number>()

  function visit(node: CraftCostNode, externalMultiplier: number): void {
    if (node.children.length === 0) {
      const key = buildItemPriceKey(node.itemId, node.enchantment)
      const quantity = Math.max(0, node.quantity * externalMultiplier)
      requirements.set(key, (requirements.get(key) ?? 0) + quantity)
      return
    }

    const parentItem = repository.getById(node.itemId)
    const tier = parentItem?.recipe
      ? getRecipeTier(parentItem.recipe, node.enchantment)
      : null
    const option = tier
      ? getRecipeOption(tier, node.recipeOptionIndex ?? 0)
      : null

    if (!parentItem || !option || option.outputQuantity <= 0) {
      for (const child of node.children) {
        visit(child, externalMultiplier)
      }
      return
    }

    const craftsNeeded = node.quantity / option.outputQuantity

    for (const child of node.children) {
      const childItem = repository.getById(child.itemId)
      const receivesReturn =
        childItem !== null &&
        childItem !== undefined &&
        isReturnEligibleIngredient(parentItem, childItem)
      const returnMultiplier = receivesReturn
        ? Math.max(0, 1 - (node.returnRate?.returnRate ?? 0))
        : 1

      visit(
        child,
        externalMultiplier * craftsNeeded * returnMultiplier,
      )
    }
  }

  visit(root, 1)
  return requirements
}
