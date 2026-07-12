import type { EnchantmentLevel } from '../domain/entities/Enchantment'
import type { BaseItemId } from '../domain/entities/Item'
import type { RecipeOption } from '../domain/entities/Recipe'

const ROYAL_SIGIL_PATTERN = /^QUESTITEM_TOKEN_ROYAL_T[4-8]$/

export type RoyalRecipeRequirementKind = 'base_piece' | 'royal_sigil'

export interface RoyalRecipeRequirement {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  readonly kind: RoyalRecipeRequirementKind
}

export interface RoyalRecipeRequirementsSummary {
  readonly requestedOutputQuantity: number
  readonly craftsNeeded: number
  readonly requirements: readonly RoyalRecipeRequirement[]
}

export function isRoyalSigilItemId(itemId: BaseItemId): boolean {
  return ROYAL_SIGIL_PATTERN.test(String(itemId))
}

/**
 * Obtiene los insumos directos que una receta Royal consume por completo.
 *
 * La cantidad de cada ingrediente se escala por el número real de tiradas. El
 * resultado se mantiene separado del retorno de recursos porque ni la pieza
 * base ni los Sellos Reales reciben RRR en la etapa Royal.
 */
export function buildRoyalRecipeRequirements(
  option: RecipeOption | null,
  requestedOutputQuantity: number,
): RoyalRecipeRequirementsSummary | null {
  if (
    !option ||
    !Number.isFinite(requestedOutputQuantity) ||
    requestedOutputQuantity <= 0 ||
    !Number.isFinite(option.outputQuantity) ||
    option.outputQuantity <= 0
  ) {
    return null
  }

  const hasRoyalSigil = option.ingredients.some((ingredient) =>
    isRoyalSigilItemId(ingredient.itemId),
  )

  if (!hasRoyalSigil) return null

  const craftsNeeded = requestedOutputQuantity / option.outputQuantity
  const aggregated = new Map<string, RoyalRecipeRequirement>()

  for (const ingredient of option.ingredients) {
    const kind: RoyalRecipeRequirementKind = isRoyalSigilItemId(
      ingredient.itemId,
    )
      ? 'royal_sigil'
      : 'base_piece'
    const key = `${ingredient.itemId}@${ingredient.enchantment}:${kind}`
    const quantity = ingredient.quantity * craftsNeeded
    const current = aggregated.get(key)

    aggregated.set(key, {
      itemId: ingredient.itemId,
      enchantment: ingredient.enchantment,
      quantity: (current?.quantity ?? 0) + quantity,
      kind,
    })
  }

  const requirements = Array.from(aggregated.values()).sort((left, right) => {
    if (left.kind === right.kind) {
      return String(left.itemId).localeCompare(String(right.itemId))
    }

    return left.kind === 'base_piece' ? -1 : 1
  })

  return {
    requestedOutputQuantity,
    craftsNeeded,
    requirements,
  }
}
