import {
  calculateEffectiveFocusCost,
  calculateStationUsageFee,
  type StationFeeConfig,
} from '@core/domain/entities/ProductionEconomy'
import { calculateReturnRateBreakdown } from '@core/domain/entities/ReturnRate'
import type { BaseItemId } from '@core/domain/entities/Item'
import {
  calculateProfitBreakdown,
  type ProfitBreakdown,
} from '@features/craft-calculator/utils/profitCalculations'
import {
  getRefiningRecipe,
  normalizeRefiningEnchantment,
  type RefiningCityId,
  type RefiningEnchantment,
  type RefiningResourceDefinition,
  type RefiningTier,
} from '../config/refiningGameConfig'

export type RefiningPlannerPriceOperation = 'purchase' | 'sale'

export interface RefiningPlannerPriceRequest {
  readonly operation: RefiningPlannerPriceOperation
  readonly city: RefiningCityId
  readonly itemId: BaseItemId
  readonly enchantment: RefiningEnchantment
}

export type RefiningPlannerPriceResolver = (
  request: RefiningPlannerPriceRequest,
) => number | null

export interface RefiningMultilevelPlanInput {
  readonly resource: RefiningResourceDefinition
  readonly targetTier: RefiningTier
  readonly enchantment: RefiningEnchantment
  readonly requestedOutputQuantity: number
  readonly purchaseCity: RefiningCityId
  readonly refiningCity: RefiningCityId
  readonly saleCity: RefiningCityId
  readonly focusedTiers: ReadonlySet<RefiningTier>
  readonly focusCostEfficiencyByTier: ReadonlyMap<RefiningTier, number>
  readonly silverPerFocus: number
  readonly stationFeeConfig: StationFeeConfig
  readonly isPremium: boolean
  readonly transportCostPerLeg: number
  readonly resolvePrice: RefiningPlannerPriceResolver
}

export interface RefiningMultilevelStep {
  readonly tier: RefiningTier
  readonly enchantment: RefiningEnchantment
  readonly requestedOutputQuantity: number
  readonly craftsNeeded: number
  readonly productionObtained: number
  readonly grossRawRequired: number
  readonly returnedRaw: number
  readonly netRawConsumed: number
  readonly grossPreviousRefinedRequired: number
  readonly returnedPreviousRefined: number
  readonly netPreviousRefinedConsumed: number
  readonly rawItemId: BaseItemId
  readonly previousRefinedItemId: BaseItemId | null
  readonly outputItemId: BaseItemId
  readonly rawUnitPrice: number | null
  readonly previousRefinedReplacementPrice: number | null
  readonly stationFee: number
  readonly returnRate: number
  readonly useFocus: boolean
  readonly focusCostEfficiency: number
  readonly effectiveFocusPerCraft: number
  readonly totalFocusRequired: number
  readonly extraReturnValueFromFocus: number
  readonly silverPerFocusProduced: number
}

export interface RefiningMultilevelPurchaseLine {
  readonly tier: RefiningTier | 3
  readonly kind: 'raw' | 'base-refined'
  readonly itemId: BaseItemId
  readonly enchantment: RefiningEnchantment
  readonly grossQuantity: number
  readonly returnedQuantity: number
  readonly netQuantity: number
  readonly unitPrice: number
  readonly grossCost: number
  readonly recoveredValue: number
  readonly netCost: number
}

export interface RefiningMissingPrice {
  readonly operation: RefiningPlannerPriceOperation
  readonly city: RefiningCityId
  readonly itemId: BaseItemId
  readonly enchantment: RefiningEnchantment
}

export interface RefiningMultilevelPlan {
  readonly purchaseCity: RefiningCityId
  readonly refiningCity: RefiningCityId
  readonly saleCity: RefiningCityId
  readonly targetTier: RefiningTier
  readonly enchantment: RefiningEnchantment
  readonly requestedOutputQuantity: number
  readonly finalOutputQuantity: number
  readonly finalOutputItemId: BaseItemId
  readonly finalOutputUnitPrice: number | null
  readonly steps: readonly RefiningMultilevelStep[]
  readonly purchases: readonly RefiningMultilevelPurchaseLine[]
  readonly grossExternalMaterialCost: number
  readonly recoveredExternalMaterialValue: number
  readonly netExternalMaterialCost: number
  readonly totalStationFee: number
  readonly transportLegs: number
  readonly transportCost: number
  readonly initialInvestment: number
  readonly effectiveProductionCost: number
  readonly totalFocusRequired: number
  readonly extraReturnValueFromFocus: number
  readonly silverPerFocusProduced: number
  readonly focusOpportunityCost: number
  readonly profitAfterFocusOpportunityCost: number
  readonly cashProfit: number
  readonly roiOnInitialInvestment: number
  readonly market: ProfitBreakdown | null
  readonly missingPrices: readonly RefiningMissingPrice[]
  readonly isComplete: boolean
}

