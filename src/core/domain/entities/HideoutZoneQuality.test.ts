import { describe, expect, it } from 'vitest'
import {
  getHideoutReturnRate,
  returnRateToProductionBonus,
} from './Hideout'
import { calculateReturnRate } from './ReturnRate'

describe('Hideout zone quality', () => {
  it('resuelve los extremos de la matriz sin foco', () => {
    expect(getHideoutReturnRate(1, 1, false)).toBe(0.2138)
    expect(getHideoutReturnRate(6, 9, false)).toBe(0.4658)
  })

  it('resuelve los extremos de la matriz con foco', () => {
    expect(getHideoutReturnRate(1, 1, true)).toBe(0.4378)
    expect(getHideoutReturnRate(6, 9, true)).toBe(0.6102)
  })

  it('aplica el bono diario sobre el bono equivalente', () => {
    const baseRrr = getHideoutReturnRate(4, 7, false)
    const expectedBonus = returnRateToProductionBonus(baseRrr) + 0.2
    const expectedRrr = expectedBonus / (1 + expectedBonus)

    expect(
      calculateReturnRate({
        cityId: 'hideout',
        isIsland: false,
        isHideout: true,
        hideoutPowerLevel: 7,
        hideoutZoneQuality: 4,
        hideoutSpecialized: false,
        hasSpecialtyBonus: false,
        specialtyKind: 'crafting',
        useFocus: false,
        hasDailyBonus: true,
        dailyBonusAmount: 0.2,
      }),
    ).toBeCloseTo(expectedRrr, 12)
  })
})
