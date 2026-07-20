import {
  calculateBlackMarketQualityValuation,
  type BlackMarketQualityLevel,
} from "./blackMarketQuality";

export interface BlackMarketCraftingEconomicsInput {
  readonly isComplete: boolean;
  readonly quantity: number;
  readonly netMaterialCost: number;
  readonly recoveredMaterialValue: number;
  readonly stationFees: number;
  readonly effectiveCraftCost: number;
  readonly blackMarketBuyUnitPrice: number;
  readonly salesTaxRate: number;
  readonly targetQuality: number;
  readonly qualityIncreasePercent: number;
  readonly qualityPriceSchedule: ReadonlyMap<BlackMarketQualityLevel, number>;
  readonly materialTransportCostTotal: number;
  readonly finishedTransportCostTotal: number;
  readonly escortCostTotal: number;
  readonly deathProbabilityRate: number;
  readonly timeCostTotal: number;
  readonly focusRequired: number;
  readonly focusValuePerPoint: number;
  readonly buyFinishedProfitPerUnit: number;
}

export interface BlackMarketCraftingEconomics {
  readonly isComplete: boolean;
  readonly quantity: number;
  readonly grossMaterialCost: number;
  readonly recoveredMaterialValue: number;
  readonly netMaterialCost: number;
  readonly stationFees: number;
  readonly effectiveCraftCost: number;
  readonly targetQuality: number;
  readonly qualityIncreasePercent: number;
  readonly qualitySuccessProbability: number;
  readonly expectedTargetUnits: number;
  readonly expectedAlternativeUnits: number;
  readonly nominalGrossRevenue: number;
  readonly expectedGrossRevenue: number | null;
  readonly expectedTargetRevenue: number | null;
  readonly expectedAlternativeRevenue: number | null;
  readonly estimatedSalesTax: number | null;
  readonly expectedNetRevenue: number | null;
  readonly materialTransportCostTotal: number;
  readonly finishedTransportCostTotal: number;
  readonly escortCostTotal: number;
  readonly directLogisticsCostTotal: number;
  readonly accountingInvestment: number;
  readonly accountingProfit: number | null;
  readonly accountingProfitPerUnit: number | null;
  readonly returnOnCostPercent: number | null;
  readonly focusRequired: number;
  readonly focusValuePerPoint: number;
  readonly focusOpportunityCost: number;
  readonly deathProbabilityRate: number;
  readonly expectedDeathLoss: number;
  readonly timeCostTotal: number;
  readonly economicCostTotal: number;
  readonly adjustedProfit: number | null;
  readonly adjustedProfitPerUnit: number | null;
  readonly adjustedReturnOnCostPercent: number | null;
  readonly buyFinishedProfit: number;
  readonly advantageOverBuying: number | null;
}

export interface BlackMarketFocusValuation {
  readonly focusRequired: number;
  readonly incrementalAccountingProfit: number | null;
  readonly silverPerFocus: number | null;
  readonly configuredValuePerFocus: number;
  readonly opportunityCost: number;
  readonly clearsConfiguredValue: boolean | null;
}

export type BlackMarketStrategyKind =
  | "buy-finished"
  | "craft-without-focus"
  | "craft-with-focus";

