import { describe, expect, it } from "vitest";
import { parseBlackMarketWorkspace } from "./blackMarketWorkspaceStorage";

describe("parseBlackMarketWorkspace", () => {
  it("restores a valid versioned workspace", () => {
    const workspace = parseBlackMarketWorkspace({
      version: 1,
      workspace: {
        selectedItemId: "T6_MAIN_SWORD",
        enchantment: 2,
        server: "europe",
        purchaseMarketKey: "thetford",
        quality: 4,
        quantity: 20,
        saleUnitPriceOverride: 50000,
        salesTaxPercent: 4,
        transportCost: 15000,
        historyDays: 60,
      },
    });

    expect(workspace).toEqual({
      selectedItemId: "T6_MAIN_SWORD",
      enchantment: 2,
      server: "europe",
      purchaseMarketKey: "thetford",
      quality: 4,
      quantity: 20,
      saleUnitPriceOverride: 50000,
      salesTaxPercent: 4,
      transportCost: 15000,
      historyDays: 60,
    });
  });

  it("sanitizes corrupt and unsafe numeric values", () => {
    const workspace = parseBlackMarketWorkspace({
      version: 1,
      workspace: {
        selectedItemId: "",
        enchantment: 8,
        server: "invalid",
        purchaseMarketKey: "",
        quality: 9,
        quantity: -5,
        saleUnitPriceOverride: -1,
        salesTaxPercent: 100,
        transportCost: -50,
        historyDays: 180,
      },
    });

    expect(workspace).toEqual({
      selectedItemId: null,
      enchantment: 0,
      server: "west",
      purchaseMarketKey: "caerleon",
      quality: 1,
      quantity: 1,
      saleUnitPriceOverride: null,
      salesTaxPercent: 4,
      transportCost: 0,
      historyDays: 28,
    });
  });

  it("ignores unsupported storage versions", () => {
    expect(parseBlackMarketWorkspace({ version: 99, workspace: {} })).toEqual({
      selectedItemId: null,
      enchantment: 0,
      server: "west",
      purchaseMarketKey: "caerleon",
      quality: 1,
      quantity: 1,
      saleUnitPriceOverride: null,
      salesTaxPercent: 4,
      transportCost: 0,
      historyDays: 28,
    });
  });
});
