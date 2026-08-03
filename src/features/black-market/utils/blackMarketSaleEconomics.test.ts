import { describe, expect, it } from "vitest";
import { calculateBlackMarketSaleEconomics } from "./blackMarketSaleEconomics";

describe("calculateBlackMarketSaleEconomics", () => {
  it("calculates direct sale without setup fee", () => {
    const result = calculateBlackMarketSaleEconomics({
      saleMode: "direct",
      quantity: 2,
      directSaleUnitPrice: 100_000,
      sellOrderUnitPrice: 120_000,
      purchaseUnitPrice: 70_000,
      salesTaxRate: 0.04,
      setupFeeRate: 0.025,
      transportCostPerUnit: 5_000,
    });

    expect(result.available).toBe(true);
    expect(result.grossRevenue).toBe(200_000);
    expect(result.salesTax).toBe(8_000);
    expect(result.setupFee).toBe(0);
    expect(result.netRevenue).toBe(192_000);
    expect(result.totalCost).toBe(150_000);
    expect(result.profit).toBe(42_000);
    expect(result.returnOnCostPercent).toBeCloseTo(28, 6);
  });

  it("deducts sales tax and setup fee from a sell order", () => {
    const result = calculateBlackMarketSaleEconomics({
      saleMode: "sell-order",
      quantity: 2,
      directSaleUnitPrice: 100_000,
      sellOrderUnitPrice: 120_000,
      purchaseUnitPrice: 70_000,
      salesTaxRate: 0.08,
      setupFeeRate: 0.025,
      transportCostPerUnit: 5_000,
    });

    expect(result.grossRevenue).toBe(240_000);
    expect(result.salesTax).toBe(19_200);
    expect(result.setupFee).toBe(6_000);
    expect(result.netRevenue).toBe(214_800);
    expect(result.profit).toBe(64_800);
    expect(result.returnOnCostPercent).toBeCloseTo(43.2, 6);
    expect(result.breakEvenUnitPrice).toBeCloseTo(83_798.88268156, 6);
  });

  it("marks sell-order economics unavailable when no sell price exists", () => {
    const result = calculateBlackMarketSaleEconomics({
      saleMode: "sell-order",
      quantity: 1,
      directSaleUnitPrice: 100_000,
      sellOrderUnitPrice: null,
      purchaseUnitPrice: 70_000,
      salesTaxRate: 0.04,
      setupFeeRate: 0.025,
      transportCostPerUnit: 0,
    });

    expect(result.available).toBe(false);
    expect(result.selectedUnitPrice).toBeNull();
    expect(result.profit).toBeNull();
    expect(result.returnOnCostPercent).toBeNull();
  });
});
