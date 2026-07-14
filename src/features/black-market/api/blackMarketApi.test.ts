import { describe, expect, it } from "vitest";
import { BlackMarketApiError, parseBlackMarketAnalysis } from "./blackMarketApi";

const validResponse = {
  requestedAt: "2026-07-14T12:00:00Z",
  server: "west",
  itemIdentifier: "T6_MAIN_SWORD@1",
  quality: 2,
  purchaseMarketKey: "caerleon",
  blackMarketKey: "black_market",
  purchase: {
    marketKey: "caerleon",
    unitPrice: 10000,
    priceDate: "2026-07-14T11:00:00Z",
    updatedAt: "2026-07-14T11:05:00Z",
    freshness: "fresh",
  },
  blackMarket: {
    marketKey: "black_market",
    unitPrice: 15000,
    priceDate: "2026-07-14T11:30:00Z",
    updatedAt: "2026-07-14T11:35:00Z",
    freshness: "fresh",
  },
  history: {
    rangeDays: 28,
    bucketCount: 1,
    soldUnits: 8,
    weightedAverageUnitPrice: 14000,
    lowestAverageUnitPrice: 14000,
    highestAverageUnitPrice: 14000,
    lastObservedAt: "2026-07-14T11:40:00Z",
    points: [
      {
        timestamp: "2026-07-14T00:00:00Z",
        itemCount: 8,
        averageUnitPrice: 14000,
      },
    ],
  },
  economics: {
    ready: true,
    quantity: 2,
    purchaseUnitPrice: 10000,
    saleUnitPrice: 15000,
    salePriceSource: "black-market-buy-order",
    purchaseCost: 20000,
    grossRevenue: 30000,
    salesTax: 1200,
    transportCost: 500,
    netRevenue: 28300,
    profit: 8300,
    profitPerUnit: 4150,
    marginPercent: 27.666,
    returnOnCostPercent: 40.487,
    breakEvenUnitPrice: 10678,
  },
  warnings: [],
};

describe("parseBlackMarketAnalysis", () => {
  it("parses a complete protected analysis", () => {
    const result = parseBlackMarketAnalysis(validResponse);
    expect(result.economics.profit).toBe(8300);
    expect(result.history.points).toHaveLength(1);
    expect(result.blackMarket.freshness).toBe("fresh");
  });

  it("allows missing central prices", () => {
    const result = parseBlackMarketAnalysis({
      ...validResponse,
      blackMarket: {
        ...validResponse.blackMarket,
        unitPrice: null,
        priceDate: null,
        freshness: "missing",
      },
      economics: {
        ...validResponse.economics,
        ready: false,
        saleUnitPrice: null,
        salePriceSource: "missing",
        purchaseCost: null,
        grossRevenue: null,
        salesTax: null,
        netRevenue: null,
        profit: null,
        profitPerUnit: null,
        marginPercent: null,
        returnOnCostPercent: null,
        breakEvenUnitPrice: null,
      },
    });

    expect(result.blackMarket.unitPrice).toBeNull();
    expect(result.economics.ready).toBe(false);
  });

  it("rejects an unexpected market identity", () => {
    expect(() =>
      parseBlackMarketAnalysis({
        ...validResponse,
        blackMarketKey: "caerleon",
      }),
    ).toThrow(BlackMarketApiError);
  });
});
