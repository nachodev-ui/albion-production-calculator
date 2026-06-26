import { asBaseItemId } from '@core/domain/entities/Item'
import { describe, expect, it } from 'vitest'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import { buildMarketCacheKey } from '../types/MarketPrice'
import { useMarketDataStore } from '../store/marketDataStore'
import { fetchMarketHistoryWithFallback } from './historyReadService'
import {
  fetchCurrentPricesWithFallback,
  fetchMarketsWithFallback,
} from './marketReadService'

const liveEnabled = import.meta.env['VITE_RUN_LIVE_E2E'] === '1'
const stage = import.meta.env['VITE_E2E_STAGE'] ?? 'online'
const describeLive = liveEnabled ? describe : describe.skip

const candidates = [
  {
    server: 'americas' as const,
    city: 'fort_sterling',
    itemIdentifier: 'T4_BAG',
    quality: 1,
  },
  {
    server: 'americas' as const,
    city: 'fort_sterling',
    itemIdentifier: 'T5_BAG',
    quality: 1,
  },
] as const

const rangeStart = import.meta.env['VITE_E2E_RANGE_START'] ?? '2026-06-01'
const rangeEnd = import.meta.env['VITE_E2E_RANGE_END'] ?? '2026-06-30'

function cachedHistory(): ReadonlyMap<string, MarketHistorySnapshot> {
  const fetchedAt = new Date().toISOString()
  return new Map(
    candidates.map((candidate, index) => [
      buildMarketHistoryCacheKey(
        candidate.server,
        candidate.city,
        candidate.itemIdentifier,
        candidate.quality,
      ),
      {
        ...candidate,
        rangeStart,
        rangeEnd,
        points: [
          {
            timestamp: `${rangeEnd}T00:00:00Z`,
            itemCount: 5 + index,
            averagePrice: 4_500 + index * 4_000,
          },
        ],
        source: 'central-api' as const,
        fetchedAt,
      },
    ] as const),
  )
}

describeLive('pipeline real de mercado', () => {
  it(`valida la etapa ${stage}`, async () => {
    if (stage === 'online') {
      const catalog = await fetchMarketsWithFallback()
      expect(catalog.source).toBe('central-api')

      const prices = await fetchCurrentPricesWithFallback({
        server: 'americas',
        itemIdentifiers: candidates.map(
          (candidate) => candidate.itemIdentifier,
        ),
        cities: ['fort_sterling'],
        quality: 1,
      })
      expect(prices.sources).toContain('central-api')
      expect(prices.snapshots.size).toBe(2)
      expect(
        prices.snapshots.get(
          buildMarketCacheKey(
            'americas',
            'fort_sterling',
            'T4_BAG',
            1,
          ),
        )?.source,
      ).toBe('central-api')

      const history = await fetchMarketHistoryWithFallback({
        candidates,
        rangeStart,
        rangeEnd,
      })
      expect(history.requestCount).toBe(1)
      expect(history.sources).toEqual(['central-api'])
      expect(history.failedKeys).toEqual([])
      expect(history.snapshots.size).toBe(2)
      return
    }

    if (stage === 'local') {
      const catalog = await fetchMarketsWithFallback()
      expect(catalog.source).toBe('local-receiver')
      expect(catalog.warnings[0]).toContain('API central no disponible')

      const prices = await fetchCurrentPricesWithFallback({
        server: 'americas',
        itemIdentifiers: candidates.map(
          (candidate) => candidate.itemIdentifier,
        ),
        cities: ['fort_sterling'],
        quality: 1,
      })
      expect(prices.sources).toContain('local-receiver')
      expect(prices.snapshots.size).toBe(2)

      const history = await fetchMarketHistoryWithFallback({
        candidates,
        rangeStart,
        rangeEnd,
      })
      expect(history.sources).toContain('local-receiver')
      expect(history.failedKeys).toEqual([])
      expect(history.snapshots.size).toBe(2)
      return
    }

    if (stage === 'cache') {
      const cachedMarkets = [
        {
          key: 'fort_sterling',
          name: 'Fort Sterling',
          type: 'regular' as const,
          enabled: true,
        },
      ]
      const catalog = await fetchMarketsWithFallback(cachedMarkets)
      expect(catalog.source).toBe('browser-cache')

      const priceKey = buildMarketCacheKey(
        'americas',
        'fort_sterling',
        'T4_BAG',
        1,
      )
      const fetchedAt = new Date().toISOString()
      useMarketDataStore.setState({
        config: {
          server: 'americas',
          purchaseCity: 'fort_sterling',
          saleCity: 'fort_sterling',
          purchaseStrategy: 'buy-now',
          saleStrategy: 'sell-order',
          quality: 1,
        },
        markets: cachedMarkets,
        catalogStatus: 'success',
        catalogError: null,
        catalogSource: 'browser-cache',
        catalogWarnings: [],
        snapshots: new Map([
          [
            priceKey,
            {
              server: 'americas',
              itemIdentifier: 'T4_BAG',
              city: 'fort_sterling',
              quality: 1,
              sellPriceMin: 4_500,
              sellPriceMinDate: fetchedAt,
              sellPriceSource: 'central-api',
              buyPriceMax: 4_000,
              buyPriceMaxDate: fetchedAt,
              buyPriceSource: 'central-api',
              source: 'central-api',
              fetchedAt,
            },
          ],
        ]),
        materialPurchaseCitiesByRoot: new Map(),
        status: 'idle',
        error: null,
        refreshWarnings: [],
      })

      await useMarketDataStore.getState().refreshPrices({
        rootKey: 'live-e2e-cache',
        materialTargets: [
          { itemId: asBaseItemId('T4_BAG'), enchantment: 0 },
        ],
        saleTarget: null,
        force: true,
      })

      const cachedPrice = useMarketDataStore
        .getState()
        .snapshots.get(priceKey)
      expect(cachedPrice?.source).toBe('browser-cache')
      expect(cachedPrice?.sellPriceSource).toBe('browser-cache')
      expect(cachedPrice?.buyPriceSource).toBe('browser-cache')
      expect(cachedPrice?.sellPriceMin).toBe(4_500)
      expect(cachedPrice?.buyPriceMax).toBe(4_000)

      const history = await fetchMarketHistoryWithFallback({
        candidates,
        rangeStart,
        rangeEnd,
        cachedSnapshots: cachedHistory(),
      })
      expect(history.sources).toEqual(['browser-cache'])
      expect(history.failedKeys).toEqual([])
      expect(
        Array.from(history.snapshots.values()).every(
          (snapshot) => snapshot.source === 'browser-cache',
        ),
      ).toBe(true)
      return
    }

    throw new Error(`Etapa E2E desconocida: ${stage}`)
  })
})
