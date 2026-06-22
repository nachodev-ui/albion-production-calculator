/**
 * Encantamiento de un ítem en Albion Online.
 *
 * 0 = sin encantar, 1-4 = niveles ".1" (Uncommon) a ".4" (Pristine).
 * Es un value object: no tiene identidad propia, solo representa
 * un nivel válido dentro de un rango cerrado.
 *
 * Verificado contra el dataset real del juego (ao-bin-dumps/items.xml):
 * existen <enchantment enchantmentlevel="1..4"> en las recetas.
 */
export type EnchantmentLevel = 0 | 1 | 2 | 3 | 4

export const ENCHANTMENT_LEVELS: readonly EnchantmentLevel[] = [0, 1, 2, 3, 4]

export function isValidEnchantmentLevel(value: number): value is EnchantmentLevel {
  return ENCHANTMENT_LEVELS.includes(value as EnchantmentLevel)
}

/**
 * Formatea un encantamiento para mostrar en UI (ej. ".2"), o
 * cadena vacía si es 0.
 */
export function formatEnchantment(level: EnchantmentLevel): string {
  return level === 0 ? '' : `.${level}`
}