export type BlackMarketQualityLevel = 1 | 2 | 3 | 4 | 5;

export interface BlackMarketQualityProbability {
  readonly quality: BlackMarketQualityLevel;
  readonly probability: number;
}

export interface BlackMarketQualityPricePoint {
  readonly minimumQuality: BlackMarketQualityLevel;
  readonly unitPrice: number;
}

export interface BlackMarketQualityValuation {
  readonly distribution: readonly BlackMarketQualityProbability[];
  readonly successProbability: number;
  readonly expectedTargetUnits: number;
  readonly expectedAlternativeUnits: number;
  readonly expectedGrossRevenue: number;
  readonly expectedTargetRevenue: number;
  readonly expectedAlternativeRevenue: number;
}

const BASE_QUALITY_PROBABILITIES: Readonly<Record<BlackMarketQualityLevel, number>> = {
  1: 0.689,
  2: 0.25,
  3: 0.05,
  4: 0.01,
  5: 0.001,
};

const QUALITY_LEVELS: readonly BlackMarketQualityLevel[] = [1, 2, 3, 4, 5];

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function distributionForRollCount(
  rollCount: number,
): readonly BlackMarketQualityProbability[] {
  const rolls = Math.max(1, Math.floor(finiteNonNegative(rollCount)));
  let cumulative = 0;
  let previousMaximumCdf = 0;

  return QUALITY_LEVELS.map((quality) => {
    cumulative += BASE_QUALITY_PROBABILITIES[quality];
    const maximumCdf = Math.pow(clampProbability(cumulative), rolls);
    const probability = clampProbability(maximumCdf - previousMaximumCdf);
    previousMaximumCdf = maximumCdf;
    return { quality, probability };
  });
}

export function calculateBlackMarketQualityDistribution(
  qualityIncreasePercent: number,
): readonly BlackMarketQualityProbability[] {
  const bonus = finiteNonNegative(qualityIncreasePercent);
  if (bonus === 0) {
    return QUALITY_LEVELS.map((quality) => ({
      quality,
      probability: BASE_QUALITY_PROBABILITIES[quality],
    }));
  }
  const guaranteedExtraRolls = Math.floor(bonus / 100);
  const fractionalExtraRoll = (bonus % 100) / 100;
  const baseRollCount = 1 + guaranteedExtraRolls;
  const baseDistribution = distributionForRollCount(baseRollCount);

  if (fractionalExtraRoll === 0) return baseDistribution;

  const extraDistribution = distributionForRollCount(baseRollCount + 1);
  return baseDistribution.map((entry, index) => ({
    quality: entry.quality,
    probability:
      entry.probability * (1 - fractionalExtraRoll) +
      extraDistribution[index].probability * fractionalExtraRoll,
  }));
}

export function buildBlackMarketQualityPriceSchedule(params: {
  readonly targetQuality: number;
  readonly targetUnitPrice: number;
  readonly availableOrders: readonly BlackMarketQualityPricePoint[];
  readonly lowerQualityFallbackPercent: number;
}): ReadonlyMap<BlackMarketQualityLevel, number> {
  const targetQuality = Math.min(
    5,
    Math.max(1, Math.floor(params.targetQuality)),
  ) as BlackMarketQualityLevel;
  const targetPrice = finiteNonNegative(params.targetUnitPrice);
  const fallbackRate = Math.min(
    1,
    finiteNonNegative(params.lowerQualityFallbackPercent) / 100,
  );
  const normalizedOrders = params.availableOrders
    .map((order) => ({
      minimumQuality: Math.min(
        5,
        Math.max(1, Math.floor(order.minimumQuality)),
      ) as BlackMarketQualityLevel,
      unitPrice: finiteNonNegative(order.unitPrice),
    }))
    .filter((order) => order.unitPrice > 0);

  const schedule = new Map<BlackMarketQualityLevel, number>();
  for (const craftedQuality of QUALITY_LEVELS) {
    let bestPrice = craftedQuality >= targetQuality ? targetPrice : 0;
    for (const order of normalizedOrders) {
      if (
        order.minimumQuality <= craftedQuality &&
        order.unitPrice > bestPrice
      ) {
        bestPrice = order.unitPrice;
      }
    }

    if (bestPrice === 0 && craftedQuality < targetQuality) {
      bestPrice = targetPrice * fallbackRate;
    }
    schedule.set(craftedQuality, bestPrice);
  }

  return schedule;
}

export function calculateBlackMarketQualityValuation(params: {
  readonly quantity: number;
  readonly targetQuality: number;
  readonly qualityIncreasePercent: number;
  readonly targetUnitPrice: number;
  readonly priceSchedule: ReadonlyMap<BlackMarketQualityLevel, number>;
}): BlackMarketQualityValuation {
  const quantity = Math.max(1, Math.floor(finiteNonNegative(params.quantity)));
  const targetQuality = Math.min(
    5,
    Math.max(1, Math.floor(params.targetQuality)),
  ) as BlackMarketQualityLevel;
  const targetPrice = finiteNonNegative(params.targetUnitPrice);
  const distribution = calculateBlackMarketQualityDistribution(
    params.qualityIncreasePercent,
  );

  let successProbability = 0;
  let expectedGrossRevenue = 0;
  let expectedTargetRevenue = 0;
  let expectedAlternativeRevenue = 0;

  for (const entry of distribution) {
    const unitPrice = finiteNonNegative(
      params.priceSchedule.get(entry.quality) ?? 0,
    );
    const revenue = entry.probability * quantity * unitPrice;
    expectedGrossRevenue += revenue;

    if (entry.quality >= targetQuality) {
      successProbability += entry.probability;
      expectedTargetRevenue += entry.probability * quantity * targetPrice;
      expectedAlternativeRevenue +=
        entry.probability * quantity * Math.max(0, unitPrice - targetPrice);
    } else {
      expectedAlternativeRevenue += revenue;
    }
  }

  const expectedTargetUnits = quantity * clampProbability(successProbability);

  return {
    distribution,
    successProbability: clampProbability(successProbability),
    expectedTargetUnits,
    expectedAlternativeUnits: quantity - expectedTargetUnits,
    expectedGrossRevenue,
    expectedTargetRevenue,
    expectedAlternativeRevenue,
  };
}
