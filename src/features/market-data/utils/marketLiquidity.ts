import type {
  MarketHistorySnapshot,
  MarketHistorySummary,
} from '../types/MarketHistory'
import type {
  MarketCityId,
  MarketPriceFreshness,
  PurchaseStrategy,
  SaleStrategy,
} from '../types/MarketPrice'
import {
  buildMarketHistoryView,
  getCompletedUtcDateRange,
} from './marketHistoryAnalytics'

export type MarketLiquidityConfidence = 'high' | 'medium' | 'low' | 'none'
export type MarketLiquiditySide = 'purchase' | 'sale'

export type MarketLiquidityReasonCode =
  | 'missing-current-price'
  | 'stale-current-price'
  | 'missing-history'
  | 'stale-history'
  | 'insufficient-history'
  | 'insufficient-active-days'
  | 'slow-estimated-fill'
  | 'price-outlier'
  | 'low-confidence'

export interface MarketLiquidityAssessment {
  readonly city: MarketCityId
  readonly side: MarketLiquiditySide
  readonly currentPrice: number | null
  readonly requiredQuantity: number
  readonly confidence: MarketLiquidityConfidence
  readonly isEligibleForRecommendation: boolean
  readonly isPriceOutlier: boolean
  readonly priceRatioToMedian: number | null
  readonly estimatedDaysToFill: number | null
  readonly volumeCoverage28d: number
  readonly summary: MarketHistorySummary
  readonly reasonCodes: readonly MarketLiquidityReasonCode[]
}

interface AssessMarketLiquidityParams {
  readonly city: MarketCityId
  readonly side: MarketLiquiditySide
  readonly strategy: PurchaseStrategy | SaleStrategy
  readonly currentPrice: number | null
  readonly freshness: MarketPriceFreshness
  readonly requiredQuantity: number
  readonly snapshot: MarketHistorySnapshot | null | undefined
  readonly now?: number
}

const EMPTY_SUMMARY = buildMarketHistoryView(null, 28).summary

// La fecha del precio es una señal de confianza: el historial reciente puede
// respaldar un valor sin fecha y mantenerlo elegible con confianza media.
const HARD_REJECTION_REASONS: readonly MarketLiquidityReasonCode[] = [
  'missing-current-price',
  'missing-history',
  'stale-history',
  'insufficient-active-days',
  'slow-estimated-fill',
  'price-outlier',
]

function isNaturallyDiscountedStrategy(
  strategy: PurchaseStrategy | SaleStrategy,
): boolean {
  return strategy === 'buy-order' || strategy === 'sell-now'
}

function detectPriceOutlier(
  currentPrice: number,
  medianPrice: number | null,
  strategy: PurchaseStrategy | SaleStrategy,
): { readonly outlier: boolean; readonly ratio: number | null } {
  if (medianPrice === null || medianPrice <= 0) {
    return { outlier: false, ratio: null }
  }

  const ratio = currentPrice / medianPrice
  const minimumRatio = isNaturallyDiscountedStrategy(strategy) ? 0.15 : 0.35
  const maximumRatio = 3

  return {
    outlier: ratio < minimumRatio || ratio > maximumRatio,
    ratio,
  }
}

export function assessMarketLiquidity({
  city,
  side,
  strategy,
  currentPrice,
  freshness,
  requiredQuantity,
  snapshot,
  now = Date.now(),
}: AssessMarketLiquidityParams): MarketLiquidityAssessment {
  const safeQuantity = Math.max(1, Math.ceil(requiredQuantity))
  const expectedRangeEnd = getCompletedUtcDateRange(28, now).end
  const hasCurrentHistory = snapshot?.rangeEnd === expectedRangeEnd
  const summary = hasCurrentHistory && snapshot
    ? buildMarketHistoryView(snapshot, 28).summary
    : EMPTY_SUMMARY
  const estimatedDaysToFill =
    summary.averageDailyVolume > 0
      ? safeQuantity / summary.averageDailyVolume
      : null
  const volumeCoverage28d = summary.totalVolume / safeQuantity
  const outlier =
    currentPrice !== null && currentPrice > 0
      ? detectPriceOutlier(currentPrice, summary.medianPrice, strategy)
      : { outlier: false, ratio: null }
  const reasons: MarketLiquidityReasonCode[] = []

  if (currentPrice === null || !Number.isFinite(currentPrice) || currentPrice <= 0) {
    reasons.push('missing-current-price')
  }

  if (freshness === 'stale' || freshness === 'missing') {
    reasons.push('stale-current-price')
  }

  if (snapshot && !hasCurrentHistory) {
    reasons.push('stale-history')
  }

  if (!snapshot || summary.totalVolume <= 0 || summary.medianPrice === null) {
    reasons.push('missing-history')
  } else {
    if (summary.observedPriceDays < 3) {
      reasons.push('insufficient-history')
    }

    if (summary.activeVolumeDays < 2) {
      reasons.push('insufficient-active-days')
    }

    if (estimatedDaysToFill === null || estimatedDaysToFill > 14) {
      reasons.push('slow-estimated-fill')
    }

    if (outlier.outlier) {
      reasons.push('price-outlier')
    }
  }

  const hasHardRejection = reasons.some((reason) =>
    HARD_REJECTION_REASONS.includes(reason),
  )
  const mediumActivity =
    summary.activeVolumeDays >= 4 || volumeCoverage28d >= 8
  const mediumConfidence =
    !hasHardRejection &&
    summary.observedPriceDays >= 3 &&
    mediumActivity &&
    estimatedDaysToFill !== null &&
    estimatedDaysToFill <= 7
  const highConfidence =
    mediumConfidence &&
    freshness === 'recent' &&
    summary.observedPriceDays >= 10 &&
    summary.activeVolumeDays >= 10 &&
    estimatedDaysToFill !== null &&
    estimatedDaysToFill <= 3

  let confidence: MarketLiquidityConfidence = 'none'

  if (highConfidence) {
    confidence = 'high'
  } else if (mediumConfidence) {
    confidence = 'medium'
  } else if (
    !hasHardRejection &&
    summary.totalVolume > 0 &&
    estimatedDaysToFill !== null
  ) {
    confidence = 'low'
    reasons.push('low-confidence')
  }

  return {
    city,
    side,
    currentPrice,
    requiredQuantity: safeQuantity,
    confidence,
    isEligibleForRecommendation:
      confidence === 'high' || confidence === 'medium',
    isPriceOutlier: outlier.outlier,
    priceRatioToMedian: outlier.ratio,
    estimatedDaysToFill,
    volumeCoverage28d,
    summary,
    reasonCodes: Array.from(new Set(reasons)),
  }
}

export function getMarketLiquidityReasonLabel(
  reason: MarketLiquidityReasonCode,
): string {
  switch (reason) {
    case 'missing-current-price':
      return 'sin precio actual válido'
    case 'stale-current-price':
      return 'fecha del precio actual antigua o ausente'
    case 'missing-history':
      return 'sin ventas históricas en 28 días'
    case 'stale-history':
      return 'historial pendiente de actualización'
    case 'insufficient-history':
      return 'muy pocos días con precio observado'
    case 'insufficient-active-days':
      return 'actividad en menos de 2 días'
    case 'slow-estimated-fill':
      return 'más de 14 días estimados para completar la cantidad'
    case 'price-outlier':
      return 'precio atípico frente a la mediana histórica'
    case 'low-confidence':
      return 'confianza insuficiente para aplicar automáticamente'
  }
}
