import { describe, expect, it } from 'vitest'
import {
  calculateRefiningFocusCostEfficiency,
  getRefiningRecipe,
  getRefiningResource,
} from '../config/refiningGameConfig'
import { calculateRefiningEconomics } from './refiningEconomics'

describe('refining game configuration', () => {
  it('models a standard enchanted recipe with the previous tier at the same enchantment', () => {
    const recipe = getRefiningRecipe({
      resourceKind: 'ore',
      tier: 5,
      enchantment: 2,
    })

    expect(recipe.rawItemId).toBe('T5_ORE')
    expect(recipe.rawEnchantment).toBe(2)
    expect(recipe.previousRefinedItemId).toBe('T4_METALBAR')
    expect(recipe.previousRefinedEnchantment).toBe(2)
    expect(recipe.outputItemId).toBe('T5_METALBAR')
    expect(recipe.outputEnchantment).toBe(2)
    expect(recipe.rawPerCraft).toBe(3)
    expect(recipe.previousRefinedPerCraft).toBe(1)
    expect(recipe.outputPerCraft).toBe(1)
    expect(recipe.baseFocusPerCraft).toBe(287)
  })

  it('models enchanted stone as multiplied previous blocks and output', () => {
    const recipe = getRefiningRecipe({
      resourceKind: 'rock',
      tier: 5,
      enchantment: 3,
    })

    expect(recipe.rawItemId).toBe('T5_ROCK')
    expect(recipe.rawEnchantment).toBe(3)
    expect(recipe.previousRefinedItemId).toBe('T4_STONEBLOCK')
    expect(recipe.previousRefinedEnchantment).toBe(0)
    expect(recipe.outputItemId).toBe('T5_STONEBLOCK')
    expect(recipe.outputEnchantment).toBe(0)
    expect(recipe.rawPerCraft).toBe(3)
    expect(recipe.previousRefinedPerCraft).toBe(8)
    expect(recipe.outputPerCraft).toBe(8)
    expect(recipe.baseFocusPerCraft).toBe(752)
    expect(recipe.itemValuePerCraft).toBe(256)
  })

  it('derives the full 40,000 focus efficiency from five maxed refining nodes', () => {
    expect(
      calculateRefiningFocusCostEfficiency({
        selectedTierLevel: 100,
        otherTierLevelsTotal: 400,
      }),
    ).toBe(40_000)
  })
})

describe('calculateRefiningEconomics', () => {
  it('compares no-focus and focus profitability without counting returns twice', () => {
    const resource = getRefiningResource('ore')
    const recipe = getRefiningRecipe({
      resourceKind: 'ore',
      tier: 4,
      enchantment: 0,
    })
    const result = calculateRefiningEconomics({
      resource,
      recipe,
      city: 'thetford',
      requestedOutputQuantity: 100,
      prices: {
        rawUnitPrice: 100,
        previousRefinedUnitPrice: 50,
        outputUnitPrice: 300,
      },
      stationFeeConfig: {
        accessType: 'free',
        userFeePer100Nutrition: 0,
        associateFeePer100Nutrition: 0,
      },
      focusCostEfficiency: 0,
      silverPerFocus: 2,
      isPremium: true,
    })

    expect(result.craftsNeeded).toBe(100)
    expect(result.productionObtained).toBe(100)
    expect(result.grossRawRequired).toBe(200)
    expect(result.grossPreviousRefinedRequired).toBe(100)
    expect(result.hasCitySpecialty).toBe(true)
    expect(result.withoutFocus.returnRate).toBeCloseTo(0.58 / 1.58, 8)
    expect(result.withFocus.returnRate).toBeCloseTo(1.17 / 2.17, 8)
    expect(result.withoutFocus.initialInvestment).toBe(25_000)
    expect(result.withFocus.initialInvestment).toBe(25_000)
    expect(result.withFocus.effectiveProductionCost).toBeLessThan(
      result.withoutFocus.effectiveProductionCost,
    )
    expect(result.withFocus.profit).toBeGreaterThan(result.withoutFocus.profit)
    expect(result.focus.totalFocusRequired).toBe(5_400)
    expect(result.focus.extraProfitBeforeFocusValuation).toBeGreaterThan(0)
    expect(result.focus.netFocusValue).toBe(
      result.focus.extraProfitBeforeFocusValuation - 10_800,
    )
  })

  it('uses the normal royal-city return when the resource has no local specialty', () => {
    const resource = getRefiningResource('ore')
    const recipe = getRefiningRecipe({
      resourceKind: 'ore',
      tier: 4,
      enchantment: 0,
    })
    const result = calculateRefiningEconomics({
      resource,
      recipe,
      city: 'martlock',
      requestedOutputQuantity: 1,
      prices: {
        rawUnitPrice: 100,
        previousRefinedUnitPrice: 50,
        outputUnitPrice: 300,
      },
      stationFeeConfig: {
        accessType: 'user',
        userFeePer100Nutrition: 500,
        associateFeePer100Nutrition: 0,
      },
      focusCostEfficiency: 0,
      silverPerFocus: 0,
      isPremium: false,
    })

    expect(result.hasCitySpecialty).toBe(false)
    expect(result.withoutFocus.returnRate).toBeCloseTo(0.18 / 1.18, 8)
    expect(result.withoutFocus.stationFee).toBeCloseTo(9, 8)
  })
})
