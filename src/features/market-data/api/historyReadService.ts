import type {
  MarketHistoryCandidate,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
import { buildMarketHistoryCacheKey } from '../types/MarketHistory'
import type {
  AlbionServer,
  MarketDataSource,
} from '../types/MarketPrice'
import { fetchCentralMarketHistory } from './centralHistoryClient'
import { fetchLocalMarketHistory } from './localHistoryClient'

export interface MarketHistoryReadResult {
  readonly snapshots: ReadonlyMap<string, MarketHistorySnapshot>
  readonly sources: readonly MarketDataSource[]
  readonly warnings: readonly string[]
  readonly failedKeys: readonly string[]
  readonly requestCount: number
}

interface FetchMarketHistoryWithFallbackParams {
  readonly candidates: readonly MarketHistoryCandidate[]
  readonly rangeStart: string
  readonly rangeEnd: string
  readonly cachedSnapshots?: ReadonlyMap<string, MarketHistorySnapshot>
  readonly signal?: AbortSignal
}

const LOCAL_HISTORY_CONCURRENCY = 4

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
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

function groupByServer(
  candidates: readonly MarketHistoryCandidate[],
): ReadonlyMap<AlbionServer, readonly MarketHistoryCandidate[]> {
  const grouped = new Map<AlbionServer, MarketHistoryCandidate[]>()

  for (const candidate of candidates) {
    const current = grouped.get(candidate.server) ?? []
    current.push(candidate)
    grouped.set(candidate.server, current)
  }

  return grouped
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
      if (value !== undefined) await worker(value)
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => runWorker(),
    ),
  )
}

function buildEmptySnapshot(
  candidate: MarketHistoryCandidate,
  rangeStart: string,
  rangeEnd: string,
  source: Exclude<MarketDataSource, 'browser-cache'>,
): MarketHistorySnapshot {
  return {
    ...candidate,
    rangeStart,
    rangeEnd,
    points: [],
    source,
    fetchedAt: new Date().toISOString(),
  }
}

function asBrowserCache(
  snapshot: MarketHistorySnapshot,
): MarketHistorySnapshot {
  return snapshot.source === 'browser-cache'
    ? snapshot
    : { ...snapshot, source: 'browser-cache' }
}

export async function fetchMarketHistoryWithFallback({
  candidates,
  rangeStart,
  rangeEnd,
  cachedSnapshots = new Map(),
  signal,
}: FetchMarketHistoryWithFallbackParams): Promise<MarketHistoryReadResult> {
  const requested = dedupeCandidates(candidates)
  if (requested.length === 0) {
    return {
      snapshots: new Map(),
      sources: [],
      warnings: [],
      failedKeys: [],
      requestCount: 0,
    }
  }

  const snapshots = new Map<string, MarketHistorySnapshot>()
  const emptyOnlineSnapshots = new Map<string, MarketHistorySnapshot>()
  const sources = new Set<MarketDataSource>()
  const warnings: string[] = []
  const centralSucceededServers = new Set<AlbionServer>()
  let requestCount = 0

  const serverGroups = groupByServer(requested)
  const centralSettled = await Promise.allSettled(
    Array.from(serverGroups.entries()).map(async ([server, group]) => {
      requestCount += 1
      const result = await fetchCentralMarketHistory({
        server,
        candidates: group,
        rangeStart,
        rangeEnd,
        signal,
      })
      return { server, result }
    }),
  )

  for (const settled of centralSettled) {
    if (settled.status === 'fulfilled') {
      centralSucceededServers.add(settled.value.server)
      for (const [key, snapshot] of settled.value.result) {
        if (snapshot.points.length > 0) {
          snapshots.set(key, snapshot)
          sources.add('central-api')
        } else {
          emptyOnlineSnapshots.set(key, snapshot)
        }
      }
    } else {
      warnings.push(
        `API central no disponible: ${describeError(settled.reason)}`,
      )
    }
  }

  const missing = requested.filter((candidate) => {
    const key = buildMarketHistoryCacheKey(
      candidate.server,
      candidate.city,
      candidate.itemIdentifier,
      candidate.quality,
    )
    return !snapshots.has(key)
  })
  const localErrors: string[] = []

  await runWithConcurrency(
    missing,
    LOCAL_HISTORY_CONCURRENCY,
    async (candidate) => {
      const key = buildMarketHistoryCacheKey(
        candidate.server,
        candidate.city,
        candidate.itemIdentifier,
        candidate.quality,
      )

      try {
        requestCount += 1
        const snapshot = await fetchLocalMarketHistory({
          ...candidate,
          rangeStart,
          rangeEnd,
          signal,
        })

        if (snapshot.points.length > 0) {
          snapshots.set(key, snapshot)
          sources.add('local-receiver')
        } else {
          emptyOnlineSnapshots.set(key, snapshot)
        }
      } catch (error) {
        localErrors.push(describeError(error))
      }
    },
  )

  if (localErrors.length > 0) {
    warnings.push(
      `Receiver local incompleto: ${Array.from(new Set(localErrors)).join('; ')}`,
    )
  }

  const failedKeys: string[] = []

  for (const candidate of requested) {
    const key = buildMarketHistoryCacheKey(
      candidate.server,
      candidate.city,
      candidate.itemIdentifier,
      candidate.quality,
    )
    if (snapshots.has(key)) continue

    const cached = cachedSnapshots.get(key)
    if (cached) {
      snapshots.set(key, asBrowserCache(cached))
      sources.add('browser-cache')
      continue
    }

    const emptyOnline = emptyOnlineSnapshots.get(key)
    if (emptyOnline) {
      snapshots.set(key, emptyOnline)
      sources.add(emptyOnline.source)
      continue
    }

    if (centralSucceededServers.has(candidate.server)) {
      const emptyCentral = buildEmptySnapshot(
        candidate,
        rangeStart,
        rangeEnd,
        'central-api',
      )
      snapshots.set(key, emptyCentral)
      sources.add('central-api')
      continue
    }

    failedKeys.push(key)
  }

  return {
    snapshots,
    sources: Array.from(sources),
    warnings,
    failedKeys,
    requestCount,
  }
}
