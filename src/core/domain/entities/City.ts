/**
 * Ciudades reales de Albion Online relevantes para crafteo/refinado.
 * "island" representa una isla personal/de gremio (sin bono de
 * especialidad, pero sin tarifa de estación).
 */
export type CityId =
  | 'martlock'
  | 'bridgewatch'
  | 'lymhurst'
  | 'fort_sterling'
  | 'thetford'
  | 'caerleon'
  | 'brecilien'
  | 'island'

export interface City {
  readonly id: CityId
  readonly name: string
}

export const CITIES: readonly City[] = [
  { id: 'martlock', name: 'Martlock' },
  { id: 'bridgewatch', name: 'Bridgewatch' },
  { id: 'lymhurst', name: 'Lymhurst' },
  { id: 'fort_sterling', name: 'Fort Sterling' },
  { id: 'thetford', name: 'Thetford' },
  { id: 'caerleon', name: 'Caerleon' },
  { id: 'brecilien', name: 'Brecilien' },
  { id: 'island', name: 'Isla personal/de gremio' },
]

/**
 * Bono base de Producción Local (LPB) que da CUALQUIER ciudad real
 * (no isla) a refinado y crafteo, sin necesidad de especialidad.
 *
 * @see https://wiki.albiononline.com/wiki/Resource_return_rate
 */
export const BASE_CITY_PRODUCTION_BONUS = 0.18

/**
 * Bono extra de especialidad cuando la ciudad SÍ tiene bono para
 * la categoría de REFINADO siendo trabajada (ej. Lymhurst + fibra).
 */
export const REFINING_SPECIALTY_BONUS = 0.4

/**
 * Bono extra de especialidad cuando la ciudad SÍ tiene bono para
 * la categoría de CRAFTEO siendo trabajada (ej. Lymhurst + espada).
 */
export const CRAFTING_SPECIALTY_BONUS = 0.15

/** Bono flat por usar Foco de Crafteo. */
export const FOCUS_BONUS = 0.59

/**
 * Tabla de especialidades de REFINADO por ciudad: qué tipo de
 * recurso crudo tiene bono ahí.
 */
export const REFINING_SPECIALTY_BY_CITY: Partial<Record<CityId, string>> = {
  martlock: 'hide',
  bridgewatch: 'rock',
  lymhurst: 'fiber',
  fort_sterling: 'wood',
  thetford: 'ore',
}

/**
 * Tabla de especialidades de CRAFTEO por ciudad, mapeada por
 * "craftingcategory" tal como aparece en el dataset del juego
 * (ej. "sword", "axe", "plate_armor").
 *
 * @see verificado contra wiki.albiononline.com/wiki/Resource_return_rate
 */
export interface CitySpecialty {
  readonly city: CityId
  readonly craftingCategories: readonly string[]
}

export const CITY_CRAFTING_SPECIALTIES: readonly CitySpecialty[] = [
  {
    city: 'martlock',
    craftingCategories: ['axe', 'quarterstaff', 'frost_staff', 'plate_shoes', 'offhand'],
  },
  {
    city: 'bridgewatch',
    craftingCategories: ['crossbow', 'dagger', 'cursed_staff', 'plate_armor', 'cloth_shoes'],
  },
  {
    city: 'lymhurst',
    craftingCategories: ['sword', 'bow', 'arcane_staff', 'leather_helmet', 'leather_shoes'],
  },
  {
    city: 'fort_sterling',
    craftingCategories: ['hammer', 'spear', 'holy_staff', 'cloth_armor', 'plate_helmet'],
  },
  {
    city: 'thetford',
    craftingCategories: ['mace', 'nature_staff', 'fire_staff', 'leather_armor', 'cloth_helmet'],
  },
  {
    city: 'caerleon',
    craftingCategories: ['tool', 'food', 'potion', 'gathering_gear', 'war_gloves', 'shapeshifter_staff'],
  },
]