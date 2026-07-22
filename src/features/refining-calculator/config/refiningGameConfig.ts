import { asBaseItemId, type BaseItemId } from '@core/domain/entities/Item'
import type { CityId } from '@core/domain/entities/City'

export type RefiningResourceKind = 'wood' | 'ore' | 'hide' | 'fiber' | 'rock'
export type RefiningTier = 2 | 3 | 4 | 5 | 6 | 7 | 8
export type RefiningEnchantment = 0 | 1 | 2 | 3 | 4
export type RefiningCityId = Exclude<CityId, 'hideout' | 'island'>

export interface RefiningResourceDefinition {
  readonly kind: RefiningResourceKind
  readonly label: string
  readonly rawLabel: string
  readonly refinedLabel: string
  readonly rawItemSuffix: string
  readonly refinedItemSuffix: string
  readonly specialtyCity: RefiningCityId
  readonly maximumEnchantment: RefiningEnchantment
}

export interface RefiningRecipeDefinition {
  readonly tier: RefiningTier
  readonly enchantment: RefiningEnchantment
  readonly rawItemId: BaseItemId
  readonly rawEnchantment: RefiningEnchantment
  readonly previousRefinedItemId: BaseItemId | null
  readonly previousRefinedEnchantment: RefiningEnchantment
  readonly outputItemId: BaseItemId
  readonly outputEnchantment: RefiningEnchantment
  readonly rawPerCraft: number
  readonly previousRefinedPerCraft: number
  readonly outputPerCraft: number
  readonly baseFocusPerCraft: number
  readonly itemValuePerCraft: number
}

/**
 * Constantes de juego verificadas el 22-07-2026.
 * Mantener todos los números balanceables en este archivo evita dispersarlos por la UI.
 *
 * Fuentes primarias:
 * - RRR y bonos: https://wiki.albiononline.com/wiki/Resource_return_rate
 * - Recetas y ciudades: https://albiononline.com/news/guide-refining
 * - Foco base y eficiencia: https://wiki.albiononline.com/wiki/Crafting_Focus
 * - Especialización: https://wiki.albiononline.com/wiki/Specializations
 * - Tarifa/nutrición: https://wiki.albiononline.com/wiki/Building
 * - Mercado: https://www.albion-online-data.com/api/
 */
export const REFINING_MECHANICS_SOURCES = {
  returnRate: 'https://wiki.albiononline.com/wiki/Resource_return_rate',
  recipes: 'https://albiononline.com/news/guide-refining',
  focus: 'https://wiki.albiononline.com/wiki/Crafting_Focus',
  specialization: 'https://wiki.albiononline.com/wiki/Specializations',
  stationFee: 'https://wiki.albiononline.com/wiki/Building',
  marketData: 'https://www.albion-online-data.com/api/',
} as const

export const REFINING_RESOURCES: readonly RefiningResourceDefinition[] = [
  {
    kind: 'wood',
    label: 'Madera → tablones',
    rawLabel: 'Madera',
    refinedLabel: 'Tablones',
    rawItemSuffix: 'WOOD',
    refinedItemSuffix: 'PLANKS',
    specialtyCity: 'fort_sterling',
    maximumEnchantment: 4,
  },
  {
    kind: 'ore',
    label: 'Mineral → barras',
    rawLabel: 'Mineral',
    refinedLabel: 'Barras de metal',
    rawItemSuffix: 'ORE',
    refinedItemSuffix: 'METALBAR',
    specialtyCity: 'thetford',
    maximumEnchantment: 4,
  },
  {
    kind: 'hide',
    label: 'Piel → cuero',
    rawLabel: 'Piel',
    refinedLabel: 'Cuero',
    rawItemSuffix: 'HIDE',
    refinedItemSuffix: 'LEATHER',
    specialtyCity: 'martlock',
    maximumEnchantment: 4,
  },
  {
    kind: 'fiber',
    label: 'Fibra → tela',
    rawLabel: 'Fibra',
    refinedLabel: 'Tela',
    rawItemSuffix: 'FIBER',
    refinedItemSuffix: 'CLOTH',
    specialtyCity: 'lymhurst',
    maximumEnchantment: 4,
  },
  {
    kind: 'rock',
    label: 'Roca → bloques de piedra',
    rawLabel: 'Roca',
    refinedLabel: 'Bloques de piedra',
    rawItemSuffix: 'ROCK',
    refinedItemSuffix: 'STONEBLOCK',
    specialtyCity: 'bridgewatch',
    maximumEnchantment: 3,
  },
] as const

export const REFINING_TIERS: readonly RefiningTier[] = [2, 3, 4, 5, 6, 7, 8]
export const REFINING_ENCHANTMENTS: readonly RefiningEnchantment[] = [0, 1, 2, 3, 4]

/** Cantidad de recurso crudo por tirada para producir una unidad base. */
export const RAW_RESOURCE_PER_CRAFT: Readonly<Record<RefiningTier, number>> = {
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 5,
}

/** Item Value base usado por Albion para nutrición/tarifa de refinamiento. */
export const REFINING_ITEM_VALUE_BY_TIER: Readonly<Record<RefiningTier, number>> = {
  2: 0,
  3: 8,
  4: 16,
  5: 32,
  6: 64,
  7: 128,
  8: 256,
}

