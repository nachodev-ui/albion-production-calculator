import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

/**
 * Paleta de encantamiento siguiendo la convención visual de Albion:
 *   .0 piedra/neutro · .1 verde · .2 azul · .3 violeta · .4 dorado
 *
 * Vive como módulo propio (no en tokens.ts, que es la paleta base de
 * la app) porque es un sub-sistema de color semántico independiente:
 * comunica "rareza/grado" y se reutiliza en el selector, el rombo de
 * nivel y futuros badges. Cada entrada trae el color sólido y una
 * versión tenue para fondos/anillos sin recalcular opacidades inline.
 */
export interface EnchantmentColor {
  /** Color sólido del rombo y del estado activo. */
  readonly solid: string
  /** Tinte de fondo para el chip activo. */
  readonly tint: string
  /** Color de borde/anillo del chip activo. */
  readonly ring: string
  /** Etiqueta corta del grado (para tooltips / lectores de pantalla). */
  readonly label: string
}

export const ENCHANTMENT_COLORS: Record<EnchantmentLevel, EnchantmentColor> = {
  0: { solid: '#9c8f72', tint: 'rgba(156, 143, 114, 0.14)', ring: 'rgba(156, 143, 114, 0.45)', label: 'Base' },
  1: { solid: '#5fa463', tint: 'rgba(95, 164, 99, 0.16)', ring: 'rgba(95, 164, 99, 0.5)', label: 'Verde' },
  2: { solid: '#4a8fc4', tint: 'rgba(74, 143, 196, 0.16)', ring: 'rgba(74, 143, 196, 0.5)', label: 'Azul' },
  3: { solid: '#9b6bd0', tint: 'rgba(155, 107, 208, 0.16)', ring: 'rgba(155, 107, 208, 0.5)', label: 'Violeta' },
  4: { solid: '#d4a72c', tint: 'rgba(212, 167, 44, 0.18)', ring: 'rgba(212, 167, 44, 0.55)', label: 'Dorado' },
} as Record<EnchantmentLevel, EnchantmentColor>

export function getEnchantmentColor(level: EnchantmentLevel): EnchantmentColor {
  return ENCHANTMENT_COLORS[level] ?? ENCHANTMENT_COLORS[0]
}