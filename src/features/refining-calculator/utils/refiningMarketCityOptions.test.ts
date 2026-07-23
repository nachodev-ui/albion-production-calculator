import { describe, expect, it } from 'vitest'
import type {
  MarketDefinition,
  MaterialMarketPriceOption,
  SaleMarketPriceOption,
} from '@features/market-data/types/MarketPrice'
import { buildRefiningMarketCityOptions } from './refiningMarketCityOptions'

const MARKETS: readonly MarketDefinition[] = [
  { key: 'martlock', name: 'Martlock', type: 'regular', enabled: true },
  { key: 'thetford', name: 'Thetford', type: 'regular', enabled: true },
  { key: 'lymhurst', name: 'Lymhurst', type: 'regular', enabled: true },
]

function purchaseOption(
  city: string,
  value: number | null,
): MaterialMarketPriceOption {
  return {
    city,
    value,
    updatedAt: value === null ? null : '2026-07-22T12:00:00Z',
    freshness: value === null ? 'missing' : 'recent',
    source: value === null ? null : 'central-api',
    badge: null,
  }
}

function saleOption(city: string, value: number | null): SaleMarketPriceOption {
  return {
    city,
    value,
    updatedAt: value === null ? null : '2026-07-22T12:00:00Z',
    freshness: value === null ? 'missing' : 'recent',
    source: value === null ? null : 'central-api',
  }
}

describe('buildRefiningMarketCityOptions', () => {
  it('compara el costo ponderado completo de todos los materiales', () => {
    const options = buildRefiningMarketCityOptions({
      markets: MARKETS,
      operation: 'purchase',
      groups: [
        {
          label: 'Mineral',
          weight: 2,
          options: [
            purchaseOption('martlock', 100),
            purchaseOption('thetford', 80),
            purchaseOption('lymhurst', 110),
          ],
        },
        {
          label: 'Lingote previo',
          weight: 1,
          options: [
            purchaseOption('martlock', 50),
            purchaseOption('thetford', 70),
            purchaseOption('lymhurst', 60),
          ],
        },
      ],
    })

    expect(options.map(({ city, aggregateValue, badge }) => ({ city, aggregateValue, badge }))).toEqual([
      { city: 'martlock', aggregateValue: 250, badge: null },
      { city: 'thetford', aggregateValue: 230, badge: 'best' },
      { city: 'lymhurst', aggregateValue: 280, badge: 'worst' },
    ])
  })

  it('considera mejor la ciudad con el mayor ingreso de venta', () => {
    const options = buildRefiningMarketCityOptions({
      markets: MARKETS,
      operation: 'sale',
      groups: [
        {
          label: 'Lingote terminado',
          weight: 1,
          options: [
            saleOption('martlock', 500),
            saleOption('thetford', 650),
            saleOption('lymhurst', 400),
          ],
        },
      ],
    })

    expect(options.map(({ city, badge }) => ({ city, badge }))).toEqual([
      { city: 'martlock', badge: null },
      { city: 'thetford', badge: 'best' },
      { city: 'lymhurst', badge: 'worst' },
    ])
  })

  it('no compara como completo un mercado al que le falta un material', () => {
    const options = buildRefiningMarketCityOptions({
      markets: MARKETS,
      operation: 'purchase',
      groups: [
        {
          label: 'Mineral',
          weight: 2,
          options: [purchaseOption('martlock', 100)],
        },
        {
          label: 'Lingote previo',
          weight: 1,
          options: [purchaseOption('martlock', null)],
        },
      ],
    })

    expect(options[0]).toMatchObject({
      city: 'martlock',
      aggregateValue: null,
      coverage: 'partial',
      badge: null,
    })
    expect(options[1]).toMatchObject({ coverage: 'missing' })
  })
})
