import { create } from 'zustand'
import { fetchCurrentAodpPrices } from '../api/aodpClient'
import {
  clearStoredMarketCache,
  loadManualSellPrices,
  loadMarketCache,
  loadMarketConfig,
  saveManualSellPrices,
  saveMarketCache,
  saveMarketConfig,
} from '../storage/marketPriceStorage'
import type {
  MarketConfig,
  MarketPriceSnapshot,
  MarketPriceTarget,
  MarketRequestStatus,
} from '../types/MarketPrice'
import {
  buildMarketCacheKey,
  buildMarketItemIdentifier,
} from '../types/MarketPrice'

const MARKET_CACHE_TTL_MS = 5 * 60 * 1000
let latestRequestId = 0

interface RefreshMarketPricesParams {
  readonly materialTargets: readonly MarketPriceTarget[]
  readonly saleTarget: MarketPriceTarget | null
  readonly force?: boolean
}

interface MarketDataState {
  readonly config: MarketConfig
  readonly snapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly manualSellPrices: ReadonlyMap<string, number>
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly lastSuccessfulFetchAt: string | null

  setConfig: (patch: Partial<MarketConfig>) => void
  refreshPrices: (params: RefreshMarketPricesParams) => Promise<void>
  clearCache: () => void
  setManualSellPrice: (rootKey: string, price: number | null) => void
}

function isSnapshotFresh(snapshot: MarketPriceSnapshot | undefined): boolean {
  if (!snapshot) return false
  return Date.now() - Date.parse(snapshot.fetchedAt) < MARKET_CACHE_TTL_MS
}

function uniqueTargets(
  targets: readonly MarketPriceTarget[],
): readonly MarketPriceTarget[] {
  const result = new Map<string, MarketPriceTarget>()

  for (const target of targets) {
    result.set(
      buildMarketItemIdentifier(target.itemId, target.enchantment),
      target,
    )
  }

  return Array.from(result.values())
}

const initialSnapshots = loadMarketCache()
const initialConfig = loadMarketConfig()
const initialSellPrices = loadManualSellPrices()

export const useMarketDataStore = create<MarketDataState>((set, get) => ({
  config: initialConfig,
  snapshots: initialSnapshots,
  manualSellPrices: initialSellPrices,
  status: 'idle',
  error: null,
  lastSuccessfulFetchAt: null,

  setConfig: (patch) => {
    const config = {
      ...get().config,
      ...patch,
    }

    saveMarketConfig(config)
    set({ config, error: null })
  },

  refreshPrices: async ({ materialTargets, saleTarget, force = false }) => {
    const config = get().config
    const allTargets = uniqueTargets([
      ...materialTargets,
      ...(saleTarget ? [saleTarget] : []),
    ])

    if (allTargets.length === 0) {
      set({ status: 'idle', error: null })
      return
    }

    const cities = Array.from(
      new Set([config.purchaseCity, config.saleCity]),
    )
    const snapshots = get().snapshots

    const identifiersToRefresh = allTargets
      .map((target) =>
        buildMarketItemIdentifier(target.itemId, target.enchantment),
      )
      .filter((identifier) => {
        if (force) return true

        return cities.some((city) => {
          const key = buildMarketCacheKey(
            config.server,
            city,
            identifier,
            config.quality,
          )

          return !isSnapshotFresh(snapshots.get(key))
        })
      })

    if (identifiersToRefresh.length === 0) {
      set({ status: 'success', error: null })
      return
    }

    const requestId = ++latestRequestId
    set({ status: 'loading', error: null })

    try {
      const fetched = await fetchCurrentAodpPrices({
        server: config.server,
        itemIdentifiers: identifiersToRefresh,
        cities,
        quality: config.quality,
      })

      if (requestId !== latestRequestId) return

      const nextSnapshots = new Map(get().snapshots)
      for (const [key, snapshot] of fetched) {
        nextSnapshots.set(key, snapshot)
      }

      saveMarketCache(nextSnapshots)
      set({
        snapshots: nextSnapshots,
        status: 'success',
        error: null,
        lastSuccessfulFetchAt: new Date().toISOString(),
      })
    } catch (error) {
      if (requestId !== latestRequestId) return

      set({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'No fue posible consultar AODP',
      })
    }
  },

  clearCache: () => {
    clearStoredMarketCache()
    set({
      snapshots: new Map(),
      status: 'idle',
      error: null,
      lastSuccessfulFetchAt: null,
    })
  },

  setManualSellPrice: (rootKey, price) => {
    const next = new Map(get().manualSellPrices)

    if (price === null) {
      next.delete(rootKey)
    } else if (Number.isFinite(price) && price >= 0) {
      next.set(rootKey, price)
    } else {
      return
    }

    saveManualSellPrices(next)
    set({ manualSellPrices: next })
  },
}))
