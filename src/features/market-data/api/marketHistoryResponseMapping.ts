import type { MarketHistoryPoint } from '../types/MarketHistory'

interface MarketHistoryPointPayload {
  readonly timestamp?: unknown
  readonly itemCount?: unknown
  readonly averageUnitPrice?: unknown
}

export function normalizeHistoryTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? value : null
}

function normalizeFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function mapHistoryPoints(
  value: unknown,
): readonly MarketHistoryPoint[] {
  if (!Array.isArray(value)) return []

  const pointsByTimestamp = new Map<string, MarketHistoryPoint>()

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue

    const point = candidate as MarketHistoryPointPayload
    const timestamp = normalizeHistoryTimestamp(point.timestamp)
    if (!timestamp) continue

    const count = normalizeFiniteNumber(point.itemCount)
    const averagePrice = normalizeFiniteNumber(point.averageUnitPrice)

    pointsByTimestamp.set(timestamp, {
      timestamp,
      averagePrice:
        averagePrice !== null && averagePrice > 0 ? averagePrice : null,
      itemCount: count === null ? 0 : Math.max(0, count),
    })
  }

  return Array.from(pointsByTimestamp.values()).sort(
    (left, right) =>
      Date.parse(left.timestamp) - Date.parse(right.timestamp),
  )
}
