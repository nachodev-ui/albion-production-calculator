import type {
  BlackMarketOpportunity,
  BlackMarketSaleMode,
} from "../types";

export interface BlackMarketSaleEconomicsInput {
  readonly saleMode: BlackMarketSaleMode;
  readonly quantity: number;
  readonly directSaleUnitPrice: number | null;
  readonly sellOrderUnitPrice: number | null;
  readonly purchaseUnitPrice: number;
  readonly salesTaxRate: number;
  readonly setupFeeRate: number;
  readonly transportCostPerUnit: number;
}

export interface BlackMarketSaleEconomics {
  readonly available: boolean;
  readonly saleMode: BlackMarketSaleMode;
  readonly quantity: number;
  readonly selectedUnitPrice: number | null;
  readonly grossRevenue: number | null;
  readonly salesTax: number | null;
  readonly setupFee: number | null;
  readonly netRevenue: number | null;
  readonly purchaseCost: number;
  readonly transportCost: number;
  readonly totalCost: number;
  readonly profit: number | null;
  readonly profitPerUnit: number | null;
  readonly marginPercent: number | null;
  readonly returnOnCostPercent: number | null;
  readonly breakEvenUnitPrice: number | null;
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function finiteRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.9999, Math.max(0, value));
}

export function blackMarketSaleModeLabel(mode: BlackMarketSaleMode): string {
  return mode === "direct" ? "Venta directa" : "Orden de venta";
}

export function selectedBlackMarketUnitPrice(
  opportunity: Pick<
    BlackMarketOpportunity,
    "blackMarketBuyUnitPrice" | "blackMarketSellUnitPrice"
  >,
  saleMode: BlackMarketSaleMode,
): number | null {
  const value =
    saleMode === "direct"
      ? opportunity.blackMarketBuyUnitPrice
      : opportunity.blackMarketSellUnitPrice;
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}

export function calculateBlackMarketSaleEconomics(
  input: BlackMarketSaleEconomicsInput,
): BlackMarketSaleEconomics {
  const quantity = Math.max(1, Math.floor(finiteNonNegative(input.quantity)));
  const purchaseUnitPrice = finiteNonNegative(input.purchaseUnitPrice);
  const transportCostPerUnit = finiteNonNegative(input.transportCostPerUnit);
  const purchaseCost = purchaseUnitPrice * quantity;
  const transportCost = transportCostPerUnit * quantity;
  const totalCost = purchaseCost + transportCost;
  const selectedUnitPrice =
    input.saleMode === "direct"
      ? input.directSaleUnitPrice
      : input.sellOrderUnitPrice;

  if (
    selectedUnitPrice === null ||
    !Number.isFinite(selectedUnitPrice) ||
    selectedUnitPrice <= 0
  ) {
    return {
      available: false,
      saleMode: input.saleMode,
      quantity,
      selectedUnitPrice: null,
      grossRevenue: null,
      salesTax: null,
      setupFee: null,
      netRevenue: null,
      purchaseCost,
      transportCost,
      totalCost,
      profit: null,
      profitPerUnit: null,
      marginPercent: null,
      returnOnCostPercent: null,
      breakEvenUnitPrice: null,
    };
  }

  const unitPrice = finiteNonNegative(selectedUnitPrice);
  const grossRevenue = unitPrice * quantity;
  const salesTaxRate = finiteRate(input.salesTaxRate);
  const setupFeeRate =
    input.saleMode === "sell-order" ? finiteRate(input.setupFeeRate) : 0;
  const salesTax = grossRevenue * salesTaxRate;
  const setupFee = grossRevenue * setupFeeRate;
  const netRevenue = grossRevenue - salesTax - setupFee;
  const profit = netRevenue - totalCost;
  const effectiveRevenueRate = 1 - salesTaxRate - setupFeeRate;

  return {
    available: true,
    saleMode: input.saleMode,
    quantity,
    selectedUnitPrice: unitPrice,
    grossRevenue,
    salesTax,
    setupFee,
    netRevenue,
    purchaseCost,
    transportCost,
    totalCost,
    profit,
    profitPerUnit: profit / quantity,
    marginPercent: netRevenue > 0 ? (profit / netRevenue) * 100 : null,
    returnOnCostPercent: totalCost > 0 ? (profit / totalCost) * 100 : null,
    breakEvenUnitPrice:
      effectiveRevenueRate > 0
        ? totalCost / quantity / effectiveRevenueRate
        : null,
  };
}

export function calculateOpportunitySaleEconomics(
  opportunity: BlackMarketOpportunity,
  options: {
    readonly saleMode: BlackMarketSaleMode;
    readonly quantity?: number;
    readonly salesTaxPercent: number;
    readonly setupFeePercent: number;
    readonly transportCostPerUnit?: number;
  },
): BlackMarketSaleEconomics {
  return calculateBlackMarketSaleEconomics({
    saleMode: options.saleMode,
    quantity: options.quantity ?? 1,
    directSaleUnitPrice: opportunity.blackMarketBuyUnitPrice,
    sellOrderUnitPrice: opportunity.blackMarketSellUnitPrice,
    purchaseUnitPrice: opportunity.purchaseUnitPrice,
    salesTaxRate: options.salesTaxPercent / 100,
    setupFeeRate: options.setupFeePercent / 100,
    transportCostPerUnit:
      options.transportCostPerUnit ?? opportunity.transportCostPerUnit,
  });
}
