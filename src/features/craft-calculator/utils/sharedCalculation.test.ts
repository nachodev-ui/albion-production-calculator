import { describe, expect, it } from 'vitest'
import type { SavedCalculationSnapshot } from './savedCalculationSnapshot'
import {
  decodeSharedCalculation,
  encodeSharedCalculation,
  isCalculationSummarySnapshot,
} from './sharedCalculation'

const snapshot: SavedCalculationSnapshot = {
  generatedAt: '2026-07-20T12:00:00.000Z',
  itemName: 'Espada del Anciano',
  tier: 8,
  enchantment: 2,
  quantity: 10,
  cityName: 'Lymhurst',
  hasSpecialtyBonus: true,
  useFocus: true,
  hasDailyBonus: false,
  dailyBonusAmount: 0.1,
  returnRate: 0.48,
  stationName: "Elder's Warrior's Forge",
  stationAccessLabel: 'Usuario',
  itemValue: 8000,
  nutritionPerCraft: 900,
  nutritionTotal: 9000,
  appliedFeePer100Nutrition: 450,
  stationUsageFee: 40_500,
  focusCostEfficiency: 24_000,
  availableFocus: 10_000,
  qualityIncrease: 6.05,
  baseFocusPerCraft: 1000,
  effectiveFocusPerCraft: 190,
  totalFocusRequired: 1900,
  maxItemsWithAvailableFocus: 52,
  totalCost: 935_000,
  silverSaved: 215_000,
  stationFees: 25_000,
  isComplete: true,
  missingPrices: [],
  returnedMaterials: [
    {
      name: 'Lingote de acero',
      enchantment: 2,
      grossQuantity: 100,
      returnedQuantity: 48,
      netQuantity: 52,
      silverValue: 215_000,
    },
  ],
  isPremium: true,
  unitSellPrice: 120_000,
  quality: 4,
  usedPrices: [
    {
      name: 'Lingote de acero',
      enchantment: 2,
      quantity: 100,
      unitPrice: 11_500,
      totalCost: 1_150_000,
      source: 'automatic',
    },
  ],
}

describe('shared calculations', () => {
  it('round-trips quality and every material price in a Unicode snapshot', async () => {
    const token = await encodeSharedCalculation(snapshot)
    expect(await decodeSharedCalculation(token)).toEqual(snapshot)
  })

  it('validates the minimum snapshot contract', () => {
    expect(isCalculationSummarySnapshot({ itemName: 'Incomplete' })).toBe(false)
    expect(isCalculationSummarySnapshot(snapshot)).toBe(true)
  })

  it('rejects malformed values', async () => {
    await expect(decodeSharedCalculation('invalid')).rejects.toThrow()
  })
})
