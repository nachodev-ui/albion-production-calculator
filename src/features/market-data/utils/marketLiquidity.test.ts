import { describe, expect, it } from 'vitest'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import { assessMarketLiquidity } from './marketLiquidity'

function buildSnapshot({
  price = 100,
  dailyVolume = 20,
  activeDays = 28,
}: {
  readonly price?: number
  readonly dailyVolume?: number
  readonly activeDays?: number
} = {}): MarketHistorySnapshot {
  return {
    server: 'americas',
    itemIdentifier: 'T5_PLANKS',
    city: 'martlock',
    quality: 1,
    rangeStart: '2026-05-27',
    rangeEnd: '2026-06-23',
    points: Array.from({ length: activeDays }, (_, index) => ({
      timestamp: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
      averagePrice: price,
      itemCount: dailyVolume,
    })),
    fetchedAt: '2026-06-24T12:00:00Z',
  }
}

const NOW = Date.parse('2026-06-24T12:00:00Z')

describe('assessMarketLiquidity', () => {
  it('acepta un mercado reciente con volumen suficiente', () => {
    const result = assessMarketLiquidity({
      city: 'martlock',
      side: 'purchase',
      strategy: 'buy-now',
      currentPrice: 95,
      freshness: 'recent',
      requiredQuantity: 16,
      snapshot: buildSnapshot(),
      now: NOW,
    })

    expect(result.isEligibleForRecommendation).toBe(true)
    expect(result.confidence).toBe('high')
    expect(result.isPriceOutlier).toBe(false)
  })

  it('rechaza un precio absurdo aunque sea matemáticamente el más barato', () => {
    const result = assessMarketLiquidity({
      city: 'caerleon',
      side: 'purchase',
      strategy: 'buy-now',
      currentPrice: 5,
      freshness: 'recent',
      requiredQuantity: 1,
      snapshot: buildSnapshot({ price: 198_000, dailyVolume: 2 }),
      now: NOW,
    })

    expect(result.isEligibleForRecommendation).toBe(false)
    expect(result.isPriceOutlier).toBe(true)
    expect(result.reasonCodes).toContain('price-outlier')
  })

  it('rechaza un mercado que tardaría aproximadamente un mes', () => {
    const result = assessMarketLiquidity({
      city: 'caerleon',
      side: 'sale',
      strategy: 'sell-order',
      currentPrice: 1_000,
      freshness: 'recent',
      requiredQuantity: 1,
      snapshot: buildSnapshot({ price: 1_000, dailyVolume: 1, activeDays: 1 }),
      now: NOW,
    })

    expect(result.isEligibleForRecommendation).toBe(false)
    expect(result.estimatedDaysToFill).toBeCloseTo(28)
    expect(result.reasonCodes).toContain('insufficient-active-days')
    expect(result.reasonCodes).toContain('slow-estimated-fill')
  })

  it('respalda con historial reciente un precio sin fecha confiable', () => {
    const result = assessMarketLiquidity({
      city: 'martlock',
      side: 'sale',
      strategy: 'sell-order',
      currentPrice: 100,
      freshness: 'stale',
      requiredQuantity: 1,
      snapshot: buildSnapshot(),
      now: NOW,
    })

    expect(result.isEligibleForRecommendation).toBe(true)
    expect(result.confidence).toBe('medium')
    expect(result.reasonCodes).toContain('stale-current-price')
  })
})
