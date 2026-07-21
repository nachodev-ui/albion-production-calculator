import type {
  MarketPriceFreshness,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { classifyMarketPriceFreshness } from '../types/MarketPrice'

export type MarketDataConfidenceLevel = 'high' | 'medium' | 'low'

export interface MarketDataConfidence {
  readonly level: MarketDataConfidenceLevel
  readonly freshness: MarketPriceFreshness
  readonly observations7d: number
  readonly volume7d: number
  readonly medianPrice7d: number | null
  readonly deviationFromMedianPercent: number | null
  readonly spreadPercent: number | null
  readonly reasons: readonly string[]
}

function readNumber(
  snapshot: MarketPriceSnapshot | null,
  key: string,
): number | null {
  if (!snapshot) return null
  const value = (snapshot as unknown as Record<string, unknown>)[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function percentageDifference(value: number, reference: number): number | null {
  if (reference <= 0) return null
  return ((value - reference) / reference) * 100
}

function calculateSpread(snapshot: MarketPriceSnapshot | null): number | null {
  const sell = snapshot?.sellPriceMin ?? null
  const buy = snapshot?.buyPriceMax ?? null
  if (!sell || !buy || sell <= 0 || buy <= 0) return null

  const midpoint = (sell + buy) / 2
  return midpoint > 0 ? ((sell - buy) / midpoint) * 100 : null
}

export function buildMarketDataConfidence({
  priceValue,
  updatedAt,
  snapshot,
  now = Date.now(),
}: {
  readonly priceValue: number | null
  readonly updatedAt: string | null
  readonly snapshot: MarketPriceSnapshot | null
  readonly now?: number
}): MarketDataConfidence {
  const freshness = classifyMarketPriceFreshness(updatedAt, now)
  const observations7d = Math.max(
    0,
    Math.trunc(readNumber(snapshot, 'historyObservations7d') ?? 0),
  )
  const volume7d = Math.max(
    0,
    Math.trunc(readNumber(snapshot, 'historyVolume7d') ?? 0),
  )
  const medianPrice7d = readNumber(snapshot, 'medianPrice7d')
  const deviationFromMedianPercent =
    priceValue !== null && medianPrice7d !== null
      ? percentageDifference(priceValue, medianPrice7d)
      : null
  const spreadPercent = calculateSpread(snapshot)
  const reasons: string[] = []

  if (!snapshot || priceValue === null || freshness === 'missing') {
    reasons.push('Todavía no hay suficiente información sobre este precio.')
  }
  if (freshness === 'acceptable') {
    reasons.push('El precio se actualizó hace más de 30 minutos.')
  } else if (freshness === 'stale') {
    reasons.push('El precio se actualizó hace más de 6 horas.')
  }
  if (observations7d < 3) {
    reasons.push('Hay menos de 3 precios guardados en los últimos 7 días.')
  } else if (observations7d < 7) {
    reasons.push('Hay pocos precios guardados para compararlo.')
  }
  if (volume7d < 20) {
    reasons.push('Se registraron muy pocas unidades durante los últimos 7 días.')
  } else if (volume7d < 100) {
    reasons.push('La actividad registrada es moderada.')
  }
  if (
    deviationFromMedianPercent !== null &&
    Math.abs(deviationFromMedianPercent) > 35
  ) {
    reasons.push('El precio está a más de 35% de lo habitual en los últimos 7 días.')
  } else if (
    deviationFromMedianPercent !== null &&
    Math.abs(deviationFromMedianPercent) > 15
  ) {
    reasons.push('El precio está a más de 15% de lo habitual en los últimos 7 días.')
  }

  const hasHighEvidence =
    freshness === 'recent' &&
    observations7d >= 7 &&
    volume7d >= 100 &&
    (deviationFromMedianPercent === null ||
      Math.abs(deviationFromMedianPercent) <= 15)
  const hasMediumEvidence =
    (freshness === 'recent' || freshness === 'acceptable') &&
    observations7d >= 3 &&
    volume7d >= 20 &&
    (deviationFromMedianPercent === null ||
      Math.abs(deviationFromMedianPercent) <= 35)

  return {
    level: hasHighEvidence ? 'high' : hasMediumEvidence ? 'medium' : 'low',
    freshness,
    observations7d,
    volume7d,
    medianPrice7d,
    deviationFromMedianPercent,
    spreadPercent,
    reasons,
  }
}
