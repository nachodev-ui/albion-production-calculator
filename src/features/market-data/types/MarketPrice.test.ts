import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import {
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  resolvePurchasePrice,
  resolveSalePrice,
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
  buyPriceMaxDate: '2026-06-22T10:00:00Z',
  fetchedAt: '2026-06-22T10:05:00Z',
}

describe('MarketPrice', () => {
  it('construye el identificador AODP con encantamiento', () => {
    const itemId = asBaseItemId('T4_SWORD')

    expect(buildMarketItemIdentifier(itemId, 0)).toBe('T4_SWORD')
    expect(buildMarketItemIdentifier(itemId, 2)).toBe('T4_SWORD@2')
    expect(buildItemPriceKey(itemId, 2)).toBe('T4_SWORD@2')
  })

  it('selecciona correctamente precios de compra y venta', () => {
    expect(resolvePurchasePrice(snapshot, 'buy-now')).toBe(1_200)
    expect(resolvePurchasePrice(snapshot, 'buy-order')).toBe(950)
    expect(resolveSalePrice(snapshot, 'sell-order')).toBe(1_200)
    expect(resolveSalePrice(snapshot, 'sell-now')).toBe(950)
  })

  it('separa la caché por servidor, ciudad, objeto y calidad', () => {
    expect(
      buildMarketCacheKey('europe', 'caerleon', 'T4_SWORD@2', 1),
    ).toBe('europe|caerleon|T4_SWORD@2|1')
  })
})
