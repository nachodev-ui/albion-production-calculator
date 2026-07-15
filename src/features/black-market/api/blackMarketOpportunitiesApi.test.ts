import { describe, expect, it } from "vitest";
import { BlackMarketApiError } from "./blackMarketApi";
import { parseBlackMarketOpportunities } from "./blackMarketOpportunitiesApi";

const validResponse = {
  requestedAt: "2026-07-15T08:00:00Z",
  server: "west",
  totalMatching: 1,
  returned: 1,
  limit: 100,
  offset: 0,
  sort: "profit",
  coverage: {
    blackMarketRows: 50,
    sourceMarketRows: 200,
    latestBlackMarketAt: "2026-07-15T07:58:00Z",
    latestSourceMarketAt: "2026-07-15T07:57:00Z",
    selectedMarketKeys: ["martlock", "caerleon"],
  },
  data: [
    {
      id: "T8_2H_HALBERD@2:martlock:q3:bmq2",
      itemIdentifier: "T8_2H_HALBERD@2",
      tier: 8,
      enchantment: 2,
      category: "weapon",
      purchaseMarketKey: "martlock",
      purchaseQuality: 3,
      purchaseUnitPrice: 820000,
      purchasePriceDate: "2026-07-15T07:57:00Z",
      purchaseAgeMinutes: 3,
      blackMarketQuality: 2,
      blackMarketBuyUnitPrice: 1510000,
      blackMarketBuyPriceDate: "2026-07-15T07:58:00Z",
      blackMarketAgeMinutes: 2,
      blackMarketSellUnitPrice: 1600000,
      blackMarketSellPriceDate: "2026-07-15T07:55:00Z",
      blackMarketOrderDifference: 90000,
      estimatedSalesTax: 60400,
      transportCostPerUnit: 0,
      netUnitRevenue: 1449600,
      profit: 629600,
      marginPercent: 41.69,
      returnOnCostPercent: 76.78,
      breakEvenUnitPrice: 854167,
      caerleonCompetition: {
        available: true,
        purchaseUnitPrice: 900000,
        purchaseQuality: 3,
        purchasePriceDate: "2026-07-15T07:40:00Z",
        ageMinutes: 20,
        profit: 549600,
        canFillProfitably: true,
      },
      risk: "medium",
      riskReasons: ["La misma orden puede completarse desde Caerleon."],
    },
  ],
  warnings: [],
};

describe("parseBlackMarketOpportunities", () => {
  it("parses direct city-to-Black-Market comparisons", () => {
    const result = parseBlackMarketOpportunities(validResponse);
    expect(result.totalMatching).toBe(1);
    expect(result.data[0]?.profit).toBe(629600);
    expect(result.data[0]?.caerleonCompetition.canFillProfitably).toBe(true);
  });

  it("accepts empty coverage and warnings", () => {
    const result = parseBlackMarketOpportunities({
      ...validResponse,
      totalMatching: 0,
      returned: 0,
      coverage: {
        ...validResponse.coverage,
        blackMarketRows: 0,
        latestBlackMarketAt: null,
      },
      data: [],
      warnings: ["No hay órdenes almacenadas."],
    });
    expect(result.data).toEqual([]);
    expect(result.coverage.latestBlackMarketAt).toBeNull();
  });

  it("rejects unknown risk values", () => {
    expect(() =>
      parseBlackMarketOpportunities({
        ...validResponse,
        data: [{ ...validResponse.data[0], risk: "critical" }],
      }),
    ).toThrow(BlackMarketApiError);
  });
});
