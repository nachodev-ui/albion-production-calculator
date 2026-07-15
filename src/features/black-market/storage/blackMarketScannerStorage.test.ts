import { describe, expect, it } from "vitest";
import {
  DEFAULT_BLACK_MARKET_SCANNER_FILTERS,
  parseBlackMarketScannerFilters,
} from "./blackMarketScannerStorage";

describe("parseBlackMarketScannerFilters", () => {
  it("restores valid comparative filters", () => {
    const filters = parseBlackMarketScannerFilters({
      version: 1,
      filters: {
        server: "europe",
        purchaseMarketKeys: ["martlock", "caerleon"],
        tiers: [7, 8],
        enchantments: [1, 2],
        qualities: [3, 4, 5],
        categories: ["weapon", "armor"],
        minimumProfit: 50000,
        minimumReturnOnCostPercent: 12.5,
        maximumCityAgeMinutes: 45,
        maximumBlackMarketAgeMinutes: 15,
        salesTaxPercent: 4,
        transportCostPerUnit: 2500,
        sort: "roi",
        limit: 250,
      },
    });

    expect(filters).toEqual({
      server: "europe",
      purchaseMarketKeys: ["martlock", "caerleon"],
      tiers: [7, 8],
      enchantments: [1, 2],
      qualities: [3, 4, 5],
      categories: ["weapon", "armor"],
      minimumProfit: 50000,
      minimumReturnOnCostPercent: 12.5,
      maximumCityAgeMinutes: 45,
      maximumBlackMarketAgeMinutes: 15,
      salesTaxPercent: 4,
      transportCostPerUnit: 2500,
      sort: "roi",
      limit: 250,
    });
  });

  it("sanitizes corrupt filters without leaving empty selections", () => {
    const filters = parseBlackMarketScannerFilters({
      version: 1,
      filters: {
        server: "invalid",
        purchaseMarketKeys: ["black_market"],
        tiers: [3],
        enchantments: [8],
        qualities: [0],
        categories: ["resource"],
        minimumProfit: -1,
        minimumReturnOnCostPercent: -4,
        maximumCityAgeMinutes: 0,
        maximumBlackMarketAgeMinutes: 20000,
        salesTaxPercent: 100,
        transportCostPerUnit: -1,
        sort: "random",
        limit: 1000,
      },
    });

    expect(filters).toEqual(DEFAULT_BLACK_MARKET_SCANNER_FILTERS);
  });

  it("ignores unsupported versions", () => {
    expect(parseBlackMarketScannerFilters({ version: 2, filters: {} })).toEqual(
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS,
    );
  });
});
