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
 * `enchantment` indica en qué nivel se necesita ESE ingrediente
 * particular: para recetas de nivel 0 siempre es 0, pero para
 * recetas de nivel N≥1, los ingredientes normalmente también piden
 * su versión @N (ej. craftear una espada .2 pide Lingotes .2).
 *
 * No incluye el `Item` completo para evitar referencias circulares
 * en el grafo de recetas — la resolución la hace el repositorio,
 * no la entidad.
 */
export interface RecipeIngredient {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
}

/**
 * Recursos de "Upgrade" (Runa/Alma/Reliquia) requeridos para encantar
 * un ítem YA CRAFTEADO de un nivel al siguiente, como camino
 * alternativo a craftear desde cero con materiales pre-encantados.
 *
 * Solo existe para llevar de nivel N-1 a N (no hay upgrade hacia
 * Pristine/nivel 4 vía este sistema, se craftea directo).
 */
export interface UpgradeRequirement {
  readonly itemId: BaseItemId
  readonly quantity: number
}

/**
 * Receta de crafteo de un ítem PARA UN NIVEL DE ENCANTAMIENTO DADO.
 *
 * `outputQuantity` existe porque algunas recetas (notablemente comida
 * y algunos recursos) producen más de 1 unidad por crafteo.
 */
export interface RecipeTier {
  readonly enchantment: EnchantmentLevel
  readonly station: CraftingStation
  readonly ingredients: readonly RecipeIngredient[]
  readonly outputQuantity: number
  /** Plata cobrada por la estación al craftear (no el costo de materiales). */
  readonly silverFee: number
  /** Foco de crafteo consumido, si se usa Foco (informativo, no afecta el costo en plata). */
  readonly craftingFocus: number
  /**
   * Camino alternativo: encantar un ítem de nivel `enchantment - 1`
   * ya crafteado, usando Runas/Almas/Reliquias, en vez de craftear
   * desde cero con materiales pre-encantados.
   * `null` para la receta base (nivel 0) y para nivel 4 (Pristine,
   * que no tiene camino de upgrade).
   */
  readonly upgradeFrom: UpgradeRequirement | null
}

/**
 * Receta completa de un ítem craftable: un `RecipeTier` por cada
 * nivel de encantamiento que el ítem admite. SIEMPRE incluye el
 * nivel 0; los niveles 1+ son opcionales según si el ítem es
 * encantable.
 */
export interface Recipe {
  readonly tiers: readonly RecipeTier[]
}

/**
 * Busca la receta de un nivel de encantamiento específico dentro
 * de una `Recipe`, o `null` si ese nivel no existe para este ítem.
 */
export function getRecipeTier(recipe: Recipe, enchantment: EnchantmentLevel): RecipeTier | null {
  return recipe.tiers.find((tier) => tier.enchantment === enchantment) ?? null
}