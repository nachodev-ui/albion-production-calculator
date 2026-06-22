import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { CraftCalculation } from '@core/domain/entities/CraftCostNode'
import {
  getRecipeOptions,
  getRecipeTier,
} from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import {
  calculateCraftCost,
  type CraftTreeConfig,
} from '@core/usecases/calculateCraftCost'
import {
  calculateProfitBreakdown,
  type ProfitBreakdown,
} from './profitCalculations'

export interface RecipeOptionComparison {
  readonly optionIndex: number
  readonly calculation: CraftCalculation
  readonly breakdown: ProfitBreakdown
  readonly isComplete: boolean
}

interface CompareRecipeOptionsParams {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  readonly unitSellPrice: number | null
  readonly isPremium: boolean
  readonly repository: ItemRepository
  readonly config: CraftTreeConfig
}

/**
 * Calcula todas las alternativas de la receta sin modificar el store.
 *
 * Las opciones completas aparecen primero. Cuando existe precio de venta,
 * se ordenan por ganancia neta. Sin precio de venta, se ordenan por costo.
 */
export function compareRecipeOptions({
  itemId,
  enchantment,
  quantity,
  unitSellPrice,
  isPremium,
  repository,
  config,
}: CompareRecipeOptionsParams): readonly RecipeOptionComparison[] {
  const item = repository.getById(itemId)
  const tier = item?.recipe
    ? getRecipeTier(item.recipe, enchantment)
    : null

  if (!tier) return []

  const options = getRecipeOptions(tier)

  if (options.length <= 1) return []

  const expandedPaths = new Set(config.expandedPaths)
  expandedPaths.add('root')

  const results = options.map((_, optionIndex) => {
    const selectedRecipeOptions = new Map(
      config.selectedRecipeOptions ?? [],
    )

    selectedRecipeOptions.set('root', optionIndex)

    const calculation = calculateCraftCost(
      itemId,
      enchantment,
      quantity,
      repository,
      {
        ...config,
        expandedPaths,
        selectedRecipeOptions,
      },
    )

    const breakdown = calculateProfitBreakdown({
      totalCost: calculation.grandTotal,
      quantity,
      unitSellPrice: unitSellPrice ?? 0,
      isPremium,
    })

    return {
      optionIndex,
      calculation,
      breakdown,
      isComplete: calculation.isComplete,
    }
  })

  const hasSellPrice =
    unitSellPrice !== null && unitSellPrice > 0

  return results.toSorted((left, right) => {
    if (left.isComplete !== right.isComplete) {
      return left.isComplete ? -1 : 1
    }

    if (!left.isComplete && !right.isComplete) {
      return left.optionIndex - right.optionIndex
    }

    if (hasSellPrice) {
      return right.breakdown.profit - left.breakdown.profit
    }

    return (
      left.calculation.grandTotal -
      right.calculation.grandTotal
    )
  })
}