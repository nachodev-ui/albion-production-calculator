import { describe, expect, it } from 'vitest'
import {
  HIDEOUT_POWER_PROFILES,
  getHideoutReturnRate,
  returnRateToProductionBonus,
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

  it('usa calidad de zona y energía conjuntamente para un Hideout', () => {
    const qualityOne = calculateReturnRateBreakdown({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 1,
      hideoutZoneQuality: 1,
    })
    const qualitySix = calculateReturnRateBreakdown({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 1,
      hideoutZoneQuality: 6,
    })

    expect(qualityOne.returnRate).toBe(0.2138)
    expect(qualitySix.returnRate).toBe(0.3306)
    expect(qualitySix.returnRate).toBeGreaterThan(qualityOne.returnRate)
    expect(qualityOne.totalProductionBonus).toBeCloseTo(
      returnRateToProductionBonus(0.2138),
      10,
    )
  })

  it('usa la celda exacta de calidad 6 y energía 9 con foco', () => {
    const breakdown = calculateReturnRateBreakdown({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutZoneQuality: 6,
      useFocus: true,
    })

    expect(getHideoutReturnRate(6, 9, true)).toBe(0.6102)
    expect(breakdown.returnRate).toBe(0.6102)
    expect(breakdown.totalProductionBonus).toBeCloseTo(
      returnRateToProductionBonus(0.6102),
      10,
    )
  })

  it('no suma el bono especialista nuevamente al RRR', () => {
    const normal = calculateReturnRate({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutZoneQuality: 4,
      hideoutSpecialized: false,
    })
    const specialized = calculateReturnRate({
      ...baseConfig,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutZoneQuality: 4,
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
