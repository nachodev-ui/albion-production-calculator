import { describe, expect, it } from 'vitest'
import type {
  MarketDefinition,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'
import { buildSaleMarketPriceOptions } from './saleMarketPriceComparison'

const MARKETS: readonly MarketDefinition[] = [
  {
    key: 'martlock',
    name: 'Martlock',
    type: 'regular',
    cityLocationId: '3004',
    marketLocationId: '3008',
    enabled: true,
  },
  {
    key: 'thetford',
    name: 'Thetford',
    type: 'regular',
    cityLocationId: '0000',
    marketLocationId: '0007',
    enabled: true,
  },
]

function snapshot(
  city: string,
  sellPriceMin: number | null,
  buyPriceMax: number | null,
): MarketPriceSnapshot {
  return {
    server: 'americas',
    itemIdentifier: 'T6_MAIN_SWORD',
    city,
    quality: 3,
    sellPriceMin,
    sellPriceMinDate: sellPriceMin === null ? null : '2026-06-24T12:00:00Z',
    buyPriceMax,
    buyPriceMaxDate: buyPriceMax === null ? null : '2026-06-24T12:00:00Z',
    fetchedAt: '2026-06-24T12:01:00Z',
  }
}

function createSnapshots(
  rows: readonly MarketPriceSnapshot[],
): ReadonlyMap<string, MarketPriceSnapshot> {
  return new Map(
    rows.map((row) => [
      buildMarketCacheKey(
        row.server,
        row.city,
        row.itemIdentifier,
        row.quality,
      ),
      row,
    ]),
  )
}

describe('buildSaleMarketPriceOptions', () => {
  it('usa la venta mínima para una orden de venta', () => {
    const options = buildSaleMarketPriceOptions({
      markets: MARKETS,
      snapshots: createSnapshots([
        snapshot('martlock', 210_000, 180_000),
        snapshot('thetford', 240_000, 200_000),
      ]),
      server: 'americas',
      itemIdentifier: 'T6_MAIN_SWORD',
      quality: 3,
      saleStrategy: 'sell-order',
    })

    expect(options.map((option) => option.value)).toEqual([210_000, 240_000])
  })

  it('usa la compra máxima para vender inmediatamente', () => {
    const options = buildSaleMarketPriceOptions({
      markets: MARKETS,
      snapshots: createSnapshots([
        snapshot('martlock', 210_000, 180_000),
        snapshot('thetford', 240_000, 200_000),
      ]),
      server: 'americas',
      itemIdentifier: 'T6_MAIN_SWORD',
      quality: 3,
      saleStrategy: 'sell-now',
    })

    expect(options.map((option) => option.value)).toEqual([180_000, 200_000])
  })
})
