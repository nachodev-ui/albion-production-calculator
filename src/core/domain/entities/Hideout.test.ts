import { describe, expect, it } from 'vitest'
import {
  calculateHideoutReturnRate,
  getHideoutBaseReturnRate,
  returnRateToProductionBonus,
} from './Hideout'
import { calculateReturnRate } from './ReturnRate'

describe('Hideout resource return rate', () => {
  it('resuelve valores representativos de la matriz sin foco', () => {
    expect(getHideoutBaseReturnRate(1, 1, false)).toBe(0.2138)
    expect(getHideoutBaseReturnRate(6, 9, false)).toBe(0.4658)
  })

  it('resuelve valores representativos de la matriz con foco', () => {
    expect(getHideoutBaseReturnRate(1, 1, true)).toBe(0.4378)
    expect(getHideoutBaseReturnRate(6, 9, true)).toBe(0.6102)
  })

  it('convierte el retorno a bono equivalente y aplica bono diario', () => {
    const base = getHideoutBaseReturnRate(4, 7, false)
    const equivalentBonus = returnRateToProductionBonus(base)
    const expected = 1 - 1 / (1 + equivalentBonus + 0.2)

    expect(
      calculateHideoutReturnRate({
        zoneQuality: 4,
        powerLevel: 7,
        useFocus: false,
        dailyBonus: 0.2,
      }),
    ).toBeCloseTo(expected, 12)
  })

  it('integra Hideout en el cálculo global', () => {
    expect(
      calculateReturnRate({
        isIsland: false,
        isHideout: true,
        hideoutZoneQuality: 6,
        hideoutPowerLevel: 9,
        hasSpecialtyBonus: false,
        specialtyKind: 'crafting',
        useFocus: true,
        hasDailyBonus: false,
        dailyBonusAmount: 0.1,
      }),
    ).toBe(0.6102)
  })

  it('mantiene sin cambios la fórmula de ciudades e islas', () => {
    expect(
      calculateReturnRate({
        isIsland: false,
        hasSpecialtyBonus: false,
        specialtyKind: 'crafting',
        useFocus: false,
        hasDailyBonus: false,
        dailyBonusAmount: 0.1,
      }),
    ).toBeCloseTo(1 - 1 / 1.18, 12)

    expect(
      calculateReturnRate({
        isIsland: true,
        hasSpecialtyBonus: false,
        specialtyKind: 'crafting',
        useFocus: false,
        hasDailyBonus: false,
        dailyBonusAmount: 0.1,
      }),
    ).toBe(0)
  })
})
