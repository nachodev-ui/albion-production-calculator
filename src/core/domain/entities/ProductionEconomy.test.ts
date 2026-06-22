import { describe, expect, it } from 'vitest'
import {
  calculateEffectiveFocusCost,
  calculateFocusCostBreakdown,
  calculateNutritionPerCraft,
  calculateStationUsageFee,
} from './ProductionEconomy'

describe('ProductionEconomy', () => {
  it('calcula nutrición desde Item Value', () => {
    expect(calculateNutritionPerCraft(8_000)).toBe(900)
  })

  it('aplica la tarifa de usuario por cada 100 de nutrición', () => {
    const result = calculateStationUsageFee({
      station: 'warrior_forge',
      itemValue: 8_000,
      itemValueSource: 'manual',
      craftsNeeded: 10,
      config: {
        accessType: 'user',
        userFeePer100Nutrition: 450,
        associateFeePer100Nutrition: 250,
      },
    })

    expect(result.nutritionTotal).toBe(9_000)
    expect(result.totalFee).toBe(40_500)
  })

  it('usa tarifa de asociado y permite una estación gratuita', () => {
    const base = {
      station: 'hunter_lodge' as const,
      itemValue: 1_000,
      itemValueSource: 'dataset' as const,
      craftsNeeded: 2,
    }

    expect(
      calculateStationUsageFee({
        ...base,
        config: {
          accessType: 'associate',
          userFeePer100Nutrition: 500,
          associateFeePer100Nutrition: 200,
        },
      }).totalFee,
    ).toBe(450)

    expect(
      calculateStationUsageFee({
        ...base,
        config: {
          accessType: 'free',
          userFeePer100Nutrition: 500,
          associateFeePer100Nutrition: 200,
        },
      }).totalFee,
    ).toBe(0)
  })

  it('reduce el costo de foco a la mitad cada 10.000 de eficiencia', () => {
    expect(calculateEffectiveFocusCost(1_000, 0)).toBe(1_000)
    expect(calculateEffectiveFocusCost(1_000, 10_000)).toBe(500)
    expect(calculateEffectiveFocusCost(1_000, 20_000)).toBe(250)
  })

  it('calcula foco total y cantidad máxima de objetos', () => {
    const result = calculateFocusCostBreakdown({
      baseFocusPerCraft: 1_000,
      craftsNeeded: 10,
      outputQuantity: 1,
      useFocus: true,
      config: {
        focusCostEfficiency: 10_000,
        availableFocus: 10_000,
        qualityIncrease: 6.05,
      },
    })

    expect(result.effectiveFocusPerCraft).toBe(500)
    expect(result.totalFocusRequired).toBe(5_000)
    expect(result.maxItemsWithAvailableFocus).toBe(20)
  })
})
