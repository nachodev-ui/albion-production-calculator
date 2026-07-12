import {
  BASE_CITY_PRODUCTION_BONUS,
  CRAFTING_SPECIALTY_BONUS,
  FOCUS_BONUS,
  REFINING_SPECIALTY_BONUS,
} from './City'
import {
  DEFAULT_HIDEOUT_POWER_LEVEL,
  HIDEOUT_BASE_PRODUCTION_BONUS,
  getHideoutPowerProfile,
} from './Hideout'
import type { HideoutPowerLevel } from './Hideout'

/**
 * Parámetros que determinan el Resource Return Rate (RRR) de un crafteo.
 *
 * Fórmula:
 *   RRR = TotalProductionBonus / (1 + TotalProductionBonus)
 *
 * El bono total puede contener la base de ciudad o Hideout, especialidad de
 * ciudad, nivel de energía del Hideout, foco y bono diario.
 */
export interface ReturnRateParams {
  /** true si la ciudad elegida tiene bono de especialidad para este ítem. */
  readonly hasSpecialtyBonus: boolean
  /** Si la especialidad es de refinado (+40%) o de crafteo de equipo (+15%). */
  readonly specialtyKind: 'refining' | 'crafting'
  /** true si se craftea usando Foco. */
  readonly useFocus: boolean
  /** true si el ítem tiene bono de producción diario activo. */
  readonly hasDailyBonus: boolean
  /** Magnitud del bono diario, solo relevante si `hasDailyBonus` es true. */
  readonly dailyBonusAmount: 0.1 | 0.2
  /** Islas personales/de gremio no tienen bono de producción local. */
  readonly isIsland: boolean
  /** Hideout de zona negra con bono base y nivel de energía propio. */
  readonly isHideout?: boolean
  /** Nivel de energía/poder actual del Hideout, entre 1 y 9. */
  readonly hideoutPowerLevel?: HideoutPowerLevel
  /** El Hideout está especializado para el objeto producido. */
  readonly hideoutSpecialized?: boolean
}

export interface ReturnRateBreakdown {
  readonly baseProductionBonus: number
  readonly specialtyBonus: number
  readonly hideoutGeneralistBonus: number
  readonly focusBonus: number
  readonly dailyBonus: number
  readonly totalProductionBonus: number
  readonly returnRate: number
}

/**
 * Desglosa todos los componentes del bono de producción antes de convertirlos
 * al porcentaje real de materiales retornados.
 */
export function calculateReturnRateBreakdown(
  params: ReturnRateParams,
): ReturnRateBreakdown {
  const isHideout = params.isHideout === true
  const isIsland = !isHideout && params.isIsland
  const hideoutProfile = getHideoutPowerProfile(
    params.hideoutPowerLevel ?? DEFAULT_HIDEOUT_POWER_LEVEL,
  )

  const baseProductionBonus = isHideout
    ? HIDEOUT_BASE_PRODUCTION_BONUS
    : isIsland
      ? 0
      : BASE_CITY_PRODUCTION_BONUS

  const specialtyBonus =
    !isIsland && !isHideout && params.hasSpecialtyBonus
      ? params.specialtyKind === 'refining'
        ? REFINING_SPECIALTY_BONUS
        : CRAFTING_SPECIALTY_BONUS
      : 0

  const hideoutGeneralistBonus = isHideout
    ? hideoutProfile.generalistCraftingBonus
    : 0
  const focusBonus = params.useFocus ? FOCUS_BONUS : 0
  const dailyBonus = params.hasDailyBonus ? params.dailyBonusAmount : 0
  const totalProductionBonus =
    baseProductionBonus +
    specialtyBonus +
    hideoutGeneralistBonus +
    focusBonus +
    dailyBonus
  const returnRate =
    totalProductionBonus > 0
      ? totalProductionBonus / (1 + totalProductionBonus)
      : 0

  return {
    baseProductionBonus,
    specialtyBonus,
    hideoutGeneralistBonus,
    focusBonus,
    dailyBonus,
    totalProductionBonus,
    returnRate,
  }
}

/** Convierte el bono de producción total en Resource Return Rate. */
export function calculateReturnRate(params: ReturnRateParams): number {
  return calculateReturnRateBreakdown(params).returnRate
}
