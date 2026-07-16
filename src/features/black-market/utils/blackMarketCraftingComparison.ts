export interface BlackMarketCraftingEconomicsInput {
  readonly isComplete: boolean;
  readonly quantity: number;
  readonly netMaterialCost: number;
  readonly recoveredMaterialValue: number;
  readonly stationFees: number;
  readonly effectiveCraftCost: number;
  readonly blackMarketBuyUnitPrice: number;
  readonly estimatedSalesTaxPerUnit: number;
  readonly transportCostTotal: number;
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
  readonly estimatedSalesTax: number;
  readonly transportCostTotal: number;
  readonly totalInvestment: number;
  readonly netRevenue: number | null;
  readonly profit: number | null;
  readonly profitPerUnit: number | null;
  readonly returnOnCostPercent: number | null;
  readonly buyFinishedProfit: number;
  readonly advantageOverBuying: number | null;
}

export type BlackMarketStrategyKind =
  | "buy-finished"
  | "craft-without-focus"
  | "craft-with-focus";

export interface BlackMarketStrategyRecommendation {
  readonly kind: BlackMarketStrategyKind;
  readonly label: string;
  readonly profit: number;
  readonly advantageOverBuying: number;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
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
  const transportCostTotal = finiteNonNegative(input.transportCostTotal);
  const estimatedSalesTax =
    finiteNonNegative(input.estimatedSalesTaxPerUnit) * quantity;
  const grossMaterialCost = netMaterialCost + recoveredMaterialValue;
  const totalInvestment = effectiveCraftCost + transportCostTotal;
  const netRevenue =
    (finiteNonNegative(input.blackMarketBuyUnitPrice) * quantity) -
    estimatedSalesTax;
  const buyFinishedProfit = input.buyFinishedProfitPerUnit * quantity;

  if (!input.isComplete) {
    return {
      isComplete: false,
      quantity,
      grossMaterialCost,
      recoveredMaterialValue,
      netMaterialCost,
      stationFees,
      effectiveCraftCost,
      estimatedSalesTax,
      transportCostTotal,
      totalInvestment,
      netRevenue: null,
      profit: null,
      profitPerUnit: null,
      returnOnCostPercent: null,
      buyFinishedProfit,
      advantageOverBuying: null,
    };
  }

  const profit = netRevenue - totalInvestment;

  return {
    isComplete: true,
    quantity,
    grossMaterialCost,
    recoveredMaterialValue,
    netMaterialCost,
    stationFees,
    effectiveCraftCost,
    estimatedSalesTax,
    transportCostTotal,
    totalInvestment,
    netRevenue,
    profit,
    profitPerUnit: profit / quantity,
    returnOnCostPercent:
      totalInvestment > 0 ? (profit / totalInvestment) * 100 : null,
    buyFinishedProfit,
    advantageOverBuying: profit - buyFinishedProfit,
  };
}

export function recommendBlackMarketStrategy(
  buyFinishedProfitPerUnit: number,
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
      advantageOverBuying: 0,
    },
  ];

  if (withoutFocus.isComplete && withoutFocus.profit !== null) {
    candidates.push({
      kind: "craft-without-focus",
      label: "Fabricar sin foco",
      profit: withoutFocus.profit,
      advantageOverBuying: withoutFocus.profit - buyFinishedProfit,
    });
  }

  if (withFocus.isComplete && withFocus.profit !== null) {
    candidates.push({
      kind: "craft-with-focus",
      label: "Fabricar con foco",
      profit: withFocus.profit,
      advantageOverBuying: withFocus.profit - buyFinishedProfit,
    });
  }

  return candidates.reduce((best, candidate) =>
    candidate.profit > best.profit ? candidate : best,
  );
}
