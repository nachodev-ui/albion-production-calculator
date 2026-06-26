import type {
  MarketHistoryPoint,
  MarketHistorySnapshot,
} from '../types/MarketHistory'

const HISTORY_CACHE_STORAGE_KEY =
  'albion-production-calculator.market-history-cache.v3'
const LEGACY_HISTORY_CACHE_STORAGE_KEYS = [
  'albion-production-calculator.local-market-history-cache.v2',
  'albion-production-calculator.market-history-cache.v2',
  'albion-production-calculator.market-history-cache.v1',
  'albion-production-calculator.local-market-history-cache.v1',
] as const
const STORAGE_VERSION = 3
const MAX_CACHE_ENTRIES = 400
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface PersistedMarketHistoryCache {
  readonly version: number
  readonly snapshots: readonly (readonly [string, unknown])[]
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isValidHistoryPoint(value: unknown): value is MarketHistoryPoint {
  if (!isObject(value)) return false

  const candidate = value as Partial<MarketHistoryPoint>

  return (
    typeof candidate.timestamp === 'string' &&
    Number.isFinite(Date.parse(candidate.timestamp)) &&
    (candidate.averagePrice === null ||
      (typeof candidate.averagePrice === 'number' &&
        Number.isFinite(candidate.averagePrice) &&
        candidate.averagePrice > 0)) &&
    typeof candidate.itemCount === 'number' &&
    Number.isFinite(candidate.itemCount) &&
    candidate.itemCount >= 0
  )
}

function normalizeHistorySnapshot(
  value: unknown,
): MarketHistorySnapshot | null {
  if (!isObject(value)) return null

  const candidate = value as Partial<MarketHistorySnapshot>
  if (
    (candidate.server !== 'americas' &&
      candidate.server !== 'europe' &&
      candidate.server !== 'asia') ||
    typeof candidate.itemIdentifier !== 'string' ||
    typeof candidate.city !== 'string' ||
    candidate.city.trim().length === 0 ||
    typeof candidate.quality !== 'number' ||
    !Number.isInteger(candidate.quality) ||
    candidate.quality < 1 ||
    candidate.quality > 5 ||
    typeof candidate.rangeStart !== 'string' ||
    typeof candidate.rangeEnd !== 'string' ||
    !Number.isFinite(Date.parse(`${candidate.rangeStart}T00:00:00Z`)) ||
    !Number.isFinite(Date.parse(`${candidate.rangeEnd}T00:00:00Z`)) ||
    !Array.isArray(candidate.points) ||
    !candidate.points.every(isValidHistoryPoint) ||
    typeof candidate.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.fetchedAt))
  ) {
    return null
  }

  return {
    server: candidate.server,
    itemIdentifier: candidate.itemIdentifier,
    city: candidate.city,
    quality: candidate.quality,
    rangeStart: candidate.rangeStart,
    rangeEnd: candidate.rangeEnd,
    points: candidate.points,
    // Todo snapshot restaurado es caché, aunque originalmente viniera de red.
    source: 'browser-cache',
    fetchedAt: candidate.fetchedAt,
  }
}

function readPersistedCache(
  storage: Storage,
  key: string,
): PersistedMarketHistoryCache | null {
  const raw = storage.getItem(key)
  if (!raw) return null

  const parsed: unknown = JSON.parse(raw)
  if (!isObject(parsed)) return null

  const candidate = parsed as Partial<PersistedMarketHistoryCache>
  if (!Array.isArray(candidate.snapshots)) return null

  return {
    version: typeof candidate.version === 'number' ? candidate.version : 1,
    snapshots: candidate.snapshots,
  }
}

export function loadMarketHistoryCache(): Map<
  string,
  MarketHistorySnapshot
> {
  const storage = getLocalStorage()
  const result = new Map<string, MarketHistorySnapshot>()
  if (!storage) return result

  try {
    const keys = [HISTORY_CACHE_STORAGE_KEY, ...LEGACY_HISTORY_CACHE_STORAGE_KEYS]
    let persisted: PersistedMarketHistoryCache | null = null

    for (const key of keys) {
      persisted = readPersistedCache(storage, key)
      if (persisted) break
    }
    if (!persisted) return result

    const oldestAllowed = Date.now() - MAX_CACHE_AGE_MS

    for (const entry of persisted.snapshots) {
      if (!Array.isArray(entry) || entry.length !== 2) continue

      const [key, rawSnapshot] = entry
      const snapshot = normalizeHistorySnapshot(rawSnapshot)
      if (
        typeof key !== 'string' ||
        !snapshot ||
        Date.parse(snapshot.fetchedAt) < oldestAllowed
      ) {
        continue
      }

      result.set(key, snapshot)
    }

    if (result.size > 0 && persisted.version !== STORAGE_VERSION) {
      saveMarketHistoryCache(result)
    }
  } catch {
    return new Map()
  }

  return result
}

export function saveMarketHistoryCache(
  snapshots: ReadonlyMap<string, MarketHistorySnapshot>,
): void {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    const recentEntries = Array.from(snapshots.entries())
      .sort(
        (left, right) =>
          Date.parse(right[1].fetchedAt) - Date.parse(left[1].fetchedAt),
      )
      .slice(0, MAX_CACHE_ENTRIES)

    const payload: PersistedMarketHistoryCache = {
      version: STORAGE_VERSION,
      snapshots: recentEntries,
    }

    storage.setItem(HISTORY_CACHE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // La aplicación puede continuar sin caché histórica persistente.
  }
}

export function clearStoredMarketHistoryCache(): void {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    storage.removeItem(HISTORY_CACHE_STORAGE_KEY)
    for (const key of LEGACY_HISTORY_CACHE_STORAGE_KEYS) {
      storage.removeItem(key)
    }
  } catch {
    // Sin acción.
  }
}
