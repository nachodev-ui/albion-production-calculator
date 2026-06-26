import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import {
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  classifyMarketPriceFreshness,
  formatMarketPriceRelativeAge,
  resolveMaterialPurchaseCity,
  resolvePurchasePrice,
  resolvePurchasePriceDate,
  resolvePurchasePriceDetail,
  resolveSalePrice,
  resolveSalePriceDate,
} from './MarketPrice'
import type { MarketPriceSnapshot } from './MarketPrice'

const snapshot: MarketPriceSnapshot = {
  server: 'americas',
  itemIdentifier: 'T4_SWORD@2',
  city: 'martlock',
  quality: 1,
  sellPriceMin: 1_200,
  sellPriceMinDate: '2026-06-22T10:00:00Z',
  buyPriceMax: 950,
  buyPriceMaxDate: '2026-06-22T09:00:00Z',
  source: 'central-api',
  fetchedAt: '2026-06-22T10:05:00Z',
}

describe('MarketPrice', () => {
  it('construye el identificador de mercado con encantamiento', () => {
    const itemId = asBaseItemId('T4_SWORD')

    expect(buildMarketItemIdentifier(itemId, 0)).toBe('T4_SWORD')
    expect(buildMarketItemIdentifier(itemId, 2)).toBe('T4_SWORD@2')
    expect(buildItemPriceKey(itemId, 2)).toBe('T4_SWORD@2')
  })

  it('selecciona correctamente precios y fechas de compra y venta', () => {
    expect(resolvePurchasePrice(snapshot, 'buy-now')).toBe(1_200)
    expect(resolvePurchasePrice(snapshot, 'buy-order')).toBe(950)
    expect(resolvePurchasePriceDate(snapshot, 'buy-now')).toBe(
      '2026-06-22T10:00:00Z',
    )
    expect(resolvePurchasePriceDate(snapshot, 'buy-order')).toBe(
      '2026-06-22T09:00:00Z',
    )

    expect(resolveSalePrice(snapshot, 'sell-order')).toBe(1_200)
    expect(resolveSalePrice(snapshot, 'sell-now')).toBe(950)
    expect(resolveSalePriceDate(snapshot, 'sell-order')).toBe(
      '2026-06-22T10:00:00Z',
    )
    expect(resolveSalePriceDate(snapshot, 'sell-now')).toBe(
      '2026-06-22T09:00:00Z',
    )
  })

  it('clasifica la antigüedad del precio con límites transparentes', () => {
    const now = Date.parse('2026-06-22T12:00:00Z')

    expect(classifyMarketPriceFreshness('2026-06-22T11:40:00Z', now)).toBe(
      'recent',
    )
    expect(classifyMarketPriceFreshness('2026-06-22T10:00:00Z', now)).toBe(
      'acceptable',
    )
    expect(classifyMarketPriceFreshness('2026-06-22T04:00:00Z', now)).toBe(
      'stale',
    )
    expect(classifyMarketPriceFreshness(null, now)).toBe('missing')
  })

  it('expone la fecha y confianza del precio seleccionado', () => {
    const detail = resolvePurchasePriceDetail(
      snapshot,
      'buy-now',
      Date.parse('2026-06-22T10:20:00Z'),
    )

    expect(detail.value).toBe(1_200)
    expect(detail.updatedAt).toBe('2026-06-22T10:00:00Z')
    expect(detail.freshness).toBe('recent')
  })

  it('genera un texto relativo comprensible', () => {
    const text = formatMarketPriceRelativeAge(
      '2026-06-22T11:36:00Z',
      Date.parse('2026-06-22T12:00:00Z'),
    )

    expect(text).toContain('24')
    expect(text).toContain('minuto')
  })

  it('resuelve una ciudad individual sin perder la predeterminada', () => {
    const overrides = new Map([['T4_SWORD@2', 'brecilien' as const]])

    expect(
      resolveMaterialPurchaseCity(overrides, 'T4_SWORD@2', 'martlock'),
    ).toBe('brecilien')
    expect(
      resolveMaterialPurchaseCity(overrides, 'T4_PLANKS@0', 'martlock'),
    ).toBe('martlock')
  })

  it('separa la caché por servidor, ciudad, objeto y calidad', () => {
    expect(buildMarketCacheKey('europe', 'caerleon', 'T4_SWORD@2', 1)).toBe(
      'europe|caerleon|T4_SWORD@2|1',
    )
  })
})
