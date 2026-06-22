import type { BaseItemId, Item } from '../domain/entities/Item'
import type { EnchantmentLevel } from '../domain/entities/Enchantment'
import type { RecipeIngredient } from '../domain/entities/Recipe'
import type { ItemRepository } from '../domain/repositories/ItemRepository'

/**
 * Tipo de ingrediente especial que no existe como `Item` craftable en
 * el dataset, porque pertenece a un sistema de obtención distinto al
 * de recursos refinados estándar.
 *
 * - `artifact`: material de armas/armaduras de facción T4-T8
 *   (Avalon/Cristal/Hell/Keeper/Undead/Morgana). Se obtiene en
 *   calabozos de facción, no se craftea con recursos.
 * - `faction_blueprint`: plano requerido para craftear una capa de
 *   facción/ciudad. Se obtiene por reputación, no se craftea.
 * - `unknown`: el ingrediente no está en el dataset y no matchea
 *   ninguno de los dos patrones conocidos. A diferencia de los otros
 *   dos casos (esperados y ya investigados), esto señala un hueco
 *   real del dataset que conviene investigar, no un caso a ignorar.
 *
 * @see investigación de los 791 ingredientes faltantes contra
 * items.json: todos se explican por `ARTEFACT_*` o `CAPEITEM_*_BP`,
 * confirmado contra wiki.albiononline.com/wiki/Artifact.
 */
export type UnresolvedIngredientKind = 'artifact' | 'faction_blueprint' | 'unknown'

const ARTIFACT_ID_PATTERN = /(^|_)ARTEFACT_/
const FACTION_BLUEPRINT_ID_PATTERN = /_BP$/

export function classifyUnresolvedIngredient(itemId: BaseItemId): UnresolvedIngredientKind {
  const raw = itemId as unknown as string
  if (FACTION_BLUEPRINT_ID_PATTERN.test(raw)) return 'faction_blueprint'
  if (ARTIFACT_ID_PATTERN.test(raw)) return 'artifact'
  return 'unknown'
}

/**
 * Ingrediente de receta ya resuelto contra el repositorio: o bien
 * encontramos el `Item` real (caso normal, calculable), o no existe
 * en el dataset y queda clasificado como ingrediente especial fuera
 * de alcance, sin perder la cantidad requerida.
 */
export type ResolvedRecipeIngredient =
  | {
      readonly status: 'resolved'
      readonly item: Item
      readonly enchantment: EnchantmentLevel
      readonly quantity: number
    }
  | {
      readonly status: 'unresolved'
      readonly itemId: BaseItemId
      readonly kind: UnresolvedIngredientKind
      readonly quantity: number
    }

export function resolveRecipeIngredient(
  ingredient: RecipeIngredient,
  repository: ItemRepository,
): ResolvedRecipeIngredient {
  const item = repository.getById(ingredient.itemId)

  if (item) {
    return {
      status: 'resolved',
      item,
      enchantment: ingredient.enchantment,
      quantity: ingredient.quantity,
    }
  }

  return {
    status: 'unresolved',
    itemId: ingredient.itemId,
    kind: classifyUnresolvedIngredient(ingredient.itemId),
    quantity: ingredient.quantity,
  }
}

export function resolveRecipeTierIngredients(
  ingredients: readonly RecipeIngredient[],
  repository: ItemRepository,
): readonly ResolvedRecipeIngredient[] {
  return ingredients.map((ingredient) => resolveRecipeIngredient(ingredient, repository))
}

/**
 * Estado agregado de una receta ya resuelta, usado para decidir el
 * badge que se muestra en la UI:
 * - `complete`: todos los ingredientes son ítems normales del dataset.
 * - `partial`: mezcla de ingredientes normales + al menos uno especial
 *   (artefacto o blueprint) — el caso típico de equipo de facción T8.
 * - `unresolved`: no hay ningún ingrediente normal, todo es especial
 *   (o la lista está vacía).
 */
export type RecipeResolutionStatus = 'complete' | 'partial' | 'unresolved'

export function getRecipeResolutionStatus(
  resolved: readonly ResolvedRecipeIngredient[],
): RecipeResolutionStatus {
  if (resolved.length === 0) return 'unresolved'

  const hasUnresolved = resolved.some((entry) => entry.status === 'unresolved')
  if (!hasUnresolved) return 'complete'

  const allUnresolved = resolved.every((entry) => entry.status === 'unresolved')
  return allUnresolved ? 'unresolved' : 'partial'
}