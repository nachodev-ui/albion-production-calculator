import type { BaseItemId } from './Item'
import type { EnchantmentLevel } from './Enchantment'

/**
 * Estación de crafteo donde se elabora la receta.
 * Determina qué tipo de bonus de ciudad/foco aplica, aunque ese cálculo
 * de bonus queda fuera del alcance de este modelo (el usuario ingresa
 * precios ya conociendo su contexto).
 */
export type CraftingStation =
  | 'warrior_forge' // Fragua del guerrero (armas cuerpo a cuerpo, armadura de placas)
  | 'hunter_lodge' // Refugio del cazador (armas a distancia, armadura de cuero)
  | 'mage_tower' // Torre del mago (armas mágicas, armadura de tela)
  | 'toolmaker' // Herrero de herramientas (herramientas, accesorios)
  | 'magic_wardrobe' // Guardarropa mágico (capas, bolsas)
  | 'refining' // Estación de refinado (recursos refinados)
  | 'cooking' // Cocina (comida)
  | 'alchemy' // Laboratorio de alquimia (pociones)
  | 'farming' // Granja (no craftable vía receta tradicional)
  | 'unknown'

/**
 * Un ingrediente dentro de una receta: referencia a OTRO ítem base
 * (por su id) y la cantidad necesaria por unidad crafteada.
 *
 * `enchantment` pertenece al ingrediente, no al objeto producido.
 * Esto es importante en recetas como el equipo real: la armadura base
 * conserva el encantamiento elegido, mientras que el Sello Real siempre
 * se usa en nivel 0.
 */
export interface RecipeIngredient {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
}

/**
 * Una forma concreta de fabricar el mismo ítem y nivel.
 *
 * La mayoría de los objetos tiene una sola opción. Algunos, como las
 * armaduras reales, aceptan cualquiera de las tres primeras piezas de su
 * rama y por eso exponen varias opciones equivalentes.
 */
export interface RecipeOption {
  readonly ingredients: readonly RecipeIngredient[]
  readonly outputQuantity: number
  /** Plata cobrada por la estación al craftear. */
  readonly silverFee: number
  /** Foco consumido, solo informativo. */
  readonly craftingFocus: number
}

/**
 * Recursos de "Upgrade" (Runa/Alma/Reliquia) requeridos para encantar
 * un ítem YA CRAFTEADO de un nivel al siguiente.
 */
export interface UpgradeRequirement {
  readonly itemId: BaseItemId
  readonly quantity: number
}

/**
 * Receta de crafteo de un ítem PARA UN NIVEL DE ENCANTAMIENTO DADO.
 *
 * Los campos principales representan la opción predeterminada y se
 * mantienen para compatibilidad con el dataset existente. `alternatives`
 * contiene las opciones adicionales, si las hay.
 */
export interface RecipeTier extends RecipeOption {
  readonly enchantment: EnchantmentLevel
  readonly station: CraftingStation
  readonly alternatives?: readonly RecipeOption[]
  /**
   * Camino alternativo: encantar un ítem de nivel `enchantment - 1`
   * ya crafteado, usando Runas/Almas/Reliquias.
   */
  readonly upgradeFrom: UpgradeRequirement | null
}

/** Receta completa de un ítem craftable. */
export interface Recipe {
  readonly tiers: readonly RecipeTier[]
}

/** Busca la receta de un nivel de encantamiento específico. */
export function getRecipeTier(
  recipe: Recipe,
  enchantment: EnchantmentLevel,
): RecipeTier | null {
  return recipe.tiers.find((tier) => tier.enchantment === enchantment) ?? null
}

/** Devuelve la opción principal seguida de sus alternativas. */
export function getRecipeOptions(tier: RecipeTier): readonly RecipeOption[] {
  const primary: RecipeOption = {
    ingredients: tier.ingredients,
    outputQuantity: tier.outputQuantity,
    silverFee: tier.silverFee,
    craftingFocus: tier.craftingFocus,
  }

  return [primary, ...(tier.alternatives ?? [])]
}

/**
 * Obtiene una opción segura. Un índice inválido vuelve a la primera
 * receta para impedir que datos persistidos antiguos rompan el cálculo.
 */
export function getRecipeOption(
  tier: RecipeTier,
  optionIndex: number,
): RecipeOption {
  const options = getRecipeOptions(tier)
  const fallback = options[0]

  if (!fallback) {
    throw new Error('RecipeTier must contain a primary recipe option')
  }

  return options[optionIndex] ?? fallback
}
