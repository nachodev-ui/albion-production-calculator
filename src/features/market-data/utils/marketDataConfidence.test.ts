import { describe, expect, it } from 'vitest'
import type { MarketPriceSnapshot } from '../types/MarketPrice'
import { buildMarketDataConfidence } from './marketDataConfidence'

function snapshot(
  overrides: Record<string, unknown> = {},
): MarketPriceSnapshot {
  return {
    server: 'americas',
    itemIdentifier: 'T4_BAG',
    city: 'martlock',
    quality: 1,
    sellPriceMin: 1_100,
    sellPriceMinDate: '2026-07-21T12:00:00Z',
    buyPriceMax: 1_000,
    buyPriceMaxDate: '2026-07-21T12:00:00Z',
    source: 'central-api',
    fetchedAt: '2026-07-21T12:05:00Z',
    ...overrides,
  } as MarketPriceSnapshot
}

describe('buildMarketDataConfidence', () => {
  it('clasifica evidencia reciente, líquida y cercana a la mediana como alta', () => {
    const result = buildMarketDataConfidence({
      priceValue: 1_100,
      updatedAt: '2026-07-21T12:00:00Z',
      snapshot: snapshot({
        historyObservations7d: 14,
        historyVolume7d: 420,
        medianPrice7d: 1_050,
      }),
      now: Date.parse('2026-07-21T12:20:00Z'),
    })

    expect(result.level).toBe('high')
    expect(result.deviationFromMedianPercent).toBeCloseTo(4.76, 1)
    expect(result.spreadPercent).toBeCloseTo(9.52, 1)
  })

  it('clasifica una muestra moderada como confianza media', () => {
    const result = buildMarketDataConfidence({
      priceValue: 1_250,
      updatedAt: '2026-07-21T10:30:00Z',
      snapshot: snapshot({
        historyObservations7d: 4,
        historyVolume7d: 42,
        medianPrice7d: 1_100,
      }),
      now: Date.parse('2026-07-21T12:00:00Z'),
    })

    expect(result.level).toBe('medium')
    expect(result.reasons).toContain('La muestra histórica todavía es limitada.')
  })

  it('clasifica una orden antigua, ilíquida y atípica como baja', () => {
    const result = buildMarketDataConfidence({
      priceValue: 2_000,
      updatedAt: '2026-07-20T22:00:00Z',
      snapshot: snapshot({
        historyObservations7d: 1,
        historyVolume7d: 3,
        medianPrice7d: 1_000,
      }),
      now: Date.parse('2026-07-21T12:00:00Z'),
    })

    expect(result.level).toBe('low')
    expect(result.reasons).toContain('El precio tiene más de 6 horas de antigüedad.')
    expect(result.reasons).toContain(
      'La orden actual se aleja más de 35% de la mediana de 7 días.',
    )
  })
})
