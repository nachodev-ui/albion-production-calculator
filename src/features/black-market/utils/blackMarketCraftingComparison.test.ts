import { describe, expect, it } from "vitest";
import {
  calculateBlackMarketCraftingEconomics,
  recommendBlackMarketStrategy,
} from "./blackMarketCraftingComparison";

describe("calculateBlackMarketCraftingEconomics", () => {
  it("descuenta RRR, tarifas, impuesto y transporte del lote", () => {
    const result = calculateBlackMarketCraftingEconomics({
      isComplete: true,
      quantity: 10,
      netMaterialCost: 700_000,
      recoveredMaterialValue: 300_000,
      stationFees: 50_000,
      effectiveCraftCost: 750_000,
      blackMarketBuyUnitPrice: 100_000,
      estimatedSalesTaxPerUnit: 4_000,
      transportCostTotal: 20_000,
      buyFinishedProfitPerUnit: 10_000,
    });

    expect(result.grossMaterialCost).toBe(1_000_000);
    expect(result.estimatedSalesTax).toBe(40_000);
    expect(result.totalInvestment).toBe(770_000);
    expect(result.netRevenue).toBe(960_000);
    expect(result.profit).toBe(190_000);
    expect(result.profitPerUnit).toBe(19_000);
    expect(result.advantageOverBuying).toBe(90_000);
    expect(result.returnOnCostPercent).toBeCloseTo(24.6753, 4);
  });

  it("mantiene la estrategia incompleta sin convertir precios faltantes en beneficio cero", () => {
    const result = calculateBlackMarketCraftingEconomics({
      isComplete: false,
      quantity: 5,
      netMaterialCost: 0,
      recoveredMaterialValue: 0,
      stationFees: 5_000,
      effectiveCraftCost: 5_000,
      blackMarketBuyUnitPrice: 100_000,
      estimatedSalesTaxPerUnit: 4_000,
      transportCostTotal: 10_000,
      buyFinishedProfitPerUnit: 8_000,
    });

    expect(result.isComplete).toBe(false);
    expect(result.profit).toBeNull();
    expect(result.profitPerUnit).toBeNull();
    expect(result.returnOnCostPercent).toBeNull();
    expect(result.advantageOverBuying).toBeNull();
  });
});

describe("recommendBlackMarketStrategy", () => {
  it("compara comprar, fabricar sin foco y fabricar con foco por separado", () => {
    const withoutFocus = calculateBlackMarketCraftingEconomics({
      isComplete: true,
      quantity: 2,
      netMaterialCost: 130_000,
      recoveredMaterialValue: 20_000,
      stationFees: 10_000,
      effectiveCraftCost: 140_000,
      blackMarketBuyUnitPrice: 100_000,
      estimatedSalesTaxPerUnit: 4_000,
      transportCostTotal: 10_000,
      buyFinishedProfitPerUnit: 12_000,
    });
    const withFocus = calculateBlackMarketCraftingEconomics({
      isComplete: true,
      quantity: 2,
      netMaterialCost: 100_000,
      recoveredMaterialValue: 50_000,
      stationFees: 10_000,
      effectiveCraftCost: 110_000,
      blackMarketBuyUnitPrice: 100_000,
      estimatedSalesTaxPerUnit: 4_000,
      transportCostTotal: 10_000,
      buyFinishedProfitPerUnit: 12_000,
    });

    expect(recommendBlackMarketStrategy(12_000, 2, withoutFocus, withFocus)).toMatchObject({
      kind: "craft-with-focus",
      label: "Fabricar con foco",
      profit: 72_000,
      advantageOverBuying: 48_000,
    });
  });

  it("ignora variantes de fabricación incompletas", () => {
    const incomplete = calculateBlackMarketCraftingEconomics({
      isComplete: false,
      quantity: 1,
      netMaterialCost: 0,
      recoveredMaterialValue: 0,
      stationFees: 0,
      effectiveCraftCost: 0,
      blackMarketBuyUnitPrice: 100_000,
      estimatedSalesTaxPerUnit: 4_000,
      transportCostTotal: 0,
      buyFinishedProfitPerUnit: 15_000,
    });

    expect(recommendBlackMarketStrategy(15_000, 1, incomplete, incomplete)).toMatchObject({
      kind: "buy-finished",
      profit: 15_000,
    });
  });
});
