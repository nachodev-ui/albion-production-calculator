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
  readonly lastSuccessfulFetchAt: string | null
  readonly optimizerStatus: MarketRequestStatus
  readonly optimizerError: string | null
  readonly optimizerProgress: MarketHistoryRefreshProgress | null

  refreshHistory: (params: RefreshMarketHistoryParams) => Promise<void>
  refreshCandidates: (
    params: RefreshMarketHistoryCandidatesParams,
  ) => Promise<void>
  clearCache: () => void
}

let latestChartRequestId = 0
let latestOptimizerRequestId = 0
const inFlightRequests = new Map<string, Promise<MarketHistorySnapshot>>()
const OPTIMIZER_HISTORY_CONCURRENCY = 4

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

function fetchCandidate(
  candidate: MarketHistoryCandidate,
  range: { readonly start: string; readonly end: string },
): Promise<MarketHistorySnapshot> {
  const cacheKey = buildMarketHistoryCacheKey(
    candidate.server,
    candidate.city,
    candidate.itemIdentifier,
    candidate.quality,
  )
  const existing = inFlightRequests.get(cacheKey)
  if (existing) return existing

  const request = fetchLocalMarketHistory({
    ...candidate,
    rangeStart: range.start,
    rangeEnd: range.end,
  }).finally(() => {
    inFlightRequests.delete(cacheKey)
  })

  inFlightRequests.set(cacheKey, request)
  return request
}

async function runWithConcurrency<T>(
  values: readonly T[],
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0

  async function runWorker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex
      nextIndex += 1
      const value = values[index]
      if (value !== undefined) {
        await worker(value)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => runWorker(),
    ),
  )
}

const initialSnapshots = loadMarketHistoryCache()

export const useMarketHistoryStore = create<MarketHistoryState>((set, get) => ({
  snapshots: initialSnapshots,
  status: 'idle',
  error: null,
  lastSuccessfulFetchAt: null,
  optimizerStatus: 'idle',
  optimizerError: null,
  optimizerProgress: null,

  refreshHistory: async ({ target, config, force = false }) => {
    if (!target) {
      set({ status: 'idle', error: null })
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
      set({ status: 'success', error: null })
      return
    }

    const requestId = ++latestChartRequestId
    set({ status: 'loading', error: null })

    try {
      const snapshot = await fetchCandidate(candidate, range)

      if (requestId !== latestChartRequestId) return

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
      if (requestId !== latestChartRequestId) return

      set({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'No fue posible consultar el historial del servicio local',
      })
    }
  },

  refreshCandidates: async ({ candidates, force = false }) => {
    const uniqueCandidates = dedupeCandidates(candidates)

    if (uniqueCandidates.length === 0) {
      set({
        optimizerStatus: 'idle',
        optimizerError: null,
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
      set({
        optimizerStatus: 'success',
        optimizerError: null,
        optimizerProgress: {
          completed: uniqueCandidates.length,
          total: uniqueCandidates.length,
          failed: 0,
        },
      })
      return
    }

    const requestId = ++latestOptimizerRequestId
    const cachedCount = uniqueCandidates.length - pending.length
    let completed = cachedCount
    let failed = 0
    const fetchedSnapshots: MarketHistorySnapshot[] = []

    set({
      optimizerStatus: 'loading',
      optimizerError: null,
      optimizerProgress: {
        completed,
        total: uniqueCandidates.length,
        failed,
      },
    })

    await runWithConcurrency(
      pending,
      OPTIMIZER_HISTORY_CONCURRENCY,
      async (candidate) => {
        try {
          fetchedSnapshots.push(await fetchCandidate(candidate, range))
        } catch {
          failed += 1
        } finally {
          completed += 1

          if (requestId === latestOptimizerRequestId) {
            set({
              optimizerProgress: {
                completed,
                total: uniqueCandidates.length,
                failed,
              },
            })
          }
        }
      },
    )

    const nextSnapshots = new Map(get().snapshots)
    for (const snapshot of fetchedSnapshots) {
      nextSnapshots.set(
        buildMarketHistoryCacheKey(
          snapshot.server,
          snapshot.city,
          snapshot.itemIdentifier,
          snapshot.quality,
        ),
        snapshot,
      )
    }

    if (fetchedSnapshots.length > 0) {
      saveMarketHistoryCache(nextSnapshots)
    }

    if (requestId !== latestOptimizerRequestId) {
      if (fetchedSnapshots.length > 0) {
        set({ snapshots: nextSnapshots })
      }
      return
    }

    const allRequestsFailed =
      failed === pending.length && cachedCount === 0
    const error =
      failed > 0
        ? `No se pudo consultar el historial de ${failed} de ${pending.length} mercados pendientes.`
        : null

    set({
      snapshots: nextSnapshots,
      optimizerStatus: allRequestsFailed ? 'error' : 'success',
      optimizerError: error,
      optimizerProgress: {
        completed: uniqueCandidates.length,
        total: uniqueCandidates.length,
        failed,
      },
      lastSuccessfulFetchAt:
        fetchedSnapshots.at(-1)?.fetchedAt ?? get().lastSuccessfulFetchAt,
    })
  },

  clearCache: () => {
    clearStoredMarketHistoryCache()
    set({
      snapshots: new Map(),
      status: 'idle',
      error: null,
      lastSuccessfulFetchAt: null,
      optimizerStatus: 'idle',
      optimizerError: null,
      optimizerProgress: null,
    })
  },
}))