export interface BlackMarketStrategyRecommendation {
  readonly kind: BlackMarketStrategyKind;
  readonly label: string;
  readonly profit: number;
  readonly returnOnCostPercent: number | null;
  readonly advantageOverBuying: number;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function finiteRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function calculateBlackMarketCraftingEconomics(
  input: BlackMarketCraftingEconomicsInput,
): BlackMarketCraftingEconomics {
  const quantity = Math.max(1, Math.floor(finiteNonNegative(input.quantity)));
  const netMaterialCost = finiteNonNegative(input.netMaterialCost);
  const recoveredMaterialValue = finiteNonNegative(
    input.recoveredMaterialValue,
  );
  const stationFees = finiteNonNegative(input.stationFees);
  const effectiveCraftCost = finiteNonNegative(input.effectiveCraftCost);
  const materialTransportCostTotal = finiteNonNegative(
    input.materialTransportCostTotal,
  );
  const finishedTransportCostTotal = finiteNonNegative(
    input.finishedTransportCostTotal,
  );
  const escortCostTotal = finiteNonNegative(input.escortCostTotal);
  const directLogisticsCostTotal =
    materialTransportCostTotal + finishedTransportCostTotal + escortCostTotal;
  const accountingInvestment = effectiveCraftCost + directLogisticsCostTotal;
  const focusRequired = finiteNonNegative(input.focusRequired);
  const focusValuePerPoint = finiteNonNegative(input.focusValuePerPoint);
  const focusOpportunityCost = focusRequired * focusValuePerPoint;
  const deathProbabilityRate = finiteRate(input.deathProbabilityRate);
  const expectedDeathLoss = accountingInvestment * deathProbabilityRate;
  const timeCostTotal = finiteNonNegative(input.timeCostTotal);
  const economicCostTotal =
    accountingInvestment +
    focusOpportunityCost +
    expectedDeathLoss +
    timeCostTotal;
  const grossMaterialCost = netMaterialCost + recoveredMaterialValue;
  const nominalGrossRevenue =
    finiteNonNegative(input.blackMarketBuyUnitPrice) * quantity;
  const buyFinishedProfit = input.buyFinishedProfitPerUnit * quantity;
  const qualityValuation = calculateBlackMarketQualityValuation({
    quantity,
    targetQuality: input.targetQuality,
    qualityIncreasePercent: input.qualityIncreasePercent,
    targetUnitPrice: input.blackMarketBuyUnitPrice,
    priceSchedule: input.qualityPriceSchedule,
  });

  if (!input.isComplete) {
    return {
      isComplete: false,
      quantity,
      grossMaterialCost,
      recoveredMaterialValue,
      netMaterialCost,
      stationFees,
      effectiveCraftCost,
      targetQuality: Math.min(5, Math.max(1, Math.floor(input.targetQuality))),
      qualityIncreasePercent: finiteNonNegative(input.qualityIncreasePercent),
      qualitySuccessProbability: qualityValuation.successProbability,
      expectedTargetUnits: qualityValuation.expectedTargetUnits,
      expectedAlternativeUnits: qualityValuation.expectedAlternativeUnits,
      nominalGrossRevenue,
      expectedGrossRevenue: null,
      expectedTargetRevenue: null,
      expectedAlternativeRevenue: null,
      estimatedSalesTax: null,
      expectedNetRevenue: null,
      materialTransportCostTotal,
      finishedTransportCostTotal,
      escortCostTotal,
      directLogisticsCostTotal,
      accountingInvestment,
      accountingProfit: null,
      accountingProfitPerUnit: null,
      returnOnCostPercent: null,
      focusRequired,
      focusValuePerPoint,
      focusOpportunityCost,
      deathProbabilityRate,
      expectedDeathLoss,
      timeCostTotal,
      economicCostTotal,
      adjustedProfit: null,
      adjustedProfitPerUnit: null,
      adjustedReturnOnCostPercent: null,
      buyFinishedProfit,
      advantageOverBuying: null,
    };
  }

  const expectedGrossRevenue = qualityValuation.expectedGrossRevenue;
  const estimatedSalesTax = expectedGrossRevenue * finiteRate(input.salesTaxRate);
  const expectedNetRevenue = expectedGrossRevenue - estimatedSalesTax;
  const accountingProfit = expectedNetRevenue - accountingInvestment;
  const adjustedProfit = expectedNetRevenue - economicCostTotal;

  return {
    isComplete: true,
    quantity,
    grossMaterialCost,
    recoveredMaterialValue,
    netMaterialCost,
    stationFees,
    effectiveCraftCost,
    targetQuality: Math.min(5, Math.max(1, Math.floor(input.targetQuality))),
    qualityIncreasePercent: finiteNonNegative(input.qualityIncreasePercent),
    qualitySuccessProbability: qualityValuation.successProbability,
    expectedTargetUnits: qualityValuation.expectedTargetUnits,
    expectedAlternativeUnits: qualityValuation.expectedAlternativeUnits,
    nominalGrossRevenue,
    expectedGrossRevenue,
    expectedTargetRevenue: qualityValuation.expectedTargetRevenue,
    expectedAlternativeRevenue: qualityValuation.expectedAlternativeRevenue,
    estimatedSalesTax,
    expectedNetRevenue,
    materialTransportCostTotal,
    finishedTransportCostTotal,
    escortCostTotal,
    directLogisticsCostTotal,
    accountingInvestment,
    accountingProfit,
    accountingProfitPerUnit: accountingProfit / quantity,
    returnOnCostPercent:
      accountingInvestment > 0
        ? (accountingProfit / accountingInvestment) * 100
        : null,
    focusRequired,
    focusValuePerPoint,
    focusOpportunityCost,
    deathProbabilityRate,
    expectedDeathLoss,
    timeCostTotal,
    economicCostTotal,
    adjustedProfit,
    adjustedProfitPerUnit: adjustedProfit / quantity,
    adjustedReturnOnCostPercent:
      economicCostTotal > 0 ? (adjustedProfit / economicCostTotal) * 100 : null,
    buyFinishedProfit,
    advantageOverBuying: adjustedProfit - buyFinishedProfit,
  };
}

export function calculateBlackMarketFocusValuation(
  withoutFocus: BlackMarketCraftingEconomics,
  withFocus: BlackMarketCraftingEconomics,
): BlackMarketFocusValuation {
  const focusRequired = withFocus.focusRequired;
  const configuredValuePerFocus = withFocus.focusValuePerPoint;
  const opportunityCost = withFocus.focusOpportunityCost;
  const incrementalAccountingProfit =
    withoutFocus.accountingProfit === null || withFocus.accountingProfit === null
      ? null
      : withFocus.accountingProfit - withoutFocus.accountingProfit;
  const silverPerFocus =
    incrementalAccountingProfit === null || focusRequired <= 0
      ? null
      : incrementalAccountingProfit / focusRequired;

  return {
    focusRequired,
    incrementalAccountingProfit,
    silverPerFocus,
    configuredValuePerFocus,
    opportunityCost,
    clearsConfiguredValue:
      silverPerFocus === null
        ? null
        : silverPerFocus >= configuredValuePerFocus,
  };
}

export function recommendBlackMarketStrategy(
  buyFinishedProfitPerUnit: number,
  buyFinishedReturnOnCostPercent: number,
  quantity: number,
  withoutFocus: BlackMarketCraftingEconomics,
  withFocus: BlackMarketCraftingEconomics,
): BlackMarketStrategyRecommendation {
  const normalizedQuantity = Math.max(
    1,
    Math.floor(finiteNonNegative(quantity)),
  );
  const buyFinishedProfit = buyFinishedProfitPerUnit * normalizedQuantity;
  const candidates: BlackMarketStrategyRecommendation[] = [
    {
      kind: "buy-finished",
      label: "Comprar y transportar",
      profit: buyFinishedProfit,
      returnOnCostPercent: buyFinishedReturnOnCostPercent,
      advantageOverBuying: 0,
    },
  ];

  if (withoutFocus.isComplete && withoutFocus.adjustedProfit !== null) {
    candidates.push({
      kind: "craft-without-focus",
      label: "Fabricar sin foco",
      profit: withoutFocus.adjustedProfit,
      returnOnCostPercent: withoutFocus.adjustedReturnOnCostPercent,
      advantageOverBuying: withoutFocus.adjustedProfit - buyFinishedProfit,
    });
  }

  if (withFocus.isComplete && withFocus.adjustedProfit !== null) {
    candidates.push({
      kind: "craft-with-focus",
      label: "Fabricar con foco",
      profit: withFocus.adjustedProfit,
      returnOnCostPercent: withFocus.adjustedReturnOnCostPercent,
      advantageOverBuying: withFocus.adjustedProfit - buyFinishedProfit,
    });
  }

  return candidates.reduce((best, candidate) =>
    candidate.profit > best.profit ? candidate : best,
  );
}
