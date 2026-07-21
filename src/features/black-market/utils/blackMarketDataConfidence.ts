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
    reasons.push("El precio se actualizó hace más de 6 horas.");
  } else if (evidence.ageMinutes > 30) {
    reasons.push("El precio se actualizó hace más de 30 minutos.");
  }
  if (observations7d < 3) {
    reasons.push("Hay menos de 3 precios guardados en los últimos 7 días.");
  } else if (observations7d < 7) {
    reasons.push("Hay pocos precios guardados para compararlo.");
  }
  if (volume7d < 20) {
    reasons.push("Se registraron muy pocas unidades durante los últimos 7 días.");
  } else if (volume7d < 100) {
    reasons.push("La actividad registrada es moderada.");
  }
  if (
    deviationFromMedianPercent !== null &&
    Math.abs(deviationFromMedianPercent) > 35
  ) {
    reasons.push(
      "El precio está a más de 35% de lo habitual en los últimos 7 días.",
    );
  } else if (
    deviationFromMedianPercent !== null &&
    Math.abs(deviationFromMedianPercent) > 15
  ) {
    reasons.push(
      "El precio está a más de 15% de lo habitual en los últimos 7 días.",
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
