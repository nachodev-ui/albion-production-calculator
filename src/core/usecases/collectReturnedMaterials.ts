import { getRecipeTier } from '../domain/entities/Recipe'
import { isReturnEligibleIngredient } from '../domain/entities/ResourceReturnEligibility'
import type {
  CraftCostNode,
  ReturnedMaterial,
} from '../domain/entities/CraftCostNode'
import type { ItemRepository } from '../domain/repositories/ItemRepository'

interface MutableReturnedMaterial {
  itemId: ReturnedMaterial['itemId']
  enchantment: ReturnedMaterial['enchantment']
  grossQuantity: number
  returnedQuantity: number
  netQuantity: number
  silverValue: number
}

function materialKey(
  itemId: ReturnedMaterial['itemId'],
  enchantment: ReturnedMaterial['enchantment'],
): string {
  return `${itemId}@${enchantment}`
}

/**
 * Recorre el árbol ya calculado y obtiene las cantidades concretas
 * recuperadas en cada etapa de producción. Solo agrega ingredientes
 * retornables; los artefactos y componentes especiales quedan fuera.
 *
 * `RecipeTree` conserva en cada hijo la cantidad necesaria para UNA
 * tirada del padre. Por eso el recorrido propaga un multiplicador con
 * la cantidad real de tiradas causadas por las etapas superiores.
 */
export function collectReturnedMaterials(
  root: CraftCostNode,
  repository: ItemRepository,
): readonly ReturnedMaterial[] {
  const aggregated = new Map<string, MutableReturnedMaterial>()

  function addMaterial(
    child: CraftCostNode,
    grossQuantity: number,
    returnRate: number,
  ): void {
    const returnedQuantity = grossQuantity * returnRate

    if (returnedQuantity <= 0) return

    const netQuantity = grossQuantity - returnedQuantity
    const silverValue = returnedQuantity * child.unitCost
    const key = materialKey(child.itemId, child.enchantment)
    const current = aggregated.get(key)

    if (current) {
      current.grossQuantity += grossQuantity
      current.returnedQuantity += returnedQuantity
      current.netQuantity += netQuantity
      current.silverValue += silverValue
      return
    }

    aggregated.set(key, {
      itemId: child.itemId,
      enchantment: child.enchantment,
      grossQuantity,
      returnedQuantity,
      netQuantity,
      silverValue,
    })
  }

  function visit(node: CraftCostNode, occurrenceMultiplier: number): void {
    if (!node.returnRate || node.children.length === 0) return

    const item = repository.getById(node.itemId)
    const tier = item?.recipe
      ? getRecipeTier(item.recipe, node.enchantment)
      : null

    if (!item || !tier || tier.outputQuantity <= 0) return

    const actualOutputQuantity = node.quantity * occurrenceMultiplier
    const actualCraftsNeeded = actualOutputQuantity / tier.outputQuantity
    const returnRate = node.returnRate.returnRate

    for (const child of node.children) {
      const grossQuantity = child.quantity * actualCraftsNeeded
      const childItem = repository.getById(child.itemId)

      if (childItem && isReturnEligibleIngredient(item, childItem)) {
        addMaterial(child, grossQuantity, returnRate)
      }

      // Aunque un ingrediente no sea retornable en esta etapa (por ejemplo,
      // un artefacto), sus propias etapas expandidas pueden contener materiales
      // retornables y deben seguir recorriéndose.
      visit(child, actualCraftsNeeded)
    }
  }

  visit(root, 1)

  return Array.from(aggregated.values())
    .map((material) => ({ ...material }))
    .sort((a, b) => b.silverValue - a.silverValue)
}
