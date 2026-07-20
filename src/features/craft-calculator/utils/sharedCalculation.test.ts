import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalculationSummarySnapshot } from './calculationSummary'
import {
  decodeSharedCalculation,
  encodeSharedCalculation,
  isCalculationSummarySnapshot,
} from './sharedCalculation'

const snapshot: CalculationSummarySnapshot = {
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
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('shared calculations', () => {
  it('round-trips a shareable snapshot without compression support', async () => {
    vi.stubGlobal('CompressionStream', undefined)

    const token = await encodeSharedCalculation(snapshot)
    const restored = await decodeSharedCalculation(token)

    expect(token.startsWith('j.')).toBe(true)
    expect(restored).toEqual(snapshot)
  })

  it('rejects objects that do not contain a complete summary', () => {
    expect(isCalculationSummarySnapshot({ itemName: 'Incomplete' })).toBe(false)
    expect(isCalculationSummarySnapshot(snapshot)).toBe(true)
  })

  it('rejects unknown link versions and malformed values', async () => {
    await expect(decodeSharedCalculation('x.invalid')).rejects.toThrow(
      'formato compatible',
    )
  })
})
