import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type {
  BaseItemId,
  Item,
  ItemCategory,
} from '@core/domain/entities/Item'
import {
  getRecipeOption,
  getRecipeTier,
} from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'

/**
 * Fama base obtenida al fabricar una unidad de recurso refinado.
 *
 * El equipamiento hereda esta progresión a partir de la cantidad de
 * materiales refinados que aporta fama en su receta. Los artefactos,
 * insignias, sellos, runas, almas y reliquias no agregan fama por sí solos.
 */
const BASE_REFINED_RESOURCE_FAME_BY_TIER: Readonly<Record<number, number>> = {
  2: 1.5,
  3: 7.5,
  4: 22.5,
  5: 90,
  6: 270,
  7: 645,
  8: 1395,
}

const PREMIUM_FAME_BONUS_RATE = 0.5

const FAME_CARRYING_ITEM_CATEGORIES: ReadonlySet<ItemCategory> = new Set<ItemCategory>([
  'weapon',
  'armor',
  'offhand',
  'accessory',
])

export interface CraftingFameBreakdown {
  /** Fama base de una unidad del objeto final. */
  readonly famePerFinalItem: number
  /** Cantidad solicitada por el usuario. */
  readonly requestedQuantity: number
  /** Cantidad real de tiradas necesarias según outputQuantity. */
  readonly craftsNeeded: number
  /** Cantidad que producirán esas tiradas. */
  readonly producedQuantity: number
  /** Fama sin Premium para todo el lote. */
  readonly baseFame: number
  /** Bonificación adicional de Premium para todo el lote. */
  readonly premiumBonus: number
  /** Fama final recibida por el lote. */
  readonly totalFame: number
  /** Fama que llena diarios de trabajadores. */
  readonly journalFame: number
  readonly isPremium: boolean
}

interface ResolveFameContext {
  readonly repository: ItemRepository
  readonly rootOptionIndex: number
  readonly visited: ReadonlySet<string>
  readonly isRoot: boolean
}

function getRefinedResourceFame(
  item: Item,
  enchantment: EnchantmentLevel,
): number | null {
  const tierBaseFame = BASE_REFINED_RESOURCE_FAME_BY_TIER[item.tier]
  if (tierBaseFame === undefined) return null

  return tierBaseFame * 2 ** enchantment
}

function canCarryCraftingFame(category: ItemCategory): boolean {
  return FAME_CARRYING_ITEM_CATEGORIES.has(category)
}

/**
 * Resuelve la fama base equivalente de UNA unidad del ítem.
 *
 * Para equipamiento normal se suman únicamente los recursos refinados.
 * Para conversiones como capas de facción y equipo real se sigue el objeto
 * base de la receta hasta encontrar los recursos refinados equivalentes.
 */
function resolveFamePerOutputUnit(
  item: Item,
  enchantment: EnchantmentLevel,
  context: ResolveFameContext,
): number | null {
  if (item.category === 'refined_resource') {
    return getRefinedResourceFame(item, enchantment)
  }

  if (!canCarryCraftingFame(item.category) || !item.recipe) {
    return null
  }

  const visitKey = `${item.id}@${enchantment}`
  if (context.visited.has(visitKey)) return null

  const tier = getRecipeTier(item.recipe, enchantment)
  if (!tier) return null

  const option = getRecipeOption(
    tier,
    context.isRoot ? context.rootOptionIndex : 0,
  )
  if (option.outputQuantity <= 0) return null

  const visited = new Set(context.visited)
  visited.add(visitKey)

  let famePerCraft = 0
  let foundContribution = false

  for (const ingredient of option.ingredients) {
    const ingredientItem = context.repository.getById(ingredient.itemId)
    if (!ingredientItem) continue

    let ingredientFame: number | null = null

    if (ingredientItem.category === 'refined_resource') {
      ingredientFame = getRefinedResourceFame(
        ingredientItem,
        ingredient.enchantment,
      )
    } else if (canCarryCraftingFame(ingredientItem.category)) {
      ingredientFame = resolveFamePerOutputUnit(
        ingredientItem,
        ingredient.enchantment,
        {
          repository: context.repository,
          rootOptionIndex: 0,
          visited,
          isRoot: false,
        },
      )
    }

    if (ingredientFame === null || ingredientFame <= 0) continue

    famePerCraft += ingredientFame * ingredient.quantity
    foundContribution = true
  }

  if (!foundContribution || famePerCraft <= 0) return null

  return famePerCraft / option.outputQuantity
}

export interface CalculateCraftingFameInput {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  readonly isPremium: boolean
  readonly repository: ItemRepository
  readonly recipeOptionIndex?: number
}

/**
 * Calcula exclusivamente la fama del objeto final seleccionado.
 *
 * No suma fama de refinamiento ni de fabricar ingredientes intermedios,
 * tampoco incluye estudio del objeto u otros bonos temporales.
 */
export function calculateCraftingFame({
  itemId,
  enchantment,
  quantity,
  isPremium,
  repository,
  recipeOptionIndex = 0,
}: CalculateCraftingFameInput): CraftingFameBreakdown | null {
  const item = repository.getById(itemId)
  if (!item || !item.recipe) return null

  const tier = getRecipeTier(item.recipe, enchantment)
  if (!tier) return null

  const option = getRecipeOption(tier, recipeOptionIndex)
  if (option.outputQuantity <= 0) return null

  const normalizedQuantity = Math.max(1, Math.floor(quantity))
  const famePerFinalItem = resolveFamePerOutputUnit(item, enchantment, {
    repository,
    rootOptionIndex: recipeOptionIndex,
    visited: new Set(),
    isRoot: true,
  })

  if (famePerFinalItem === null || famePerFinalItem <= 0) return null

  const craftsNeeded = Math.ceil(normalizedQuantity / option.outputQuantity)
  const producedQuantity = craftsNeeded * option.outputQuantity
  const famePerCraft = famePerFinalItem * option.outputQuantity
  const baseFame = famePerCraft * craftsNeeded
  const premiumBonus = isPremium
    ? baseFame * PREMIUM_FAME_BONUS_RATE
    : 0

  return {
    famePerFinalItem,
    requestedQuantity: normalizedQuantity,
    craftsNeeded,
    producedQuantity,
    baseFame,
    premiumBonus,
    totalFame: baseFame + premiumBonus,
    journalFame: baseFame,
    isPremium,
  }
}
