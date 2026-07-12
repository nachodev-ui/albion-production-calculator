import {
  BASE_CITY_PRODUCTION_BONUS,
  CRAFTING_SPECIALTY_BONUS,
  FOCUS_BONUS,
  REFINING_SPECIALTY_BONUS,
} from './City'
import {
  DEFAULT_HIDEOUT_POWER_LEVEL,
  DEFAULT_HIDEOUT_ZONE_QUALITY,
  getHideoutPowerProfile,
  getHideoutReturnRate,
  returnRateToProductionBonus,
} from './Hideout'
import type { HideoutPowerLevel, HideoutZoneQuality } from './Hideout'

export interface ReturnRateParams {
  readonly hasSpecialtyBonus: boolean
  readonly specialtyKind: 'refining' | 'crafting'
  readonly useFocus: boolean
  readonly hasDailyBonus: boolean
  readonly dailyBonusAmount: 0.1 | 0.2
  readonly isIsland: boolean
  readonly isHideout?: boolean
  readonly hideoutPowerLevel?: HideoutPowerLevel
  readonly hideoutZoneQuality?: HideoutZoneQuality
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

export function calculateReturnRateBreakdown(
  params: ReturnRateParams,
): ReturnRateBreakdown {
  const isHideout = params.isHideout === true
  const isIsland = !isHideout && params.isIsland
  const dailyBonus = params.hasDailyBonus ? params.dailyBonusAmount : 0

  if (isHideout) {
    const profile = getHideoutPowerProfile(
      params.hideoutPowerLevel ?? DEFAULT_HIDEOUT_POWER_LEVEL,
    )
    const baseReturnRate = getHideoutReturnRate(
      params.hideoutZoneQuality ?? DEFAULT_HIDEOUT_ZONE_QUALITY,
      profile.level,
      params.useFocus,
    )
    const matrixProductionBonus = returnRateToProductionBonus(baseReturnRate)
    const focusBonus = params.useFocus ? FOCUS_BONUS : 0
    const hideoutGeneralistBonus = profile.generalistCraftingBonus
    const baseProductionBonus = Math.max(
      0,
      matrixProductionBonus - hideoutGeneralistBonus - focusBonus,
    )
    const totalProductionBonus = matrixProductionBonus + dailyBonus

    return {
      baseProductionBonus,
      specialtyBonus: 0,
      hideoutGeneralistBonus,
      focusBonus,
      dailyBonus,
      totalProductionBonus,
      returnRate:
        totalProductionBonus > 0
          ? totalProductionBonus / (1 + totalProductionBonus)
          : 0,
    }
  }

  const baseProductionBonus = isIsland ? 0 : BASE_CITY_PRODUCTION_BONUS
  const specialtyBonus =
    !isIsland && params.hasSpecialtyBonus
      ? params.specialtyKind === 'refining'
        ? REFINING_SPECIALTY_BONUS
        : CRAFTING_SPECIALTY_BONUS
      : 0
  const focusBonus = params.useFocus ? FOCUS_BONUS : 0
  const totalProductionBonus =
    baseProductionBonus + specialtyBonus + focusBonus + dailyBonus

  return {
    baseProductionBonus,
    specialtyBonus,
    hideoutGeneralistBonus: 0,
    focusBonus,
    dailyBonus,
    totalProductionBonus,
    returnRate:
      totalProductionBonus > 0
        ? totalProductionBonus / (1 + totalProductionBonus)
        : 0,
  }
}

export function calculateReturnRate(params: ReturnRateParams): number {
  return calculateReturnRateBreakdown(params).returnRate
}
