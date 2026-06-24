import { describe, expect, it } from 'vitest'
import type {
  MaterialMarketPriceComparisons,
  SaleMarketPriceOption,
} from '../types/MarketPrice'
import { buildProfitabilityMarketRecommendation } from './profitabilityOptimizer'

const MATERIALS: MaterialMarketPriceComparisons = new Map([
  [
    'T5_PLANKS@0',
    [
      {
        city: 'martlock',
        value: 120,
        updatedAt: '2026-06-24T12:00:00Z',
        freshness: 'recent',
        badge: null,
      },
      {
        city: 'thetford',
        value: 90,
        updatedAt: '2026-06-24T12:00:00Z',
        freshness: 'recent',
        badge: 'best',
      },
    ],
  ],
  [
    'T5_METALBAR@0',
    [
      {
        city: 'martlock',
        value: 75,
        updatedAt: '2026-06-24T12:00:00Z',
        freshness: 'recent',
        badge: 'same',
      },
      {
        city: 'thetford',
        value: 75,
        updatedAt: '2026-06-24T12:00:00Z',
        freshness: 'recent',
        badge: 'same',
      },
    ],
  ],
])

const SALES: readonly SaleMarketPriceOption[] = [
  {
    city: 'martlock',
    value: 1_000,
    updatedAt: '2026-06-24T12:00:00Z',
    freshness: 'recent',
  },
  {
    city: 'thetford',
    value: 1_250,
    updatedAt: '2026-06-24T12:00:00Z',
    freshness: 'recent',
  },
]

describe('buildProfitabilityMarketRecommendation', () => {
  it('elige el material más barato y la venta más alta', () => {
    const result = buildProfitabilityMarketRecommendation({
      materialComparisons: MATERIALS,
      resolvedMaterialCities: new Map([
        ['T5_PLANKS@0', 'martlock'],
        ['T5_METALBAR@0', 'martlock'],
      ]),
      currentAutomaticPurchasePrices: new Map([
        ['T5_PLANKS@0', 120],
        ['T5_METALBAR@0', 75],
      ]),
      targetLabels: new Map([
        ['T5_PLANKS@0', 'Tablones'],
        ['T5_METALBAR@0', 'Barras'],
      ]),
      saleOptions: SALES,
      defaultPurchaseCity: 'martlock',
      currentSaleCity: 'martlock',
      currentSaleUnitPrice: 1_000,
    })

    expect(result.materialCities.get('T5_PLANKS@0')).toBe('thetford')
    expect(result.materialCities.get('T5_METALBAR@0')).toBe('martlock')
    expect(result.automaticPurchasePrices.get('T5_PLANKS@0')).toBe(90)
    expect(result.saleCity).toBe('thetford')
    expect(result.saleUnitPrice).toBe(1_250)
    expect(result.materialChangeCount).toBe(1)
    expect(result.saleCityChanged).toBe(true)
    expect(result.isComplete).toBe(true)
  })

  it('conserva la ciudad actual cuando existe un empate', () => {
    const result = buildProfitabilityMarketRecommendation({
      materialComparisons: new Map([
        [
          'T5_PLANKS@0',
          [
            {
              city: 'martlock',
              value: 100,
              updatedAt: null,
              freshness: 'missing',
              badge: 'same',
            },
            {
              city: 'thetford',
              value: 100,
              updatedAt: null,
              freshness: 'missing',
              badge: 'same',
            },
          ],
        ],
      ]),
      resolvedMaterialCities: new Map([['T5_PLANKS@0', 'thetford']]),
      currentAutomaticPurchasePrices: new Map([['T5_PLANKS@0', 100]]),
      saleOptions: [
        { city: 'martlock', value: 1_000, updatedAt: null, freshness: 'missing' },
        { city: 'thetford', value: 1_000, updatedAt: null, freshness: 'missing' },
      ],
      defaultPurchaseCity: 'martlock',
      currentSaleCity: 'thetford',
      currentSaleUnitPrice: 1_000,
    })

    expect(result.materialCities.get('T5_PLANKS@0')).toBe('thetford')
    expect(result.saleCity).toBe('thetford')
    expect(result.materialChangeCount).toBe(0)
    expect(result.saleCityChanged).toBe(false)
  })

  it('limita la recomendación a los materiales de la receta activa', () => {
    const result = buildProfitabilityMarketRecommendation({
      materialComparisons: MATERIALS,
      resolvedMaterialCities: new Map([
        ['T5_PLANKS@0', 'martlock'],
        ['T5_METALBAR@0', 'martlock'],
      ]),
      currentAutomaticPurchasePrices: new Map([
        ['T5_PLANKS@0', 120],
        ['T5_METALBAR@0', 75],
      ]),
      targetLabels: new Map([
        ['T5_PLANKS@0', 'Tablones'],
        ['T5_METALBAR@0', 'Barras'],
      ]),
      targetKeys: new Set(['T5_PLANKS@0']),
      saleOptions: SALES,
      defaultPurchaseCity: 'martlock',
      currentSaleCity: 'martlock',
      currentSaleUnitPrice: 1_000,
    })

    expect(result.materials).toHaveLength(1)
    expect(result.materialCities.has('T5_PLANKS@0')).toBe(true)
    expect(result.materialCities.has('T5_METALBAR@0')).toBe(false)
    expect(result.automaticPurchasePrices.has('T5_METALBAR@0')).toBe(false)
  })


  it('marca como incompleto un material activo sin comparación de mercados', () => {
    const result = buildProfitabilityMarketRecommendation({
      materialComparisons: new Map(),
      resolvedMaterialCities: new Map([['T5_PLANKS@0', 'martlock']]),
      currentAutomaticPurchasePrices: new Map([['T5_PLANKS@0', 120]]),
      targetKeys: new Set(['T5_PLANKS@0']),
      saleOptions: SALES,
      defaultPurchaseCity: 'martlock',
      currentSaleCity: 'martlock',
      currentSaleUnitPrice: 1_000,
    })

    expect(result.materials).toHaveLength(1)
    expect(result.materials[0]?.currentUnitPrice).toBe(120)
    expect(result.materials[0]?.recommendedUnitPrice).toBeNull()
    expect(result.missingMaterialCount).toBe(1)
    expect(result.isComplete).toBe(false)
  })

})
