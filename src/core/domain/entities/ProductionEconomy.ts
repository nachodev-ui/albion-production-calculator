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

export interface StationUsageFeeOverride {
  /** Total Cost mostrado por Albion para el lote usado como referencia. */
  readonly totalFee: number
  /** Cantidad de objetos terminados incluida en el Total Cost ingresado. */
  readonly quantity: number
  /** Cantidad de tiradas incluida en el Total Cost ingresado. */
  readonly craftsNeeded: number
}

export type StationFeeSource = 'manual_total' | 'estimated'

export interface StationFeeBreakdown {
  readonly station: CraftingStation
  readonly accessType: StationAccessType
  readonly source: StationFeeSource
  readonly itemValue: number
  readonly itemValueSource: 'dataset' | 'manual' | 'missing'
  readonly quantity: number
  readonly craftsNeeded: number
  readonly nutritionPerCraft: number
  readonly nutritionTotal: number
  readonly feePer100Nutrition: number
  /** Resultado de la estimación avanzada por nutrición. */
  readonly estimatedTotalFee: number
  /** Total Cost original ingresado por el usuario, antes de escalarlo. */
  readonly manualTotalFee: number | null
  /** Cantidad de objetos asociada al Total Cost original. */
  readonly manualQuantity: number | null
  /** Cantidad de tiradas asociada al Total Cost original. */
  readonly manualCraftsNeeded: number | null
  /** Total Cost directo escalado a la cantidad actual. */
  readonly appliedManualTotalFee: number | null
  /** Costo efectivo que se suma al cálculo. */
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

export const DEFAULT_CRAFTING_SPECIALIZATION_CONFIG: CraftingSpecializationConfig =
  {
    focusCostEfficiency: 0,
    availableFocus: 0,
    qualityIncrease: 0,
  }

export const CRAFTING_STATION_LABELS: Readonly<
  Record<CraftingStation, string>
> = {
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

export function getAppliedStationFeePer100(config: StationFeeConfig): number {
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
  readonly quantity: number
  readonly craftsNeeded: number
  readonly config: StationFeeConfig
  readonly manualOverride?: StationUsageFeeOverride | null
}): StationFeeBreakdown {
  const itemValue = sanitizeNonNegative(params.itemValue)
  const quantity = sanitizeNonNegative(params.quantity)
  const craftsNeeded = sanitizeNonNegative(params.craftsNeeded)
  const nutritionPerCraft = calculateNutritionPerCraft(itemValue)
  const nutritionTotal = nutritionPerCraft * craftsNeeded
  const feePer100Nutrition = getAppliedStationFeePer100(params.config)
  const estimatedTotalFee = (nutritionTotal * feePer100Nutrition) / 100

  const manualOverride = params.manualOverride
  const hasManualOverride =
    manualOverride !== null &&
    manualOverride !== undefined &&
    Number.isFinite(manualOverride.totalFee) &&
    manualOverride.totalFee >= 0 &&
    Number.isFinite(manualOverride.craftsNeeded) &&
    manualOverride.craftsNeeded > 0

  const manualTotalFee = hasManualOverride
    ? sanitizeNonNegative(manualOverride.totalFee)
    : null
  const manualQuantity = hasManualOverride
    ? sanitizeNonNegative(manualOverride.quantity)
    : null
  const manualCraftsNeeded = hasManualOverride
    ? sanitizeNonNegative(manualOverride.craftsNeeded)
    : null
  const appliedManualTotalFee =
    manualTotalFee !== null &&
    manualCraftsNeeded !== null &&
    manualCraftsNeeded > 0
      ? manualTotalFee * (craftsNeeded / manualCraftsNeeded)
      : null
  const source: StationFeeSource =
    appliedManualTotalFee !== null ? 'manual_total' : 'estimated'
  const totalFee = appliedManualTotalFee ?? estimatedTotalFee

  return {
    station: params.station,
    accessType: params.config.accessType,
    source,
    itemValue,
    itemValueSource: params.itemValueSource,
    quantity,
    craftsNeeded,
    nutritionPerCraft,
    nutritionTotal,
    feePer100Nutrition,
    estimatedTotalFee,
    manualTotalFee,
    manualQuantity,
    manualCraftsNeeded,
    appliedManualTotalFee,
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
