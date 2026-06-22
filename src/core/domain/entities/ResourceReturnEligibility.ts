import type { Item } from './Item'

/**
 * Indica si un ingrediente puede ser devuelto por el Resource Return Rate
 * en la etapa de producción de `producedItem`.
 *
 * En crafteo de equipamiento, Albion devuelve recursos refinados, pero no
 * artefactos, runas, almas, reliquias, fragmentos ni otros componentes
 * especiales. Para una etapa de refinamiento sí pueden volver tanto el
 * recurso crudo como el recurso refinado de tier anterior.
 */
export function isReturnEligibleIngredient(
  producedItem: Item,
  ingredientItem: Item,
): boolean {
  if (producedItem.category === 'refined_resource') {
    return (
      ingredientItem.category === 'resource' ||
      ingredientItem.category === 'refined_resource'
    )
  }

  return ingredientItem.category === 'refined_resource'
}
