import type { CraftingStation } from './Recipe'

export type StationAccessType = 'user' | 'associate' | 'free'

export interface StationFeeConfig {
  readonly accessType: StationAccessType
  readonly userFeePer100Nutrition: number
  readonly associateFeePer100Nutrition: number
}

export interface CraftingSpecializationConfig {
  /** Total visible en "Bonus to Focus Cost Efficiency" del Destiny Board. */
  readonly focusCostEfficiency: number
  /** Foco disponible actualmente en la cuenta. */
  readonly availableFocus: number
  /** Bono visible de aumento de calidad. Informativo por ahora. */
  readonly qualityIncrease: number
}

export interface StationFeeBreakdown {
  readonly station: CraftingStation
  readonly accessType: StationAccessType
  readonly itemValue: number
  readonly itemValueSource: 'dataset' | 'manual' | 'missing'
  readonly nutritionPerCraft: number
  readonly nutritionTotal: number
  readonly feePer100Nutrition: number
  readonly totalFee: number
}

export interface FocusCostBreakdown {
  readonly baseFocusPerCraft: number
  readonly effectiveFocusPerCraft: number
  readonly craftsNeeded: number
  readonly totalFocusRequired: number
  readonly availableFocus: number
  readonly maxCraftsWithAvailableFocus: number
  readonly maxItemsWithAvailableFocus: number
  readonly focusCostEfficiency: number
  readonly qualityIncrease: number
  readonly useFocus: boolean
}

export const DEFAULT_STATION_FEE_CONFIG: StationFeeConfig = {
  accessType: 'user',
  userFeePer100Nutrition: 0,
  associateFeePer100Nutrition: 0,
}

export const DEFAULT_CRAFTING_SPECIALIZATION_CONFIG: CraftingSpecializationConfig = {
  focusCostEfficiency: 0,
  availableFocus: 0,
  qualityIncrease: 0,
}

export const CRAFTING_STATION_LABELS: Readonly<Record<CraftingStation, string>> = {
  warrior_forge: "Elder's Warrior's Forge",
  hunter_lodge: "Elder's Hunter's Lodge",
  mage_tower: "Elder's Mage Tower",
  toolmaker: "Elder's Toolmaker",
  magic_wardrobe: "Elder's Magic Wardrobe",
  refining: 'Estación de refinado',
  cooking: "Elder's Cook",
  alchemy: "Elder's Alchemist",
  farming: 'Granja',
  unknown: 'Puesto no identificado',
}

function sanitizeNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function getAppliedStationFeePer100(
  config: StationFeeConfig,
): number {
  if (config.accessType === 'free') return 0

  return sanitizeNonNegative(
    config.accessType === 'associate'
      ? config.associateFeePer100Nutrition
      : config.userFeePer100Nutrition,
  )
}

/** Albion consume 0,1125 de nutrición por cada punto de Item Value. */
export function calculateNutritionPerCraft(itemValue: number): number {
  return sanitizeNonNegative(itemValue) * 0.1125
}

export function calculateStationUsageFee(params: {
  readonly station: CraftingStation
  readonly itemValue: number
  readonly itemValueSource: StationFeeBreakdown['itemValueSource']
  readonly craftsNeeded: number
  readonly config: StationFeeConfig
}): StationFeeBreakdown {
  const itemValue = sanitizeNonNegative(params.itemValue)
  const craftsNeeded = sanitizeNonNegative(params.craftsNeeded)
  const nutritionPerCraft = calculateNutritionPerCraft(itemValue)
  const nutritionTotal = nutritionPerCraft * craftsNeeded
  const feePer100Nutrition = getAppliedStationFeePer100(params.config)
  const totalFee = (nutritionTotal * feePer100Nutrition) / 100

  return {
    station: params.station,
    accessType: params.config.accessType,
    itemValue,
    itemValueSource: params.itemValueSource,
    nutritionPerCraft,
    nutritionTotal,
    feePer100Nutrition,
    totalFee,
  }
}

/** Cada 10.000 puntos de eficiencia reducen el costo de foco a la mitad. */
export function calculateEffectiveFocusCost(
  baseFocusCost: number,
  focusCostEfficiency: number,
): number {
  const base = sanitizeNonNegative(baseFocusCost)
  const efficiency = sanitizeNonNegative(focusCostEfficiency)

  if (base === 0) return 0

  return Math.max(1, Math.ceil(base / Math.pow(2, efficiency / 10_000)))
}

export function calculateFocusCostBreakdown(params: {
  readonly baseFocusPerCraft: number
  readonly craftsNeeded: number
  readonly outputQuantity: number
  readonly useFocus: boolean
  readonly config: CraftingSpecializationConfig
}): FocusCostBreakdown {
  const craftsNeeded = sanitizeNonNegative(params.craftsNeeded)
  const outputQuantity = Math.max(1, sanitizeNonNegative(params.outputQuantity))
  const availableFocus = sanitizeNonNegative(params.config.availableFocus)
  const effectiveFocusPerCraft = calculateEffectiveFocusCost(
    params.baseFocusPerCraft,
    params.config.focusCostEfficiency,
  )
  const maxCraftsWithAvailableFocus =
    effectiveFocusPerCraft > 0
      ? Math.floor(availableFocus / effectiveFocusPerCraft)
      : 0

  return {
    baseFocusPerCraft: sanitizeNonNegative(params.baseFocusPerCraft),
    effectiveFocusPerCraft,
    craftsNeeded,
    totalFocusRequired: params.useFocus
      ? effectiveFocusPerCraft * craftsNeeded
      : 0,
    availableFocus,
    maxCraftsWithAvailableFocus,
    maxItemsWithAvailableFocus: maxCraftsWithAvailableFocus * outputQuantity,
    focusCostEfficiency: sanitizeNonNegative(params.config.focusCostEfficiency),
    qualityIncrease: sanitizeNonNegative(params.config.qualityIncrease),
    useFocus: params.useFocus,
  }
}
