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
 * Los Hideouts usan la tabla oficial por calidad de zona y nivel de poder.
 * El bono diario se incorpora después mediante la misma conversión de
 * Production Bonus utilizada por el resto de ubicaciones.
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
  /** Isla personal/de gremio: sin bono de producción local. */
  readonly isIsland: boolean
  /** Hideout de Roads/Outlands con tabla propia de retorno. */
  readonly isHideout: boolean
  /** Calidad de la zona del Hideout, de 1 a 6. */
  readonly hideoutZoneQuality: HideoutZoneQuality
  /** Nivel de poder/energía del Hideout, de 1 a 9. */
  readonly hideoutPowerLevel: HideoutPowerLevel
}

const BASE_CITY_PRODUCTION_BONUS = 0.18
const REFINING_SPECIALTY_BONUS = 0.4
const CRAFTING_SPECIALTY_BONUS = 0.15
const FOCUS_BONUS = 0.59

/** Calcula el Local Production Bonus de ciudad/isla antes de convertirlo a RRR. */
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

/** Convierte la configuración de producción en el RRR efectivo. */
export function calculateReturnRate(params: ReturnRateParams): number {
  if (params.isHideout) {
    return calculateHideoutReturnRate({
      zoneQuality: params.hideoutZoneQuality,
      powerLevel: params.hideoutPowerLevel,
      useFocus: params.useFocus,
      dailyBonus: params.hasDailyBonus ? params.dailyBonusAmount : 0,
    })
  }

  const lpb = calculateLocalProductionBonus(params)
  return 1 - 1 / (1 + lpb)
}
