import { describe, expect, it } from 'vitest'
import {
  HIDEOUT_BASE_PRODUCTION_BONUS,
  HIDEOUT_POWER_PROFILES,
} from './Hideout'
import {
  calculateReturnRate,
  calculateReturnRateBreakdown,
} from './ReturnRate'

const baseConfig = {
  hasSpecialtyBonus: false,
  specialtyKind: 'crafting' as const,
  useFocus: false,
  hasDailyBonus: false,
  dailyBonusAmount: 0.1 as const,
  isIsland: false,
}

describe('ReturnRate', () => {
  it('mantiene la fórmula urbana existente', () => {
    const result = calculateReturnRate({
      ...baseConfig,
      hasSpecialtyBonus: true,
    })

    expect(result).toBeCloseTo(0.33 / 1.33, 10)
  })

  it('aplica el bono base y generalista de un Hideout nivel 1', () => {
    const breakdown = calculateReturnRateBreakdown({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 1,
    })

    expect(breakdown.baseProductionBonus).toBe(
      HIDEOUT_BASE_PRODUCTION_BONUS,
    )
    expect(breakdown.hideoutGeneralistBonus).toBe(0)
    expect(breakdown.totalProductionBonus).toBe(0.15)
    expect(breakdown.returnRate).toBeCloseTo(0.15 / 1.15, 10)
  })

  it('alcanza 50% de RRR en un Hideout nivel 9 usando foco', () => {
    const breakdown = calculateReturnRateBreakdown({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 9,
      useFocus: true,
    })

    expect(breakdown.hideoutGeneralistBonus).toBe(0.26)
    expect(breakdown.focusBonus).toBe(0.59)
    expect(breakdown.totalProductionBonus).toBeCloseTo(1, 10)
    expect(breakdown.returnRate).toBeCloseTo(0.5, 10)
  })

  it('no suma el bono especialista nuevamente al RRR', () => {
    const normal = calculateReturnRate({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutSpecialized: false,
    })
    const specialized = calculateReturnRate({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutSpecialized: true,
    })

    expect(specialized).toBe(normal)
  })

  it('representa los nueve niveles oficiales en orden creciente', () => {
    expect(HIDEOUT_POWER_PROFILES.map((profile) => profile.level)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ])
    expect(
      HIDEOUT_POWER_PROFILES.map(
        (profile) => profile.generalistCraftingBonus,
      ),
    ).toEqual([0, 0.06, 0.11, 0.15, 0.18, 0.2, 0.22, 0.24, 0.26])
    expect(
      HIDEOUT_POWER_PROFILES.map(
        (profile) => profile.specialistCraftingBonus,
      ),
    ).toEqual([
      0,
      0.0375,
      0.075,
      0.1125,
      0.15,
      0.1875,
      0.225,
      0.2625,
      0.3,
    ])
  })
})
