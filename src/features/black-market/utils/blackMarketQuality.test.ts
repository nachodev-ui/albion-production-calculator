import { describe, expect, it } from "vitest";
import {
  buildBlackMarketQualityPriceSchedule,
  calculateBlackMarketQualityDistribution,
  calculateBlackMarketQualityValuation,
} from "./blackMarketQuality";

describe("calculateBlackMarketQualityDistribution", () => {
  it("uses the documented base quality table without bonuses", () => {
    expect(calculateBlackMarketQualityDistribution(0)).toEqual([
      { quality: 1, probability: 0.689 },
      { quality: 2, probability: 0.25 },
      { quality: 3, probability: 0.05 },
      { quality: 4, probability: 0.01 },
      { quality: 5, probability: 0.001 },
    ]);
  });

  it("treats 100 percent quality increase as one additional best-of roll", () => {
    const distribution = calculateBlackMarketQualityDistribution(100);
    const normal = distribution.find((entry) => entry.quality === 1);
    const masterpiece = distribution.find((entry) => entry.quality === 5);

    expect(normal?.probability).toBeCloseTo(0.689 ** 2, 8);
    expect(masterpiece?.probability).toBeCloseTo(1 - 0.999 ** 2, 8);
    expect(
      distribution.reduce((total, entry) => total + entry.probability, 0),
    ).toBeCloseTo(1, 10);
  });
});

describe("calculateBlackMarketQualityValuation", () => {
  it("weights the target order and observed lower-quality alternatives", () => {
    const schedule = buildBlackMarketQualityPriceSchedule({
      targetQuality: 4,
      targetUnitPrice: 100_000,
      availableOrders: [
        { minimumQuality: 1, unitPrice: 40_000 },
        { minimumQuality: 3, unitPrice: 70_000 },
      ],
      lowerQualityFallbackPercent: 0,
    });
    const result = calculateBlackMarketQualityValuation({
      quantity: 10,
      targetQuality: 4,
      qualityIncreasePercent: 0,
      targetUnitPrice: 100_000,
      priceSchedule: schedule,
    });

    expect(result.successProbability).toBeCloseTo(0.011, 8);
    expect(result.expectedTargetUnits).toBeCloseTo(0.11, 8);
    expect(result.expectedGrossRevenue).toBeCloseTo(421_600, 4);
    expect(result.expectedAlternativeRevenue).toBeCloseTo(410_600, 4);
  });
});
