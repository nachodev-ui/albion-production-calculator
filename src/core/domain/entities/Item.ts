import type { EnchantmentLevel } from './Enchantment'
import type { Recipe } from './Recipe'

/**
 * Categoría amplia de un ítem, usada para filtrar/agrupar en el buscador.
 * Se mantiene deliberadamente simple: refleja agrupaciones de Albion,
 * no la jerarquía completa de subcategorías del juego.
 */
export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'offhand'
  | 'accessory'
  | 'resource'
  | 'refined_resource'
  | 'food'
  | 'potion'
  | 'other'

/**
 * Identificador base de un ítem, SIN encantamiento.
 * Ej: "T4_SWORD", "T5_MAIN_AXE", "T4_ORE".
 *
 * Se modela como tipo nominal liviano para no confundirlo con un
 * string genérico en las firmas de las funciones.
 */
export type BaseItemId = string & { readonly __brand: 'BaseItemId' }

export function asBaseItemId(value: string): BaseItemId {
  return value as BaseItemId
}

/**
 * Ítem base de Albion Online (sin resolver encantamiento todavía).
 *
 * El encantamiento se trata como variante en tiempo de uso (ver
 * `core/usecases`), no como parte de la identidad del ítem: un ítem
 * con su receta es el mismo "Item" sin importar qué encantamiento
 * esté seleccionado en la UI.
 */
export interface Item {
  readonly id: BaseItemId
  readonly name: string
  readonly tier: number
  readonly category: ItemCategory
  /** Nivel máximo de encantamiento que admite este ítem (0 si no admite). */
  readonly maxEnchantment: EnchantmentLevel
  /** Valor interno usado por Albion para nutrición y tarifas de estación. */
  readonly itemValue?: number | null
  /**
   * Receta para craftear este ítem, si es craftable.
   * `null` si el ítem solo se obtiene farmeando/comprando (ej. Mineral, Fibra).
   */
  readonly recipe: Recipe | null
}

/**
 * Construye la URL del ícono de render oficial de Albion para un ítem,
 * en un encantamiento dado.
 *
 * No requiere API key: el servicio de renders es público.
 * Formato oficial: /v1/item/{identifier}@{enchantment}.png
 * (enchantment 0 se omite porque es el valor por defecto).
 *
 * @see https://wiki.albiononline.com/wiki/API:Render_service
 */
export function buildItemIconUrl(
  baseId: BaseItemId,
  enchantment: EnchantmentLevel,
  size = 217,
): string {
  const identifier = enchantment > 0 ? `${baseId}@${enchantment}` : baseId
  return `https://render.albiononline.com/v1/item/${identifier}.png?size=${size}`
}

/**
 * Detecta ítems "vanity" (cosméticos de evento/logro, ej. trajes de
 * esqueleto, capas de fundador) que el dataset incluye con un objeto
 * `recipe` técnicamente presente, pero sin ingredientes reales en
 * NINGÚN tier: no se craftean, se obtienen de otra forma.
 *
 * Se diferencian de un recurso crudo (Mineral, Fibra) porque esos
 * tienen `recipe: null` directamente, no un `recipe.tiers` vacío de
 * ingredientes.
 *
 * @see investigación de los 791 ingredientes faltantes: 71 ítems del
 * dataset matchean este patrón (confirmado vía PowerShell sobre
 * items.json — todos `UNIQUE_*_VANITY_*`).
 */
export function isVanityPlaceholder(item: Item): boolean {
  if (!item.recipe) return false
  return item.recipe.tiers.every((tier) => tier.ingredients.length === 0)
}