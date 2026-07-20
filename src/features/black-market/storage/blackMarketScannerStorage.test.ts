import { describe, expect, it } from "vitest";
import {
  DEFAULT_BLACK_MARKET_SCANNER_FILTERS,
  parseBlackMarketScannerFilters,
} from "./blackMarketScannerStorage";

describe("parseBlackMarketScannerFilters", () => {
  it("restores legacy filters and adds conservative strategy defaults", () => {
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

    expect(filters).toMatchObject({
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
      strategyFilter: "all",
      strategySort: "best-profit",
      limit: 100,
    });
  });

  it("restores the complete economic assumptions model", () => {
    const filters = parseBlackMarketScannerFilters({
      version: 2,
      filters: {
        ...DEFAULT_BLACK_MARKET_SCANNER_FILTERS,
        focusValuePerPoint: 12.5,
        lowerQualityFallbackPercent: 55,
        materialTransportCostPerBatch: 40_000,
        finishedTransportCostPerUnit: 2_000,
        escortCostPerBatch: 15_000,
        deathProbabilityPercent: 7.5,
        timeCostPerBatch: 25_000,
        strategyFilter: "craft-with-focus",
        strategySort: "advantage",
        limit: 50,
      },
    });

    expect(filters).toMatchObject({
      focusValuePerPoint: 12.5,
      lowerQualityFallbackPercent: 55,
      materialTransportCostPerBatch: 40_000,
      finishedTransportCostPerUnit: 2_000,
      escortCostPerBatch: 15_000,
      deathProbabilityPercent: 7.5,
      timeCostPerBatch: 25_000,
      strategyFilter: "craft-with-focus",
      strategySort: "advantage",
      limit: 50,
    });
  });

  it("sanitizes corrupt filters without leaving empty selections", () => {
    const filters = parseBlackMarketScannerFilters({
      version: 2,
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
        focusValuePerPoint: -1,
        lowerQualityFallbackPercent: 101,
        materialTransportCostPerBatch: -1,
        finishedTransportCostPerUnit: -1,
        escortCostPerBatch: -1,
        deathProbabilityPercent: 101,
        timeCostPerBatch: -1,
        strategyFilter: "invalid",
        strategySort: "invalid",
        sort: "random",
        limit: 1000,
      },
    });

    expect(filters).toEqual(DEFAULT_BLACK_MARKET_SCANNER_FILTERS);
  });

  it("ignores unsupported versions", () => {
    expect(parseBlackMarketScannerFilters({ version: 3, filters: {} })).toEqual(
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS,
    );
  });
});
