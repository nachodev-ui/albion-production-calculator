import { describe, expect, it } from "vitest";
import { buildBlackMarketDataConfidence } from "./blackMarketDataConfidence";

describe("buildBlackMarketDataConfidence", () => {
  it("classifies recent, active and representative data as high", () => {
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
    expect(result.reasons).toEqual([]);
  });

  it("classifies a moderate amount of data as medium", () => {
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
      "Hay pocos precios guardados para compararlo.",
    );
  });

  it("classifies stale, inactive and unusual data as low", () => {
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
      "El precio se actualizó hace más de 6 horas.",
    );
    expect(result.reasons).toContain(
      "El precio está a más de 35% de lo habitual en los últimos 7 días.",
    );
  });

  it("treats missing saved prices as low confidence during rolling deployments", () => {
    const result = buildBlackMarketDataConfidence({
      ageMinutes: 5,
      unitPrice: 100_000,
      observations7d: 0,
      volume7d: 0,
      medianPrice7d: null,
      buyPrice: null,
      sellPrice: 100_000,
    });

    expect(result.level).toBe("low");
    expect(result.reasons).toContain(
      "Hay menos de 3 precios guardados en los últimos 7 días.",
    );
    expect(result.reasons).toContain(
      "Se registraron muy pocas unidades durante los últimos 7 días.",
    );
  });
});