/** Foco base por tirada, antes de aplicar Focus Cost Efficiency. */
const STANDARD_REFINING_FOCUS_COST: Readonly<
  Record<RefiningTier, readonly number[]>
> = {
  2: [18],
  3: [31],
  4: [54, 94, 164, 287, 503],
  5: [94, 164, 287, 503, 880],
  6: [164, 287, 503, 880, 1539],
  7: [287, 503, 880, 1539, 2694],
  8: [503, 880, 1539, 2694, 4714],
}

const STONE_REFINING_FOCUS_COST: Readonly<
  Record<RefiningTier, readonly number[]>
> = {
  2: [18],
  3: [31],
  4: [54, 108, 216, 432],
  5: [94, 188, 376, 752],
  6: [164, 328, 656, 1312],
  7: [287, 574, 1148, 2296],
  8: [503, 1006, 2012, 4024],
}

export const REFINING_CITY_LABELS: Readonly<Record<RefiningCityId, string>> = {
  martlock: 'Martlock',
  bridgewatch: 'Bridgewatch',
  lymhurst: 'Lymhurst',
  fort_sterling: 'Fort Sterling',
  thetford: 'Thetford',
  caerleon: 'Caerleon',
  brecilien: 'Brecilien',
}

export const REFINING_CITIES = Object.keys(
  REFINING_CITY_LABELS,
) as readonly RefiningCityId[]

export function getRefiningResource(
  kind: RefiningResourceKind,
): RefiningResourceDefinition {
  return REFINING_RESOURCES.find((resource) => resource.kind === kind) ?? REFINING_RESOURCES[0]
}

export function getMaximumRefiningEnchantment(
  resource: RefiningResourceDefinition,
  tier: RefiningTier,
): RefiningEnchantment {
  return tier < 4 ? 0 : resource.maximumEnchantment
}

export function normalizeRefiningEnchantment(
  resource: RefiningResourceDefinition,
  tier: RefiningTier,
  enchantment: number,
): RefiningEnchantment {
  const maximum = getMaximumRefiningEnchantment(resource, tier)
  return Math.min(maximum, Math.max(0, Math.floor(enchantment))) as RefiningEnchantment
}

function buildItemId(tier: RefiningTier, suffix: string): BaseItemId {
  return asBaseItemId(`T${tier}_${suffix}`)
}

export function getRefiningRecipe(params: {
  readonly resourceKind: RefiningResourceKind
  readonly tier: RefiningTier
  readonly enchantment: RefiningEnchantment
}): RefiningRecipeDefinition {
  const resource = getRefiningResource(params.resourceKind)
  const enchantment = normalizeRefiningEnchantment(
    resource,
    params.tier,
    params.enchantment,
  )
  const isStone = resource.kind === 'rock'
  const stoneMultiplier = isStone && enchantment > 0 ? 2 ** enchantment : 1
  const outputPerCraft = stoneMultiplier
  const previousRefinedPerCraft = params.tier === 2 ? 0 : stoneMultiplier
  const previousTier = Math.max(2, params.tier - 1) as RefiningTier
  const previousRefinedEnchantment =
    params.tier <= 4 || isStone ? 0 : enchantment
  const outputEnchantment = isStone ? 0 : enchantment
  const focusTable = isStone
    ? STONE_REFINING_FOCUS_COST
    : STANDARD_REFINING_FOCUS_COST
  const baseFocusPerCraft = focusTable[params.tier][enchantment] ?? focusTable[params.tier][0]
  const itemValueMultiplier = isStone ? stoneMultiplier : 2 ** enchantment

  return {
    tier: params.tier,
    enchantment,
    rawItemId: buildItemId(params.tier, resource.rawItemSuffix),
    rawEnchantment: enchantment,
    previousRefinedItemId:
      params.tier === 2
        ? null
        : buildItemId(previousTier, resource.refinedItemSuffix),
    previousRefinedEnchantment,
    outputItemId: buildItemId(params.tier, resource.refinedItemSuffix),
    outputEnchantment,
    rawPerCraft: RAW_RESOURCE_PER_CRAFT[params.tier],
    previousRefinedPerCraft,
    outputPerCraft,
    baseFocusPerCraft,
    itemValuePerCraft:
      REFINING_ITEM_VALUE_BY_TIER[params.tier] * itemValueMultiplier,
  }
}

/**
 * Cada nivel del nodo objetivo aporta 250 únicos + 30 compartidos.
 * Cada nivel de los otros cuatro nodos aporta 30 compartidos.
 */
export function calculateRefiningFocusCostEfficiency(params: {
  readonly selectedTierLevel: number
  readonly otherTierLevelsTotal: number
}): number {
  const selectedTierLevel = Math.min(100, Math.max(0, Math.floor(params.selectedTierLevel)))
  const otherTierLevelsTotal = Math.min(
    400,
    Math.max(0, Math.floor(params.otherTierLevelsTotal)),
  )
  return selectedTierLevel * 280 + otherTierLevelsTotal * 30
}
