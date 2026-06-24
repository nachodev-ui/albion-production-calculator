import { describe, expect, it } from 'vitest'
import type {
  MarketDefinition,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { buildMarketCacheKey } from '../types/MarketPrice'
import { buildMaterialMarketPriceOptions } from './materialMarketPriceComparison'

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
    key: 'fort_sterling',
    name: 'Fort Sterling',
    type: 'regular',
    cityLocationId: '4000',
    marketLocationId: '4002',
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
    itemIdentifier: 'T5_PLANKS_LEVEL4@4',
    city,
    quality: 1,
    sellPriceMin,
    sellPriceMinDate: sellPriceMin === null ? null : '2026-06-23T20:00:00Z',
    buyPriceMax,
    buyPriceMaxDate: buyPriceMax === null ? null : '2026-06-23T20:00:00Z',
    fetchedAt: '2026-06-23T20:01:00Z',
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

describe('buildMaterialMarketPriceOptions', () => {
  it('marca el precio más bajo y el más alto para compra inmediata', () => {
    const options = buildMaterialMarketPriceOptions({
      markets: MARKETS,
      snapshots: createSnapshots([
        snapshot('martlock', 120_000, 100_000),
        snapshot('fort_sterling', 95_000, 90_000),
        snapshot('thetford', 150_000, 130_000),
      ]),
      server: 'americas',
      itemIdentifier: 'T5_PLANKS_LEVEL4@4',
      purchaseStrategy: 'buy-now',
      now: Date.parse('2026-06-23T20:02:00Z'),
    })

    expect(options).toEqual([
      expect.objectContaining({ city: 'martlock', value: 120_000, badge: null }),
      expect.objectContaining({
        city: 'fort_sterling',
        value: 95_000,
        badge: 'best',
      }),
      expect.objectContaining({
        city: 'thetford',
        value: 150_000,
        badge: 'highest',
      }),
    ])
  })

  it('usa la compra máxima cuando la estrategia es colocar orden', () => {
    const options = buildMaterialMarketPriceOptions({
      markets: MARKETS,
      snapshots: createSnapshots([
        snapshot('martlock', 120_000, 100_000),
        snapshot('fort_sterling', 95_000, 80_000),
        snapshot('thetford', 150_000, null),
      ]),
      server: 'americas',
      itemIdentifier: 'T5_PLANKS_LEVEL4@4',
      purchaseStrategy: 'buy-order',
    })

    expect(options).toEqual([
      expect.objectContaining({
        city: 'martlock',
        value: 100_000,
        badge: 'highest',
      }),
      expect.objectContaining({
        city: 'fort_sterling',
        value: 80_000,
        badge: 'best',
      }),
      expect.objectContaining({ city: 'thetford', value: null, badge: null }),
    ])
  })

  it('evita mostrar mejor y más alto a la vez cuando todos son iguales', () => {
    const options = buildMaterialMarketPriceOptions({
      markets: MARKETS,
      snapshots: createSnapshots([
        snapshot('martlock', 100_000, null),
        snapshot('fort_sterling', 100_000, null),
      ]),
      server: 'americas',
      itemIdentifier: 'T5_PLANKS_LEVEL4@4',
      purchaseStrategy: 'buy-now',
    })

    expect(options.map((option) => option.badge)).toEqual([
      'same',
      'same',
      null,
    ])
  })
})
