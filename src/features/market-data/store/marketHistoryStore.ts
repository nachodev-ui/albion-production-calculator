import { create } from 'zustand'
import { fetchMarketHistoryWithFallback } from '../api/historyReadService'
import {
  describeMarketError,
  describeNoMarketData,
  isMarketRequestAbort,
} from '../api/marketErrorMessages'
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
import type {
  MarketHistoryCandidate,
  MarketHistoryRefreshProgress,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
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

interface RefreshMarketHistoryCandidatesParams {
  readonly candidates: readonly MarketHistoryCandidate[]
  readonly force?: boolean
}

interface MarketHistoryState {
  readonly snapshots: ReadonlyMap<string, MarketHistorySnapshot>
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly warnings: readonly string[]
  readonly lastSuccessfulFetchAt: string | null
  readonly optimizerStatus: MarketRequestStatus
  readonly optimizerError: string | null
  readonly optimizerWarnings: readonly string[]
  readonly optimizerProgress: MarketHistoryRefreshProgress | null

  refreshHistory: (params: RefreshMarketHistoryParams) => Promise<void>
  refreshCandidates: (
    params: RefreshMarketHistoryCandidatesParams,
  ) => Promise<void>
  clearCache: () => void
}

let latestChartRequestId = 0
let latestOptimizerRequestId = 0
let activeChartRequestController: AbortController | null = null
let activeOptimizerRequestController: AbortController | null = null

function abortActiveChartRequest(): void {
  activeChartRequestController?.abort()
  activeChartRequestController = null
}

function abortActiveOptimizerRequest(): void {
  activeOptimizerRequestController?.abort()
  activeOptimizerRequestController = null
}

function isSnapshotFresh(
  snapshot: MarketHistorySnapshot | undefined,
  expectedRangeEnd: string,
): boolean {
  if (
    !snapshot ||
    snapshot.source === 'browser-cache' ||
    snapshot.rangeEnd !== expectedRangeEnd
  ) {
    return false
  }

  return (
    Date.now() - Date.parse(snapshot.fetchedAt) <
    MARKET_HISTORY_CACHE_TTL_MS
  )
}

function dedupeCandidates(
  candidates: readonly MarketHistoryCandidate[],
): readonly MarketHistoryCandidate[] {
  const unique = new Map<string, MarketHistoryCandidate>()

  for (const candidate of candidates) {
    unique.set(
      buildMarketHistoryCacheKey(
        candidate.server,
        candidate.city,
        candidate.itemIdentifier,
        candidate.quality,
      ),
      candidate,
    )
  }

  return Array.from(unique.values())
}

function latestFetchedAt(
  snapshots: Iterable<MarketHistorySnapshot>,
): string | null {
  let latest: string | null = null

  for (const snapshot of snapshots) {
    if (!latest || Date.parse(snapshot.fetchedAt) > Date.parse(latest)) {
      latest = snapshot.fetchedAt
    }
  }

  return latest
}

const initialSnapshots = loadMarketHistoryCache()

export const useMarketHistoryStore = create<MarketHistoryState>((set, get) => ({
  snapshots: initialSnapshots,
  status: 'idle',
  error: null,
  warnings: [],
  lastSuccessfulFetchAt: null,
  optimizerStatus: 'idle',
  optimizerError: null,
  optimizerWarnings: [],
  optimizerProgress: null,

  refreshHistory: async ({ target, config, force = false }) => {
    if (!target) {
      latestChartRequestId += 1
      abortActiveChartRequest()
      set({ status: 'idle', error: null, warnings: [] })
      return
    }

    const itemIdentifier = buildMarketItemIdentifier(
      target.itemId,
      target.enchantment,
    )
    const candidate: MarketHistoryCandidate = {
      server: config.server,
      city: config.saleCity,
      itemIdentifier,
      quality: config.quality,
    }
    const cacheKey = buildMarketHistoryCacheKey(
      candidate.server,
      candidate.city,
      candidate.itemIdentifier,
      candidate.quality,
    )
    const range = getCompletedUtcDateRange(MARKET_HISTORY_DAYS)
    const cached = get().snapshots.get(cacheKey)

    if (!force && isSnapshotFresh(cached, range.end)) {
      latestChartRequestId += 1
      abortActiveChartRequest()
      set({ status: 'success', error: null, warnings: [] })
      return
    }

    const requestId = ++latestChartRequestId
    abortActiveChartRequest()
    const requestController = new AbortController()
    activeChartRequestController = requestController

    set({ status: 'loading', error: null, warnings: [] })

    try {
      const result = await fetchMarketHistoryWithFallback({
        candidates: [candidate],
        rangeStart: range.start,
        rangeEnd: range.end,
        cachedSnapshots: get().snapshots,
        signal: requestController.signal,
      })

      if (requestId !== latestChartRequestId) return
      if (activeChartRequestController === requestController) {
        activeChartRequestController = null
      }

      const snapshot = result.snapshots.get(cacheKey)
      if (!snapshot) {
        throw new Error(
          result.warnings.join('. ') || describeNoMarketData('history'),
        )
      }

      const nextSnapshots = new Map(get().snapshots)
      nextSnapshots.set(cacheKey, snapshot)
      saveMarketHistoryCache(nextSnapshots)

      set({
        snapshots: nextSnapshots,
        status: 'success',
        error: null,
        warnings: result.warnings,
        lastSuccessfulFetchAt: snapshot.fetchedAt,
      })
    } catch (error) {
      if (requestId !== latestChartRequestId || isMarketRequestAbort(error)) return
      if (activeChartRequestController === requestController) {
        activeChartRequestController = null
      }

      set({
        status: 'error',
        warnings: [],
        error: describeMarketError(error, {
          fallback: 'No fue posible consultar el historial de mercado',
        }),
      })
    }
  },

  refreshCandidates: async ({ candidates, force = false }) => {
    const uniqueCandidates = dedupeCandidates(candidates)

    if (uniqueCandidates.length === 0) {
      latestOptimizerRequestId += 1
      abortActiveOptimizerRequest()
      set({
        optimizerStatus: 'idle',
        optimizerError: null,
        optimizerWarnings: [],
        optimizerProgress: null,
      })
      return
    }

    const range = getCompletedUtcDateRange(MARKET_HISTORY_DAYS)
    const currentSnapshots = get().snapshots
    const pending = uniqueCandidates.filter((candidate) => {
      if (force) return true

      const cacheKey = buildMarketHistoryCacheKey(
        candidate.server,
        candidate.city,
        candidate.itemIdentifier,
        candidate.quality,
      )

      return !isSnapshotFresh(currentSnapshots.get(cacheKey), range.end)
    })

    if (pending.length === 0) {
      latestOptimizerRequestId += 1
      abortActiveOptimizerRequest()
      set({
        optimizerStatus: 'success',
        optimizerError: null,
        optimizerWarnings: [],
        optimizerProgress: {
          completed: uniqueCandidates.length,
          total: uniqueCandidates.length,
          failed: 0,
        },
      })
      return
    }

    const requestId = ++latestOptimizerRequestId
    abortActiveOptimizerRequest()
    const requestController = new AbortController()
    activeOptimizerRequestController = requestController
    const cachedCount = uniqueCandidates.length - pending.length

    set({
      optimizerStatus: 'loading',
      optimizerError: null,
      optimizerWarnings: [],
      optimizerProgress: {
        completed: cachedCount,
        total: uniqueCandidates.length,
        failed: 0,
      },
    })

    try {
      const result = await fetchMarketHistoryWithFallback({
        candidates: pending,
        rangeStart: range.start,
        rangeEnd: range.end,
        cachedSnapshots: currentSnapshots,
        signal: requestController.signal,
      })

      if (requestId !== latestOptimizerRequestId) return
      if (activeOptimizerRequestController === requestController) {
        activeOptimizerRequestController = null
      }

      const nextSnapshots = new Map(get().snapshots)
      for (const [key, snapshot] of result.snapshots) {
        nextSnapshots.set(key, snapshot)
      }

      if (result.snapshots.size > 0) saveMarketHistoryCache(nextSnapshots)

      const failed = result.failedKeys.length
      const allRequestsFailed =
        failed === pending.length && cachedCount === 0

      set({
        snapshots: nextSnapshots,
        optimizerStatus: allRequestsFailed ? 'error' : 'success',
        optimizerError:
          failed > 0
            ? `No se pudo obtener el historial de ${failed} de ${pending.length} combinaciones pendientes. Puedes reintentar; si existe caché, se mantendrá como reserva.`
            : null,
        optimizerWarnings: result.warnings,
        optimizerProgress: {
          completed: uniqueCandidates.length,
          total: uniqueCandidates.length,
          failed,
        },
        lastSuccessfulFetchAt:
          latestFetchedAt(result.snapshots.values()) ??
          get().lastSuccessfulFetchAt,
      })
    } catch (error) {
      if (requestId !== latestOptimizerRequestId || isMarketRequestAbort(error)) {
        return
      }
      if (activeOptimizerRequestController === requestController) {
        activeOptimizerRequestController = null
      }

      set({
        optimizerStatus: 'error',
        optimizerWarnings: [],
        optimizerError: describeMarketError(error, {
          fallback: 'No fue posible consultar el historial para el optimizador',
        }),
        optimizerProgress: {
          completed: uniqueCandidates.length,
          total: uniqueCandidates.length,
          failed: pending.length,
        },
      })
    }
  },

  clearCache: () => {
    latestChartRequestId += 1
    latestOptimizerRequestId += 1
    abortActiveChartRequest()
    abortActiveOptimizerRequest()
    clearStoredMarketHistoryCache()
    set({
      snapshots: new Map(),
      status: 'idle',
      error: null,
      warnings: [],
      lastSuccessfulFetchAt: null,
      optimizerStatus: 'idle',
      optimizerError: null,
      optimizerWarnings: [],
      optimizerProgress: null,
    })
  },
}))
