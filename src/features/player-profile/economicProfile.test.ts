import { describe, expect, it } from 'vitest'
import type { SavedCalculation } from '@features/account/api/savedDataApi'
import {
  DEFAULT_ECONOMIC_PROFILE,
  buildFocusRecommendations,
  inferSpecializationBranch,
} from './economicProfile'

const calculation: SavedCalculation = {
  id: 'calculation-1',
  name: 'Bolsa T7.1',
  kind: 'craft',
  createdAt: '2026-07-22T12:00:00.000Z',
  snapshot: {
    generatedAt: '2026-07-22T12:00:00.000Z',
    itemName: 'Bolsa del Gran maestro',
    tier: 7,
    enchantment: 1,
    quantity: 10,
    cityName: 'Bridgewatch',
    hasSpecialtyBonus: true,
    useFocus: true,
    hasDailyBonus: false,
    dailyBonusAmount: 0,
    returnRate: 0.48,
    stationName: "Elder's Toolmaker",
    stationAccessLabel: 'Usuario',
    itemValue: 1000,
    nutritionPerCraft: 112.5,
    nutritionTotal: 1125,
    appliedFeePer100Nutrition: 400,
    stationUsageFee: 4500,
    focusCostEfficiency: 0,
    availableFocus: 10_000,
    qualityIncrease: 0,
    baseFocusPerCraft: 1000,
    effectiveFocusPerCraft: 1000,
    totalFocusRequired: 10_000,
    maxItemsWithAvailableFocus: 10,
    totalCost: 700_000,
    silverSaved: 300_000,
    stationFees: 4500,
    isComplete: true,
    missingPrices: [],
    returnedMaterials: [],
    isPremium: true,
    unitSellPrice: 100_000,
  },
}

describe('economic profile recommendations', () => {
  it('recognizes a crafting branch from the saved item', () => {
    expect(inferSpecializationBranch('Bolsa del Gran maestro')?.key).toBe(
      'bags',
    )
  })

  it('recalculates focus with the current specialization and personal costs', () => {
    const recommendations = buildFocusRecommendations([calculation], {
      ...DEFAULT_ECONOMIC_PROFILE,
      salesTaxRate: 4,
      transportCost: 25_000,
      specializations: [
        {
          branchKey: 'bags',
          branchName: 'Bolsas',
          level: 75,
          focusCostEfficiency: 10_000,
        },
      ],
    })

    expect(recommendations).toHaveLength(1)
    expect(recommendations[0]?.totalFocusRequired).toBe(5000)
    expect(recommendations[0]?.estimatedProfit).toBe(210_000)
    expect(recommendations[0]?.profitPer10kFocus).toBe(420_000)
  })

  it('ignores incomplete or unconfigured branches', () => {
    expect(
      buildFocusRecommendations([calculation], DEFAULT_ECONOMIC_PROFILE),
    ).toEqual([])
  })
})
