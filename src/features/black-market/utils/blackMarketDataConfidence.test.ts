import { describe, expect, it } from "vitest";
import { buildBlackMarketDataConfidence } from "./blackMarketDataConfidence";

describe("buildBlackMarketDataConfidence", () => {
  it("classifies recent, liquid and representative evidence as high", () => {
    const result = buildBlackMarketDataConfidence({
      ageMinutes: 12,
      unitPrice: 105_000,
      observations7d: 12,
      volume7d: 350,
      medianPrice7d: 100_000,
      buyPrice: 95_000,
      sellPrice: 105_000,
    });

    expect(result.level).toBe("high");
    expect(result.deviationFromMedianPercent).toBeCloseTo(5);
    expect(result.spreadPercent).toBeCloseTo(10);
  });

  it("classifies moderate evidence as medium", () => {
    const result = buildBlackMarketDataConfidence({
      ageMinutes: 90,
      unitPrice: 120_000,
      observations7d: 4,
      volume7d: 45,
      medianPrice7d: 105_000,
      buyPrice: null,
      sellPrice: 120_000,
    });

    expect(result.level).toBe("medium");
    expect(result.reasons).toContain(
      "La muestra histórica todavía es limitada.",
    );
  });

  it("classifies stale, illiquid and atypical evidence as low", () => {
    const result = buildBlackMarketDataConfidence({
      ageMinutes: 500,
      unitPrice: 200_000,
      observations7d: 1,
      volume7d: 2,
      medianPrice7d: 100_000,
      buyPrice: 200_000,
      sellPrice: null,
    });

    expect(result.level).toBe("low");
    expect(result.reasons).toContain(
      "El precio tiene más de 6 horas de antigüedad.",
    );
    expect(result.reasons).toContain(
      "La orden actual se aleja más de 35% de la mediana de 7 días.",
    );
  });
});
