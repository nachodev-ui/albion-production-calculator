import { describe, expect, it } from 'vitest'
import {
  calculateRefiningFocusCostEfficiency,
  getRefiningResource,
  type RefiningTier,
} from '../config/refiningGameConfig'
import {
  calculateRefiningMultilevelPlan,
  rankRefiningMultilevelRoutes,
  type RefiningPlannerPriceResolver,
} from './refiningMultilevelPlanner'

const FREE_STATION = {
  accessType: 'free' as const,
  userFeePer100Nutrition: 0,
  associateFeePer100Nutrition: 0,
}

function constantPriceResolver(
  purchasePrice = 100,
  salePrice = 500,
): RefiningPlannerPriceResolver {
  return ({ operation }) =>
    operation === 'purchase' ? purchasePrice : salePrice
}

function buildFocusEfficiencyByTier(): ReadonlyMap<RefiningTier, number> {
  const levels = new Map<RefiningTier, number>([
    [4, 100],
    [5, 80],
    [6, 60],
    [7, 40],
    [8, 20],
  ])

  return new Map(
    Array.from(levels.entries()).map(([tier, selectedTierLevel]) => [
      tier,
      calculateRefiningFocusCostEfficiency({
        selectedTierLevel,
        otherTierLevelsTotal: Array.from(levels.entries()).reduce(
          (total, [otherTier, level]) =>
            otherTier === tier ? total : total + level,
          0,
        ),
      }),
    ]),
  )
}

describe('calculateRefiningMultilevelPlan', () => {
  it('builds a reusable T4→T6 chain and only buys the T3 base refined input', () => {
    const result = calculateRefiningMultilevelPlan({
      resource: getRefiningResource('ore'),
      targetTier: 6,
      enchantment: 1,
      requestedOutputQuantity: 100,
      purchaseCity: 'martlock',
      refiningCity: 'thetford',
      saleCity: 'lymhurst',
      focusedTiers: new Set(),
      focusCostEfficiencyByTier: new Map(),
      silverPerFocus: 0,
      stationFeeConfig: FREE_STATION,
      isPremium: true,
      transportCostPerLeg: 1_000,
      resolvePrice: constantPriceResolver(),
    })

    expect(result.isComplete).toBe(true)
    expect(result.steps.map((step) => step.tier)).toEqual([4, 5, 6])
    expect(result.steps[2]?.productionObtained).toBe(100)
    expect(result.steps[1]?.productionObtained).toBe(
      Math.ceil(result.steps[2]?.netPreviousRefinedConsumed ?? 0),
    )
    expect(result.steps[0]?.productionObtained).toBe(
      Math.ceil(result.steps[1]?.netPreviousRefinedConsumed ?? 0),
    )
    expect(
      result.purchases.filter((line) => line.kind === 'base-refined'),
    ).toHaveLength(1)
    expect(result.purchases.some((line) => line.tier === 3)).toBe(true)
    expect(result.transportLegs).toBe(2)
    expect(result.transportCost).toBe(2_000)
  })

  it('reports silver per focus for every tier and applies opportunity cost', () => {
    const focusedTiers = new Set<RefiningTier>([4, 5, 6, 7, 8])
    const result = calculateRefiningMultilevelPlan({
      resource: getRefiningResource('fiber'),
      targetTier: 8,
      enchantment: 0,
      requestedOutputQuantity: 100,
      purchaseCity: 'bridgewatch',
      refiningCity: 'lymhurst',
      saleCity: 'fort_sterling',
      focusedTiers,
      focusCostEfficiencyByTier: buildFocusEfficiencyByTier(),
      silverPerFocus: 2,
      stationFeeConfig: FREE_STATION,
      isPremium: true,
      transportCostPerLeg: 0,
      resolvePrice: constantPriceResolver(200, 2_000),
    })

    expect(result.totalFocusRequired).toBeGreaterThan(0)
    expect(result.extraReturnValueFromFocus).toBeGreaterThan(0)
    expect(result.silverPerFocusProduced).toBeGreaterThan(0)
    expect(result.focusOpportunityCost).toBe(result.totalFocusRequired * 2)
    expect(result.steps.every((step) => step.silverPerFocusProduced > 0)).toBe(
      true,
    )
  })

  it('marks the plan incomplete when the final sale city has no price', () => {
    const result = calculateRefiningMultilevelPlan({
      resource: getRefiningResource('hide'),
      targetTier: 4,
      enchantment: 0,
      requestedOutputQuantity: 10,
      purchaseCity: 'martlock',
      refiningCity: 'martlock',
      saleCity: 'brecilien',
      focusedTiers: new Set(),
      focusCostEfficiencyByTier: new Map(),
      silverPerFocus: 0,
      stationFeeConfig: FREE_STATION,
      isPremium: true,
      transportCostPerLeg: 0,
      resolvePrice: ({ operation }) =>
        operation === 'purchase' ? 100 : null,
    })

    expect(result.isComplete).toBe(false)
    expect(result.market).toBeNull()
    expect(result.missingPrices).toHaveLength(1)
    expect(result.missingPrices[0]?.operation).toBe('sale')
  })
})

describe('rankRefiningMultilevelRoutes', () => {
  it('selects independent purchase, refining and sale cities by net profit', () => {
    const resolver: RefiningPlannerPriceResolver = ({ operation, city }) => {
      if (operation === 'purchase') {
        return city === 'martlock' ? 50 : 150
      }
      return city === 'lymhurst' ? 1_000 : 300
    }

    const ranking = rankRefiningMultilevelRoutes({
      resource: getRefiningResource('ore'),
      targetTier: 5,
      enchantment: 0,
      requestedOutputQuantity: 100,
      cities: ['martlock', 'thetford', 'lymhurst'],
      focusedTiers: new Set(),
      focusCostEfficiencyByTier: new Map(),
      silverPerFocus: 0,
      stationFeeConfig: FREE_STATION,
      isPremium: true,
      transportCostPerLeg: 0,
      resolvePrice: resolver,
    })

    expect(ranking.routes).toHaveLength(27)
    expect(ranking.missingRouteCount).toBe(0)
    expect(ranking.bestRoute?.purchaseCity).toBe('martlock')
    expect(ranking.bestRoute?.refiningCity).toBe('thetford')
    expect(ranking.bestRoute?.saleCity).toBe('lymhurst')
  })
})
