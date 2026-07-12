import {
  calculateHideoutReturnRate,
  type HideoutPowerLevel,
  type HideoutZoneQuality,
} from './Hideout'

/**
 * Parámetros que determinan el Resource Return Rate (RRR) de un crafteo.
 *
 * Para ciudades e islas:
 *   RRR = 1 - 1 / (1 + LPB + Focus + DailyBonus)
 *
 * Los Hideouts usan la tabla por calidad de zona y nivel de poder. Sus campos
 * son opcionales para migrar sin invalidar presets guardados antes de esta
 * funcionalidad.
 */
export interface ReturnRateParams {
  readonly hasSpecialtyBonus: boolean
  readonly specialtyKind: 'refining' | 'crafting'
  readonly useFocus: boolean
  readonly hasDailyBonus: boolean
  readonly dailyBonusAmount: 0.1 | 0.2
  readonly isIsland: boolean
  readonly isHideout?: boolean
  readonly hideoutZoneQuality?: HideoutZoneQuality
  readonly hideoutPowerLevel?: HideoutPowerLevel
}

const BASE_CITY_PRODUCTION_BONUS = 0.18
const REFINING_SPECIALTY_BONUS = 0.4
const CRAFTING_SPECIALTY_BONUS = 0.15
const FOCUS_BONUS = 0.59

function calculateLocalProductionBonus(params: ReturnRateParams): number {
  const base = params.isIsland ? 0 : BASE_CITY_PRODUCTION_BONUS
  const specialty = params.hasSpecialtyBonus
    ? params.specialtyKind === 'refining'
      ? REFINING_SPECIALTY_BONUS
      : CRAFTING_SPECIALTY_BONUS
    : 0
  const focus = params.useFocus ? FOCUS_BONUS : 0
  const daily = params.hasDailyBonus ? params.dailyBonusAmount : 0
  return base + specialty + focus + daily
}

export function calculateReturnRate(params: ReturnRateParams): number {
  if (params.isHideout) {
    return calculateHideoutReturnRate({
      zoneQuality: params.hideoutZoneQuality ?? 1,
      powerLevel: params.hideoutPowerLevel ?? 1,
      useFocus: params.useFocus,
      dailyBonus: params.hasDailyBonus ? params.dailyBonusAmount : 0,
    })
  }

  const lpb = calculateLocalProductionBonus(params)
  return 1 - 1 / (1 + lpb)
}
