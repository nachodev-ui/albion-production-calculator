import { describe, expect, it } from 'vitest'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import {
  buildMarketHistoryView,
  getCompletedUtcDateRange,
  normalizeDailyMarketHistory,
  summarizeMarketHistory,
} from './marketHistoryAnalytics'

const snapshot: MarketHistorySnapshot = {
  server: 'americas',
  itemIdentifier: 'T4_SWORD',
  city: 'martlock',
  quality: 1,
  rangeStart: '2026-06-01',
  rangeEnd: '2026-06-07',
  points: [
    {
      timestamp: '2026-06-01T00:00:00Z',
      averagePrice: 100,
      itemCount: 10,
    },
    {
      timestamp: '2026-06-03T00:00:00Z',
      averagePrice: 200,
      itemCount: 30,
    },
    {
      timestamp: '2026-06-07T00:00:00Z',
      averagePrice: 300,
      itemCount: 0,
    },
  ],
  fetchedAt: '2026-06-08T01:00:00Z',
}

describe('marketHistoryAnalytics', () => {
  it('rellena los días omitidos por el servicio local con volumen cero', () => {
    const normalized = normalizeDailyMarketHistory(snapshot)

    expect(normalized).toHaveLength(7)
    expect(normalized[1]).toEqual({
      timestamp: '2026-06-02T00:00:00Z',
      averagePrice: null,
      itemCount: 0,
    })
  })

  it('calcula precio ponderado, rango y volumen diario incluyendo ceros', () => {
    const normalized = normalizeDailyMarketHistory(snapshot)
    const summary = summarizeMarketHistory(normalized, 7)

    expect(summary.averagePrice).toBe(175)
    expect(summary.medianPrice).toBe(200)
    expect(summary.lowerQuartilePrice).toBe(150)
    expect(summary.upperQuartilePrice).toBe(250)
    expect(summary.minimumPrice).toBe(100)
    expect(summary.maximumPrice).toBe(300)
    expect(summary.totalVolume).toBe(40)
    expect(summary.averageDailyVolume).toBeCloseTo(40 / 7)
    expect(summary.activeVolumeDays).toBe(2)
    expect(summary.observedPriceDays).toBe(3)
    expect(summary.volatilityPercent).not.toBeNull()
  })

  it('recorta la vista al período seleccionado', () => {
    const view = buildMarketHistoryView(snapshot, 7)

    expect(view.points).toHaveLength(7)
    expect(view.summary.periodDays).toBe(7)
  })

  it('usa solamente días UTC completos', () => {
    const range = getCompletedUtcDateRange(
      28,
      Date.parse('2026-06-22T16:30:00Z'),
    )

    expect(range.start).toBe('2026-05-25')
    expect(range.end).toBe('2026-06-21')
  })
})
