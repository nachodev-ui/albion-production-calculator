import { describe, expect, it } from 'vitest'
import type {
  MaterialMarketPriceComparisons,
  SaleMarketPriceOption,
} from '../types/MarketPrice'
import type { MarketLiquidityAssessment } from './marketLiquidity'
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

function liquidity(
  city: string,
  eligible = true,
): MarketLiquidityAssessment {
  return {
    city,
    side: 'purchase',
    currentPrice: 100,
    requiredQuantity: 1,
    confidence: eligible ? 'high' : 'none',
    isEligibleForRecommendation: eligible,
    isPriceOutlier: !eligible,
    priceRatioToMedian: eligible ? 1 : 0.01,
    estimatedDaysToFill: eligible ? 1 : 28,
    volumeCoverage28d: eligible ? 28 : 1,
    summary: {
      periodDays: 28,
      averagePrice: 100,
      medianPrice: 100,
      lowerQuartilePrice: 100,
      upperQuartilePrice: 100,
      minimumPrice: 100,
      maximumPrice: 100,
      totalVolume: eligible ? 100 : 1,
      averageDailyVolume: eligible ? 100 / 28 : 1 / 28,
      volatilityPercent: 0,
      observedPriceDays: eligible ? 28 : 1,
      activeVolumeDays: eligible ? 28 : 1,
    },
    reasonCodes: eligible ? [] : ['price-outlier'],
  }
}

const MATERIAL_LIQUIDITY = new Map([
  [
    'T5_PLANKS@0',
    new Map([
      ['martlock', liquidity('martlock')],
      ['thetford', liquidity('thetford')],
    ]),
  ],
  [
    'T5_METALBAR@0',
    new Map([
      ['martlock', liquidity('martlock')],
      ['thetford', liquidity('thetford')],
    ]),
  ],
])

const SALE_LIQUIDITY = new Map([
  ['martlock', { ...liquidity('martlock'), side: 'sale' as const }],
  ['thetford', { ...liquidity('thetford'), side: 'sale' as const }],
])

function commonParams() {
  return {
    materialLiquidity: MATERIAL_LIQUIDITY,
    requiredMaterialQuantities: new Map([
      ['T5_PLANKS@0', 16],
      ['T5_METALBAR@0', 8],
    ]),
    saleLiquidity: SALE_LIQUIDITY,
  }
}

describe('buildProfitabilityMarketRecommendation', () => {
  it('elige el material más barato y la venta más alta entre mercados viables', () => {
    const result = buildProfitabilityMarketRecommendation({
      ...commonParams(),
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

  it('descarta el precio mínimo teórico cuando no posee liquidez', () => {
    const materialLiquidity = new Map(MATERIAL_LIQUIDITY)
    materialLiquidity.set(
      'T5_PLANKS@0',
      new Map([
        ['martlock', liquidity('martlock')],
        ['thetford', liquidity('thetford', false)],
      ]),
    )

    const result = buildProfitabilityMarketRecommendation({
      ...commonParams(),
      materialLiquidity,
      materialComparisons: MATERIALS,
      resolvedMaterialCities: new Map([
        ['T5_PLANKS@0', 'martlock'],
        ['T5_METALBAR@0', 'martlock'],
      ]),
      currentAutomaticPurchasePrices: new Map([
        ['T5_PLANKS@0', 120],
        ['T5_METALBAR@0', 75],
      ]),
      targetKeys: new Set(['T5_PLANKS@0']),
      saleOptions: SALES,
      defaultPurchaseCity: 'martlock',
      currentSaleCity: 'martlock',
      currentSaleUnitPrice: 1_000,
    })

    expect(result.materialCities.get('T5_PLANKS@0')).toBe('martlock')
    expect(result.materials[0]?.theoreticalBest?.city).toBe('thetford')
    expect(result.materials[0]?.excludedCandidateCount).toBe(1)
  })

  it('expone la liquidez de la ciudad actual para retirar la advertencia al cambiar a una opción viable', () => {
    const result = buildProfitabilityMarketRecommendation({
      ...commonParams(),
      materialComparisons: new Map([
        [
          'T5_PLANKS@0',
          [
            {
              city: 'fort_sterling',
              value: 198_270,
              updatedAt: '2026-06-24T12:00:00Z',
              freshness: 'recent',
              badge: null,
            },
            {
              city: 'caerleon',
              value: 5,
              updatedAt: null,
              freshness: 'missing',
              badge: 'best',
            },
          ],
        ],
      ]),
      materialLiquidity: new Map([
        [
          'T5_PLANKS@0',
          new Map([
            ['fort_sterling', liquidity('fort_sterling')],
            ['caerleon', liquidity('caerleon', false)],
          ]),
        ],
      ]),
      resolvedMaterialCities: new Map([
        ['T5_PLANKS@0', 'fort_sterling'],
      ]),
      currentAutomaticPurchasePrices: new Map([
        ['T5_PLANKS@0', 198_270],
      ]),
      targetKeys: new Set(['T5_PLANKS@0']),
      saleOptions: SALES,
      defaultPurchaseCity: 'fort_sterling',
      currentSaleCity: 'martlock',
      currentSaleUnitPrice: 1_000,
    })

    const material = result.materials[0]

    expect(material?.currentCity).toBe('fort_sterling')
    expect(material?.currentLiquidity?.isEligibleForRecommendation).toBe(true)
    expect(material?.recommendedCity).toBe('fort_sterling')
    expect(material?.theoreticalBest?.city).toBe('caerleon')
  })

  it('conserva la ciudad actual cuando existe un empate viable', () => {
    const result = buildProfitabilityMarketRecommendation({
      ...commonParams(),
      materialComparisons: new Map([
        [
          'T5_PLANKS@0',
          [
            {
              city: 'martlock',
              value: 100,
              updatedAt: '2026-06-24T12:00:00Z',
              freshness: 'recent',
              badge: 'same',
            },
            {
              city: 'thetford',
              value: 100,
              updatedAt: '2026-06-24T12:00:00Z',
              freshness: 'recent',
              badge: 'same',
            },
          ],
        ],
      ]),
      resolvedMaterialCities: new Map([['T5_PLANKS@0', 'thetford']]),
      currentAutomaticPurchasePrices: new Map([['T5_PLANKS@0', 100]]),
      targetKeys: new Set(['T5_PLANKS@0']),
      saleOptions: [
        {
          city: 'martlock',
          value: 1_000,
          updatedAt: '2026-06-24T12:00:00Z',
          freshness: 'recent',
        },
        {
          city: 'thetford',
          value: 1_000,
          updatedAt: '2026-06-24T12:00:00Z',
          freshness: 'recent',
        },
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
      ...commonParams(),
      materialComparisons: MATERIALS,
      resolvedMaterialCities: new Map([
        ['T5_PLANKS@0', 'martlock'],
        ['T5_METALBAR@0', 'martlock'],
      ]),
      currentAutomaticPurchasePrices: new Map([
        ['T5_PLANKS@0', 120],
        ['T5_METALBAR@0', 75],
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
  })

  it('marca como incompleto un material activo sin comparación de mercados', () => {
    const result = buildProfitabilityMarketRecommendation({
      ...commonParams(),
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
