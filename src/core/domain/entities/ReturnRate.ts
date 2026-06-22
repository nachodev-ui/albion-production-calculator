/**
 * Parámetros que determinan el Resource Return Rate (RRR) de un crafteo.
 *
 * Fórmula verificada (wiki + foro oficial de Albion):
 *   RRR = 1 - 1 / (1 + LPB + Focus + DailyBonus)
 *
 * Donde LPB (Local Production Bonus) es el bono base de ciudad (+18%)
 * más el bono de especialidad si aplica (+40% refinado, +15% crafteo).
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
    /**
     * Islas no dan bono de producción local (LPB = 0), a diferencia de
     * cualquier ciudad real (LPB base = 18%).
     */
    readonly isIsland: boolean
  }
  
  const BASE_CITY_PRODUCTION_BONUS = 0.18
  const REFINING_SPECIALTY_BONUS = 0.4
  const CRAFTING_SPECIALTY_BONUS = 0.15
  const FOCUS_BONUS = 0.59
  
  /**
   * Calcula el Local Production Bonus total (LPB) a partir de sus
   * componentes, antes de convertirlo a RRR.
   */
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
  
  /**
   * Convierte el Local Production Bonus en Resource Return Rate (RRR),
   * el porcentaje real de materiales que se recuperan al craftear.
   */
  export function calculateReturnRate(params: ReturnRateParams): number {
    const lpb = calculateLocalProductionBonus(params)
    return 1 - 1 / (1 + lpb)
  }