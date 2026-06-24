import { create } from 'zustand'
import { fetchLocalMarketHistory } from '../api/localHistoryClient'
import {
  clearStoredMarketHistoryCache,
  loadMarketHistoryCache,
  saveMarketHistoryCache,
} from '../storage/marketHistoryStorage'
import {
  MARKET_HISTORY_CACHE_TTL_MS,
  MARKET_HISTORY_DAYS,
  buildMarketHistoryCacheKey,
} from '../types/MarketHistory'
import type { MarketHistorySnapshot } from '../types/MarketHistory'
import type {
  MarketConfig,
  MarketPriceTarget,
  MarketRequestStatus,
} from '../types/MarketPrice'
import { buildMarketItemIdentifier } from '../types/MarketPrice'
import { getCompletedUtcDateRange } from '../utils/marketHistoryAnalytics'

interface RefreshMarketHistoryParams {
  readonly target: MarketPriceTarget | null
  readonly config: MarketConfig
  readonly force?: boolean
}

interface MarketHistoryState {
  readonly snapshots: ReadonlyMap<string, MarketHistorySnapshot>
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly lastSuccessfulFetchAt: string | null

  refreshHistory: (params: RefreshMarketHistoryParams) => Promise<void>
  clearCache: () => void
}

let latestRequestId = 0

function isSnapshotFresh(
  snapshot: MarketHistorySnapshot | undefined,
  expectedRangeEnd: string,
): boolean {
  if (!snapshot || snapshot.rangeEnd !== expectedRangeEnd) return false

  return (
    Date.now() - Date.parse(snapshot.fetchedAt) <
    MARKET_HISTORY_CACHE_TTL_MS
  )
}

const initialSnapshots = loadMarketHistoryCache()

export const useMarketHistoryStore = create<MarketHistoryState>((set, get) => ({
  snapshots: initialSnapshots,
  status: 'idle',
  error: null,
  lastSuccessfulFetchAt: null,

  refreshHistory: async ({ target, config, force = false }) => {
    if (!target) {
      set({ status: 'idle', error: null })
      return
    }

    const itemIdentifier = buildMarketItemIdentifier(
      target.itemId,
      target.enchantment,
    )
    const cacheKey = buildMarketHistoryCacheKey(
      config.server,
      config.saleCity,
      itemIdentifier,
      config.quality,
    )
    const range = getCompletedUtcDateRange(MARKET_HISTORY_DAYS)
    const cached = get().snapshots.get(cacheKey)

    if (!force && isSnapshotFresh(cached, range.end)) {
      set({ status: 'success', error: null })
      return
    }

    const requestId = ++latestRequestId
    set({ status: 'loading', error: null })

    try {
      const snapshot = await fetchLocalMarketHistory({
        server: config.server,
        itemIdentifier,
        city: config.saleCity,
        quality: config.quality,
        rangeStart: range.start,
        rangeEnd: range.end,
      })

      if (requestId !== latestRequestId) return

      const nextSnapshots = new Map(get().snapshots)
      nextSnapshots.set(cacheKey, snapshot)
      saveMarketHistoryCache(nextSnapshots)

      set({
        snapshots: nextSnapshots,
        status: 'success',
        error: null,
        lastSuccessfulFetchAt: snapshot.fetchedAt,
      })
    } catch (error) {
      if (requestId !== latestRequestId) return

      set({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'No fue posible consultar el historial del servicio local',
      })
    }
  },

  clearCache: () => {
    clearStoredMarketHistoryCache()
    set({
      snapshots: new Map(),
      status: 'idle',
      error: null,
      lastSuccessfulFetchAt: null,
    })
  },
}))