export interface RefiningRouteRankingInput
  extends Omit<
    RefiningMultilevelPlanInput,
    'purchaseCity' | 'refiningCity' | 'saleCity'
  > {
  readonly cities: readonly RefiningCityId[]
}

export interface RefiningRouteRanking {
  readonly routes: readonly RefiningMultilevelPlan[]
  readonly completeRoutes: readonly RefiningMultilevelPlan[]
  readonly bestRoute: RefiningMultilevelPlan | null
  readonly missingRouteCount: number
}

interface StepDraft {
  readonly tier: RefiningTier
  readonly enchantment: RefiningEnchantment
  readonly requestedOutputQuantity: number
  readonly craftsNeeded: number
  readonly productionObtained: number
  readonly grossRawRequired: number
  readonly grossPreviousRefinedRequired: number
  readonly returnedRaw: number
  readonly returnedPreviousRefined: number
  readonly netRawConsumed: number
  readonly netPreviousRefinedConsumed: number
  readonly rawItemId: BaseItemId
  readonly rawEnchantment: RefiningEnchantment
  readonly previousRefinedItemId: BaseItemId | null
  readonly previousRefinedEnchantment: RefiningEnchantment
  readonly outputItemId: BaseItemId
  readonly outputEnchantment: RefiningEnchantment
  readonly stationFee: number
  readonly returnRate: number
  readonly useFocus: boolean
  readonly focusCostEfficiency: number
  readonly effectiveFocusPerCraft: number
  readonly totalFocusRequired: number
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function normalizeTargetTier(tier: RefiningTier): RefiningTier {
  return Math.min(8, Math.max(4, tier)) as RefiningTier
}

function buildTierRange(targetTier: RefiningTier): readonly RefiningTier[] {
  const tiers: RefiningTier[] = []
  for (let tier = 4; tier <= targetTier; tier += 1) {
    tiers.push(tier as RefiningTier)
  }
  return tiers
}

function resolvePositivePrice(
  resolvePrice: RefiningPlannerPriceResolver,
  request: RefiningPlannerPriceRequest,
): number | null {
  const value = resolvePrice(request)
  return value !== null && Number.isFinite(value) && value > 0 ? value : null
}

function pushMissingPrice(
  missingPrices: RefiningMissingPrice[],
  price: number | null,
  request: RefiningPlannerPriceRequest,
): void {
  if (price !== null) return

  const alreadyIncluded = missingPrices.some(
    (entry) =>
      entry.operation === request.operation &&
      entry.city === request.city &&
      entry.itemId === request.itemId &&
      entry.enchantment === request.enchantment,
  )
  if (!alreadyIncluded) missingPrices.push(request)
}

export function calculateRefiningMultilevelPlan(
  input: RefiningMultilevelPlanInput,
): RefiningMultilevelPlan {
  const targetTier = normalizeTargetTier(input.targetTier)
  const enchantment = normalizeRefiningEnchantment(
    input.resource,
    targetTier,
    input.enchantment,
  )
  const requestedOutputQuantity = Math.max(
    1,
    Math.floor(nonNegative(input.requestedOutputQuantity)),
  )
  const tiers = buildTierRange(targetTier)
  const draftsDescending: StepDraft[] = []
  let requiredOutput = requestedOutputQuantity

  for (const tier of [...tiers].reverse()) {
    const recipe = getRefiningRecipe({
      resourceKind: input.resource.kind,
      tier,
      enchantment,
    })
    const useFocus = input.focusedTiers.has(tier)
    const returnBreakdown = calculateReturnRateBreakdown({
      hasSpecialtyBonus: input.resource.specialtyCity === input.refiningCity,
      specialtyKind: 'refining',
      useFocus,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1,
      isIsland: false,
    })
    const craftsNeeded = Math.ceil(
      requiredOutput / Math.max(1, recipe.outputPerCraft),
    )
    const productionObtained = craftsNeeded * recipe.outputPerCraft
    const grossRawRequired = craftsNeeded * recipe.rawPerCraft
    const grossPreviousRefinedRequired =
      craftsNeeded * recipe.previousRefinedPerCraft
    const returnedRaw = grossRawRequired * returnBreakdown.returnRate
    const returnedPreviousRefined =
      grossPreviousRefinedRequired * returnBreakdown.returnRate
    const netRawConsumed = grossRawRequired - returnedRaw
    const netPreviousRefinedConsumed =
      grossPreviousRefinedRequired - returnedPreviousRefined
    const focusCostEfficiency = nonNegative(
      input.focusCostEfficiencyByTier.get(tier) ?? 0,
    )
    const effectiveFocusPerCraft = calculateEffectiveFocusCost(
      recipe.baseFocusPerCraft,
      focusCostEfficiency,
    )
    const totalFocusRequired = useFocus
      ? effectiveFocusPerCraft * craftsNeeded
      : 0
    const stationFee = calculateStationUsageFee({
      station: 'refining',
      itemValue: recipe.itemValuePerCraft,
      itemValueSource: 'dataset',
      quantity: productionObtained,
      craftsNeeded,
      config: input.stationFeeConfig,
    }).totalFee

    draftsDescending.push({
      tier,
      enchantment,
      requestedOutputQuantity: requiredOutput,
      craftsNeeded,
      productionObtained,
      grossRawRequired,
      grossPreviousRefinedRequired,
      returnedRaw,
      returnedPreviousRefined,
      netRawConsumed,
      netPreviousRefinedConsumed,
      rawItemId: recipe.rawItemId,
      rawEnchantment: recipe.rawEnchantment,
      previousRefinedItemId: recipe.previousRefinedItemId,
      previousRefinedEnchantment: recipe.previousRefinedEnchantment,
      outputItemId: recipe.outputItemId,
      outputEnchantment: recipe.outputEnchantment,
      stationFee,
      returnRate: returnBreakdown.returnRate,
      useFocus,
      focusCostEfficiency,
      effectiveFocusPerCraft,
      totalFocusRequired,
    })

    requiredOutput = Math.max(1, Math.ceil(netPreviousRefinedConsumed))
  }

  const drafts = draftsDescending.reverse()
  const missingPrices: RefiningMissingPrice[] = []
  const purchases: RefiningMultilevelPurchaseLine[] = []
  const steps: RefiningMultilevelStep[] = []
  const internalUnitCostByTier = new Map<RefiningTier, number>()
  let grossExternalMaterialCost = 0
  let recoveredExternalMaterialValue = 0
  let cumulativeEffectiveCost = 0
  let totalStationFee = 0
  let totalFocusRequired = 0
  let totalExtraReturnValueFromFocus = 0

  for (const draft of drafts) {
    const rawRequest: RefiningPlannerPriceRequest = {
      operation: 'purchase',
      city: input.purchaseCity,
      itemId: draft.rawItemId,
      enchantment: draft.rawEnchantment,
    }
    const rawUnitPrice = resolvePositivePrice(input.resolvePrice, rawRequest)
    pushMissingPrice(missingPrices, rawUnitPrice, rawRequest)

    let previousRefinedReplacementPrice: number | null = null
    if (draft.previousRefinedItemId) {
      const previousRequest: RefiningPlannerPriceRequest = {
        operation: 'purchase',
        city: input.purchaseCity,
        itemId: draft.previousRefinedItemId,
        enchantment: draft.previousRefinedEnchantment,
      }
      const marketReplacementPrice = resolvePositivePrice(
        input.resolvePrice,
        previousRequest,
      )
      const previousTier = (draft.tier - 1) as RefiningTier
      previousRefinedReplacementPrice =
        marketReplacementPrice ?? internalUnitCostByTier.get(previousTier) ?? null

      if (draft.tier === 4) {
        pushMissingPrice(
          missingPrices,
          previousRefinedReplacementPrice,
          previousRequest,
        )
      }
    }

    const safeRawPrice = rawUnitPrice ?? 0
    const rawGrossCost = draft.grossRawRequired * safeRawPrice
    const rawRecoveredValue = draft.returnedRaw * safeRawPrice
    const rawNetCost = rawGrossCost - rawRecoveredValue

    purchases.push({
      tier: draft.tier,
      kind: 'raw',
      itemId: draft.rawItemId,
      enchantment: draft.rawEnchantment,
      grossQuantity: draft.grossRawRequired,
      returnedQuantity: draft.returnedRaw,
      netQuantity: draft.netRawConsumed,
      unitPrice: safeRawPrice,
      grossCost: rawGrossCost,
      recoveredValue: rawRecoveredValue,
      netCost: rawNetCost,
    })
    grossExternalMaterialCost += rawGrossCost
    recoveredExternalMaterialValue += rawRecoveredValue

    let stepExternalNetCost = rawNetCost
    if (draft.tier === 4 && draft.previousRefinedItemId) {
      const safePreviousPrice = previousRefinedReplacementPrice ?? 0
      const previousGrossCost =
        draft.grossPreviousRefinedRequired * safePreviousPrice
      const previousRecoveredValue =
        draft.returnedPreviousRefined * safePreviousPrice
      const previousNetCost = previousGrossCost - previousRecoveredValue

      purchases.push({
        tier: 3,
        kind: 'base-refined',
        itemId: draft.previousRefinedItemId,
        enchantment: draft.previousRefinedEnchantment,
        grossQuantity: draft.grossPreviousRefinedRequired,
        returnedQuantity: draft.returnedPreviousRefined,
        netQuantity: draft.netPreviousRefinedConsumed,
        unitPrice: safePreviousPrice,
        grossCost: previousGrossCost,
        recoveredValue: previousRecoveredValue,
        netCost: previousNetCost,
      })
      grossExternalMaterialCost += previousGrossCost
      recoveredExternalMaterialValue += previousRecoveredValue
      stepExternalNetCost += previousNetCost
    }

    const withoutFocusReturn = calculateReturnRateBreakdown({
      hasSpecialtyBonus: input.resource.specialtyCity === input.refiningCity,
      specialtyKind: 'refining',
      useFocus: false,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1,
      isIsland: false,
    }).returnRate
    const withFocusReturn = calculateReturnRateBreakdown({
      hasSpecialtyBonus: input.resource.specialtyCity === input.refiningCity,
      specialtyKind: 'refining',
      useFocus: true,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1,
      isIsland: false,
    }).returnRate
    const extraReturnRate = Math.max(0, withFocusReturn - withoutFocusReturn)
    const replacementPreviousPrice = previousRefinedReplacementPrice ?? 0
    const extraReturnValueFromFocus =
      draft.grossRawRequired * safeRawPrice * extraReturnRate +
      draft.grossPreviousRefinedRequired *
        replacementPreviousPrice *
        extraReturnRate
    const rankingFocusRequired =
      draft.effectiveFocusPerCraft * draft.craftsNeeded
    const silverPerFocusProduced =
      rankingFocusRequired > 0
        ? extraReturnValueFromFocus / rankingFocusRequired
        : 0

    totalStationFee += draft.stationFee
    cumulativeEffectiveCost += stepExternalNetCost + draft.stationFee
    totalFocusRequired += draft.totalFocusRequired
    if (draft.useFocus) {
      totalExtraReturnValueFromFocus += extraReturnValueFromFocus
    }
    internalUnitCostByTier.set(
      draft.tier,
      draft.productionObtained > 0
        ? cumulativeEffectiveCost / draft.productionObtained
        : 0,
    )

    steps.push({
      tier: draft.tier,
      enchantment: draft.enchantment,
      requestedOutputQuantity: draft.requestedOutputQuantity,
      craftsNeeded: draft.craftsNeeded,
      productionObtained: draft.productionObtained,
      grossRawRequired: draft.grossRawRequired,
      returnedRaw: draft.returnedRaw,
      netRawConsumed: draft.netRawConsumed,
      grossPreviousRefinedRequired: draft.grossPreviousRefinedRequired,
      returnedPreviousRefined: draft.returnedPreviousRefined,
      netPreviousRefinedConsumed: draft.netPreviousRefinedConsumed,
      rawItemId: draft.rawItemId,
      previousRefinedItemId: draft.previousRefinedItemId,
      outputItemId: draft.outputItemId,
      rawUnitPrice,
      previousRefinedReplacementPrice,
      stationFee: draft.stationFee,
      returnRate: draft.returnRate,
      useFocus: draft.useFocus,
      focusCostEfficiency: draft.focusCostEfficiency,
      effectiveFocusPerCraft: draft.effectiveFocusPerCraft,
      totalFocusRequired: draft.totalFocusRequired,
      extraReturnValueFromFocus,
      silverPerFocusProduced,
    })
  }

  const finalStep = steps.at(-1)!
  const finalRecipe = getRefiningRecipe({
    resourceKind: input.resource.kind,
    tier: targetTier,
    enchantment,
  })
  const saleRequest: RefiningPlannerPriceRequest = {
    operation: 'sale',
    city: input.saleCity,
    itemId: finalRecipe.outputItemId,
    enchantment: finalRecipe.outputEnchantment,
  }
  const finalOutputUnitPrice = resolvePositivePrice(input.resolvePrice, saleRequest)
  pushMissingPrice(missingPrices, finalOutputUnitPrice, saleRequest)

  const transportLegs =
    Number(input.purchaseCity !== input.refiningCity) +
    Number(input.refiningCity !== input.saleCity)
  const transportCost = transportLegs * nonNegative(input.transportCostPerLeg)
  const netExternalMaterialCost = Math.max(
    0,
    grossExternalMaterialCost - recoveredExternalMaterialValue,
  )
  const initialInvestment =
    grossExternalMaterialCost + totalStationFee + transportCost
  const effectiveProductionCost =
    netExternalMaterialCost + totalStationFee + transportCost
  const market =
    missingPrices.length === 0 && finalOutputUnitPrice !== null
      ? calculateProfitBreakdown({
          totalCost: effectiveProductionCost,
          quantity: finalStep.productionObtained,
          unitSellPrice: finalOutputUnitPrice,
          isPremium: input.isPremium,
        })
      : null
  const focusOpportunityCost =
    totalFocusRequired * nonNegative(input.silverPerFocus)
  const profitAfterFocusOpportunityCost =
    (market?.profit ?? 0) - focusOpportunityCost
  const cashProfit =
    market === null ? 0 : market.netRevenue - initialInvestment
  const roiOnInitialInvestment =
    initialInvestment > 0 ? profitAfterFocusOpportunityCost / initialInvestment : 0

  return {
    purchaseCity: input.purchaseCity,
    refiningCity: input.refiningCity,
    saleCity: input.saleCity,
    targetTier,
    enchantment,
    requestedOutputQuantity,
    finalOutputQuantity: finalStep.productionObtained,
    finalOutputItemId: finalRecipe.outputItemId,
    finalOutputUnitPrice,
    steps,
    purchases,
    grossExternalMaterialCost,
    recoveredExternalMaterialValue,
    netExternalMaterialCost,
    totalStationFee,
    transportLegs,
    transportCost,
    initialInvestment,
    effectiveProductionCost,
    totalFocusRequired,
    extraReturnValueFromFocus: totalExtraReturnValueFromFocus,
    silverPerFocusProduced:
      totalFocusRequired > 0
        ? totalExtraReturnValueFromFocus / totalFocusRequired
        : 0,
    focusOpportunityCost,
    profitAfterFocusOpportunityCost,
    cashProfit,
    roiOnInitialInvestment,
    market,
    missingPrices,
    isComplete: missingPrices.length === 0 && market !== null,
  }
}

export function rankRefiningMultilevelRoutes(
  input: RefiningRouteRankingInput,
): RefiningRouteRanking {
  const cities = Array.from(new Set(input.cities))
  const routes: RefiningMultilevelPlan[] = []

  for (const purchaseCity of cities) {
    for (const refiningCity of cities) {
      for (const saleCity of cities) {
        routes.push(
          calculateRefiningMultilevelPlan({
            ...input,
            purchaseCity,
            refiningCity,
            saleCity,
          }),
        )
      }
    }
  }

  const completeRoutes = routes
    .filter((route) => route.isComplete)
    .sort((left, right) => {
      const profitDifference =
        right.profitAfterFocusOpportunityCost -
        left.profitAfterFocusOpportunityCost
      if (profitDifference !== 0) return profitDifference

      const focusDifference =
        right.silverPerFocusProduced - left.silverPerFocusProduced
      if (focusDifference !== 0) return focusDifference

      return right.roiOnInitialInvestment - left.roiOnInitialInvestment
    })

  return {
    routes,
    completeRoutes,
    bestRoute: completeRoutes[0] ?? null,
    missingRouteCount: routes.length - completeRoutes.length,
  }
}
