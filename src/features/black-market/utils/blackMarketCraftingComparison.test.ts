import { describe, expect, it } from "vitest";
import {
  calculateBlackMarketCraftingEconomics,
  calculateBlackMarketFocusValuation,
  recommendBlackMarketStrategy,
} from "./blackMarketCraftingComparison";
import { buildBlackMarketQualityPriceSchedule } from "./blackMarketQuality";

function normalQualitySchedule(price: number) {
  return buildBlackMarketQualityPriceSchedule({
    targetQuality: 1,
    targetUnitPrice: price,
    availableOrders: [],
    lowerQualityFallbackPercent: 0,
  });
}

describe("calculateBlackMarketCraftingEconomics", () => {
  it("separates accounting profit from focus, risk and time adjusted profit", () => {
    const result = calculateBlackMarketCraftingEconomics({
      isComplete: true,
      quantity: 10,
      netMaterialCost: 700_000,
      recoveredMaterialValue: 300_000,
      stationFees: 50_000,
      effectiveCraftCost: 750_000,
      blackMarketBuyUnitPrice: 100_000,
      salesTaxRate: 0.04,
      targetQuality: 1,
      qualityIncreasePercent: 0,
      qualityPriceSchedule: normalQualitySchedule(100_000),
      materialTransportCostTotal: 10_000,
      finishedTransportCostTotal: 20_000,
      escortCostTotal: 5_000,
      deathProbabilityRate: 0.1,
      timeCostTotal: 15_000,
      focusRequired: 8_000,
      focusValuePerPoint: 5,
      buyFinishedProfitPerUnit: 10_000,
    });

    expect(result.grossMaterialCost).toBe(1_000_000);
    expect(result.expectedGrossRevenue).toBeCloseTo(1_000_000, 6);
    expect(result.estimatedSalesTax).toBeCloseTo(40_000, 6);
    expect(result.accountingInvestment).toBe(785_000);
    expect(result.accountingProfit).toBeCloseTo(175_000, 6);
    expect(result.focusOpportunityCost).toBe(40_000);
    expect(result.expectedDeathLoss).toBe(78_500);
    expect(result.adjustedProfit).toBeCloseTo(41_500, 6);
    expect(result.advantageOverBuying).toBeCloseTo(-58_500, 6);
  });

  it("keeps incomplete strategies unknown instead of treating missing prices as zero profit", () => {
    const result = calculateBlackMarketCraftingEconomics({
      isComplete: false,
      quantity: 5,
      netMaterialCost: 0,
      recoveredMaterialValue: 0,
      stationFees: 5_000,
      effectiveCraftCost: 5_000,
      blackMarketBuyUnitPrice: 100_000,
      salesTaxRate: 0.04,
      targetQuality: 1,
      qualityIncreasePercent: 0,
      qualityPriceSchedule: normalQualitySchedule(100_000),
      materialTransportCostTotal: 0,
      finishedTransportCostTotal: 10_000,
      escortCostTotal: 0,
      deathProbabilityRate: 0,
      timeCostTotal: 0,
      focusRequired: 0,
      focusValuePerPoint: 0,
      buyFinishedProfitPerUnit: 8_000,
    });

    expect(result.isComplete).toBe(false);
    expect(result.accountingProfit).toBeNull();
    expect(result.adjustedProfit).toBeNull();
    expect(result.adjustedReturnOnCostPercent).toBeNull();
    expect(result.advantageOverBuying).toBeNull();
  });
});

describe("focus valuation and recommendation", () => {
  it("calculates silver per focus and lets opportunity cost change the winner", () => {
    const base = {
      isComplete: true,
      quantity: 2,
      recoveredMaterialValue: 0,
      stationFees: 0,
      blackMarketBuyUnitPrice: 100_000,
      salesTaxRate: 0,
      targetQuality: 1,
      qualityIncreasePercent: 0,
      qualityPriceSchedule: normalQualitySchedule(100_000),
      materialTransportCostTotal: 0,
      finishedTransportCostTotal: 0,
      escortCostTotal: 0,
      deathProbabilityRate: 0,
      timeCostTotal: 0,
      buyFinishedProfitPerUnit: 20_000,
    } as const;
    const withoutFocus = calculateBlackMarketCraftingEconomics({
      ...base,
      netMaterialCost: 150_000,
      effectiveCraftCost: 150_000,
      focusRequired: 0,
      focusValuePerPoint: 10,
    });
    const withFocus = calculateBlackMarketCraftingEconomics({
      ...base,
      netMaterialCost: 100_000,
      effectiveCraftCost: 100_000,
      focusRequired: 8_000,
      focusValuePerPoint: 10,
    });
    const focus = calculateBlackMarketFocusValuation(withoutFocus, withFocus);

    expect(focus.incrementalAccountingProfit).toBe(50_000);
    expect(focus.silverPerFocus).toBe(6.25);
    expect(focus.clearsConfiguredValue).toBe(false);
    expect(
      recommendBlackMarketStrategy(20_000, 20, 2, withoutFocus, withFocus),
    ).toMatchObject({
      kind: "craft-without-focus",
      profit: 50_000,
      advantageOverBuying: 10_000,
    });
  });
});
