export type BlackMarketDataConfidenceLevel = "high" | "medium" | "low";

export interface BlackMarketDataEvidence {
  readonly ageMinutes: number;
  readonly unitPrice: number;
  readonly observations7d: number;
  readonly volume7d: number;
  readonly medianPrice7d: number | null;
  readonly buyPrice: number | null;
  readonly sellPrice: number | null;
}

export interface BlackMarketDataConfidence {
  readonly level: BlackMarketDataConfidenceLevel;
  readonly deviationFromMedianPercent: number | null;
  readonly spreadPercent: number | null;
  readonly reasons: readonly string[];
}

function percentDifference(value: number, reference: number): number | null {
  if (reference <= 0) return null;
  return ((value - reference) / reference) * 100;
}

function spreadPercent(
  buyPrice: number | null,
  sellPrice: number | null,
): number | null {
  if (
    buyPrice === null ||
    sellPrice === null ||
    buyPrice <= 0 ||
    sellPrice <= 0
  ) {
    return null;
  }
  const midpoint = (buyPrice + sellPrice) / 2;
  return midpoint > 0 ? ((sellPrice - buyPrice) / midpoint) * 100 : null;
}

export function buildBlackMarketDataConfidence(
  evidence: BlackMarketDataEvidence,
): BlackMarketDataConfidence {
  const observations7d = Math.max(0, Math.trunc(evidence.observations7d));
  const volume7d = Math.max(0, Math.trunc(evidence.volume7d));
  const deviationFromMedianPercent =
    evidence.medianPrice7d !== null
      ? percentDifference(evidence.unitPrice, evidence.medianPrice7d)
      : null;
  const currentSpreadPercent = spreadPercent(
    evidence.buyPrice,
    evidence.sellPrice,
  );
  const reasons: string[] = [];

  if (evidence.ageMinutes > 360) {
    reasons.push("El precio tiene más de 6 horas de antigüedad.");
  } else if (evidence.ageMinutes > 30) {
    reasons.push("El precio tiene más de 30 minutos de antigüedad.");
  }
  if (observations7d < 3) {
    reasons.push("Hay menos de 3 observaciones históricas en 7 días.");
  } else if (observations7d < 7) {
    reasons.push("La muestra histórica todavía es limitada.");
  }
  if (volume7d < 20) {
    reasons.push("El volumen histórico registrado es bajo.");
  } else if (volume7d < 100) {
    reasons.push("El volumen histórico es moderado.");
  }
  if (
    deviationFromMedianPercent !== null &&
    Math.abs(deviationFromMedianPercent) > 35
  ) {
    reasons.push(
      "La orden actual se aleja más de 35% de la mediana de 7 días.",
    );
  } else if (
    deviationFromMedianPercent !== null &&
    Math.abs(deviationFromMedianPercent) > 15
  ) {
    reasons.push(
      "La orden actual se aleja más de 15% de la mediana de 7 días.",
    );
  }

  const high =
    evidence.ageMinutes <= 30 &&
    observations7d >= 7 &&
    volume7d >= 100 &&
    (deviationFromMedianPercent === null ||
      Math.abs(deviationFromMedianPercent) <= 15);
  const medium =
    evidence.ageMinutes <= 360 &&
    observations7d >= 3 &&
    volume7d >= 20 &&
    (deviationFromMedianPercent === null ||
      Math.abs(deviationFromMedianPercent) <= 35);

  return {
    level: high ? "high" : medium ? "medium" : "low",
    deviationFromMedianPercent,
    spreadPercent: currentSpreadPercent,
    reasons,
  };
}
