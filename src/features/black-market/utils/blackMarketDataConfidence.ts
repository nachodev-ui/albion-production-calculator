export type BlackMarketDataConfidenceLevel = "high" | "medium" | "low";

export interface BlackMarketDataEvidence {
  readonly ageMinutes: number | null;
  readonly unitPrice: number | null;
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
  const hasCurrentPrice =
    evidence.unitPrice !== null && evidence.unitPrice > 0;
  const hasAge = evidence.ageMinutes !== null && evidence.ageMinutes >= 0;
  const deviationFromMedianPercent =
    hasCurrentPrice && evidence.medianPrice7d !== null
      ? percentDifference(evidence.unitPrice as number, evidence.medianPrice7d)
      : null;
  const currentSpreadPercent = spreadPercent(
    evidence.buyPrice,
    evidence.sellPrice,
  );
  const reasons: string[] = [];

  if (!hasCurrentPrice) {
    reasons.push("No hay un precio disponible para el modo de venta seleccionado.");
  }
  if (!hasAge) {
    reasons.push("No hay fecha de actualización para este precio.");
  } else if ((evidence.ageMinutes as number) > 360) {
    reasons.push("El precio se actualizó hace más de 6 horas.");
  } else if ((evidence.ageMinutes as number) > 30) {
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

  const ageMinutes = evidence.ageMinutes ?? Number.POSITIVE_INFINITY;
  const high =
    hasCurrentPrice &&
    hasAge &&
    ageMinutes <= 30 &&
    observations7d >= 7 &&
    volume7d >= 100 &&
    (deviationFromMedianPercent === null ||
      Math.abs(deviationFromMedianPercent) <= 15);
  const medium =
    hasCurrentPrice &&
    hasAge &&
    ageMinutes <= 360 &&
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
