/**
 * Ubicaciones relevantes para crafteo/refinado. `island` representa una isla
 * personal/de gremio y `hideout` una ubicación configurable por calidad de
 * zona y nivel de poder.
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
  | 'hideout'

export interface City {
  readonly id: CityId
  readonly name: string
}

/**
 * Ciudades e isla usadas por selectores existentes. Hideout se añade solo en
 * configuración de producción para evitar tratarlo como mercado consultable.
 */
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

/** Bono base de Producción Local de cualquier ciudad real. */
export const BASE_CITY_PRODUCTION_BONUS = 0.18
/** Bono extra de especialidad para refinado. */
export const REFINING_SPECIALTY_BONUS = 0.4
/** Bono extra de especialidad para crafteo de equipo. */
export const CRAFTING_SPECIALTY_BONUS = 0.15
/** Bono flat por usar Foco de Crafteo. */
export const FOCUS_BONUS = 0.59

export const REFINING_SPECIALTY_BY_CITY: Partial<Record<CityId, string>> = {
  martlock: 'hide',
  bridgewatch: 'rock',
  lymhurst: 'fiber',
  fort_sterling: 'wood',
  thetford: 'ore',
}

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
