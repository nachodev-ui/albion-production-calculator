import type {
  MarketHistoryPeriodDays,
  MarketHistoryPoint,
  MarketHistorySnapshot,
  MarketHistorySummary,
  MarketHistoryView,
} from '../types/MarketHistory'

const DAY_MS = 24 * 60 * 60 * 1000

function parseUtcDateKey(date: string): number | null {
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(timestamp) ? timestamp : null
}

function toUtcDateKey(value: string): string | null {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp).toISOString().slice(0, 10)
}

function addUtcDays(date: string, days: number): string | null {
  const timestamp = parseUtcDateKey(date)
  if (timestamp === null) return null
  return new Date(timestamp + days * DAY_MS).toISOString().slice(0, 10)
}

export function getCompletedUtcDateRange(
  days: number,
  now = Date.now(),
): { readonly start: string; readonly end: string } {
  const currentUtcDay = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  )
  const endTimestamp = currentUtcDay - DAY_MS
  const startTimestamp = endTimestamp - (days - 1) * DAY_MS

  return {
    start: new Date(startTimestamp).toISOString().slice(0, 10),
    end: new Date(endTimestamp).toISOString().slice(0, 10),
  }
}

interface AggregatedDay {
  itemCount: number
  weightedPriceTotal: number
  weightedItemCount: number
  simplePriceTotal: number
  priceObservations: number
}

/**
 * Convierte la respuesta histórica en una serie diaria continua. Los días que
 * el servicio local omite se conservan con volumen 0 y precio nulo, evitando inflar la
 * liquidez media al contar solamente días con ventas.
 */
export function normalizeDailyMarketHistory(
  snapshot: MarketHistorySnapshot,
): readonly MarketHistoryPoint[] {
  const aggregated = new Map<string, AggregatedDay>()

  for (const point of snapshot.points) {
    const date = toUtcDateKey(point.timestamp)
    if (!date) continue

    const current = aggregated.get(date) ?? {
      itemCount: 0,
      weightedPriceTotal: 0,
      weightedItemCount: 0,
      simplePriceTotal: 0,
      priceObservations: 0,
    }

    const itemCount = Number.isFinite(point.itemCount)
      ? Math.max(0, point.itemCount)
      : 0

    current.itemCount += itemCount

    if (point.averagePrice !== null && point.averagePrice > 0) {
      current.simplePriceTotal += point.averagePrice
      current.priceObservations += 1

      if (itemCount > 0) {
        current.weightedPriceTotal += point.averagePrice * itemCount
        current.weightedItemCount += itemCount
      }
    }

    aggregated.set(date, current)
  }

  const normalized: MarketHistoryPoint[] = []
  let date: string | null = snapshot.rangeStart

  while (date !== null && date <= snapshot.rangeEnd) {
    const day = aggregated.get(date)
    let averagePrice: number | null = null

    if (day) {
      if (day.weightedItemCount > 0) {
        averagePrice = day.weightedPriceTotal / day.weightedItemCount
      } else if (day.priceObservations > 0) {
        averagePrice = day.simplePriceTotal / day.priceObservations
      }
    }

    normalized.push({
      timestamp: `${date}T00:00:00Z`,
      averagePrice,
      itemCount: day?.itemCount ?? 0,
    })

    if (date === snapshot.rangeEnd) break
    date = addUtcDays(date, 1)
  }

  return normalized
}


function percentile(sortedValues: readonly number[], percentileValue: number): number | null {
  if (sortedValues.length === 0) return null
  if (sortedValues.length === 1) return sortedValues[0] ?? null

  const position = (sortedValues.length - 1) * percentileValue
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const lower = sortedValues[lowerIndex] ?? 0
  const upper = sortedValues[upperIndex] ?? lower

  if (lowerIndex === upperIndex) return lower

  return lower + (upper - lower) * (position - lowerIndex)
}

function calculateVolatilityPercent(
  prices: readonly number[],
): number | null {
  if (prices.length < 2) return null

  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
  if (mean <= 0) return null

  const variance =
    prices.reduce((sum, price) => sum + (price - mean) ** 2, 0) /
    prices.length

  return (Math.sqrt(variance) / mean) * 100
}

export function summarizeMarketHistory(
  points: readonly MarketHistoryPoint[],
  periodDays: MarketHistoryPeriodDays,
): MarketHistorySummary {
  const selected = points.slice(-periodDays)
  const validPrices = selected
    .map((point) => point.averagePrice)
    .filter((price): price is number => price !== null && price > 0)

  const totalVolume = selected.reduce(
    (sum, point) => sum + Math.max(0, point.itemCount),
    0,
  )

  const weightedRows = selected.filter(
    (point) => point.averagePrice !== null && point.itemCount > 0,
  )
  const weightedVolume = weightedRows.reduce(
    (sum, point) => sum + point.itemCount,
    0,
  )

  let averagePrice: number | null = null

  if (weightedVolume > 0) {
    averagePrice =
      weightedRows.reduce(
        (sum, point) =>
          sum + (point.averagePrice ?? 0) * point.itemCount,
        0,
      ) / weightedVolume
  } else if (validPrices.length > 0) {
    averagePrice =
      validPrices.reduce((sum, price) => sum + price, 0) /
      validPrices.length
  }

  const sortedPrices = [...validPrices].sort((left, right) => left - right)

  return {
    periodDays,
    averagePrice,
    medianPrice: percentile(sortedPrices, 0.5),
    lowerQuartilePrice: percentile(sortedPrices, 0.25),
    upperQuartilePrice: percentile(sortedPrices, 0.75),
    minimumPrice:
      validPrices.length > 0 ? Math.min(...validPrices) : null,
    maximumPrice:
      validPrices.length > 0 ? Math.max(...validPrices) : null,
    totalVolume,
    averageDailyVolume: totalVolume / periodDays,
    volatilityPercent: calculateVolatilityPercent(validPrices),
    observedPriceDays: validPrices.length,
    activeVolumeDays: selected.filter((point) => point.itemCount > 0).length,
  }
}

export function buildMarketHistoryView(
  snapshot: MarketHistorySnapshot | null,
  periodDays: MarketHistoryPeriodDays,
): MarketHistoryView {
  if (!snapshot) {
    return {
      points: [],
      summary: summarizeMarketHistory([], periodDays),
    }
  }

  const normalized = normalizeDailyMarketHistory(snapshot)
  const points = normalized.slice(-periodDays)

  return {
    points,
    summary: summarizeMarketHistory(normalized, periodDays),
  }
}
