import {
  getBrowserLocalStorage,
  isFreshTimestamp,
  isObject,
  newestEntries,
  readStorageJson,
  removeStorageKeys,
  writeStorageJson,
  type StoragePolicy,
} from '@shared/storage/browserStoragePolicy'
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

export const MARKET_HISTORY_STORAGE_POLICY = {
  currentKey: HISTORY_CACHE_STORAGE_KEY,
  legacyKeys: LEGACY_HISTORY_CACHE_STORAGE_KEYS,
  version: STORAGE_VERSION,
  maxEntries: MAX_CACHE_ENTRIES,
  maxAgeMs: MAX_CACHE_AGE_MS,
} as const satisfies StoragePolicy

interface PersistedMarketHistoryCache {
  readonly version: number
  readonly snapshots: readonly (readonly [string, unknown])[]
}

interface LoadedMarketHistoryCache extends PersistedMarketHistoryCache {
  readonly storageKey: string
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
): LoadedMarketHistoryCache | null {
  const parsed = readStorageJson(storage, key)
  if (!isObject(parsed)) return null

  const candidate = parsed as Partial<PersistedMarketHistoryCache>
  if (!Array.isArray(candidate.snapshots)) return null

  return {
    storageKey: key,
    version: typeof candidate.version === 'number' ? candidate.version : 1,
    snapshots: candidate.snapshots,
  }
}

function persistMigratedHistoryCache(
  storage: Storage,
  loaded: LoadedMarketHistoryCache,
  snapshots: ReadonlyMap<string, MarketHistorySnapshot>,
): void {
  if (
    loaded.storageKey === HISTORY_CACHE_STORAGE_KEY &&
    loaded.version === STORAGE_VERSION
  ) {
    return
  }

  saveMarketHistoryCache(snapshots)
  removeStorageKeys(storage, LEGACY_HISTORY_CACHE_STORAGE_KEYS)
}

export function loadMarketHistoryCache(): Map<
  string,
  MarketHistorySnapshot
> {
  const storage = getBrowserLocalStorage()
  const result = new Map<string, MarketHistorySnapshot>()
  if (!storage) return result

  try {
    const keys = [HISTORY_CACHE_STORAGE_KEY, ...LEGACY_HISTORY_CACHE_STORAGE_KEYS]
    let loaded: LoadedMarketHistoryCache | null = null

    for (const key of keys) {
      loaded = readPersistedCache(storage, key)
      if (loaded) break
    }
    if (!loaded) return result

    for (const entry of loaded.snapshots) {
      if (!Array.isArray(entry) || entry.length !== 2) continue

      const [key, rawSnapshot] = entry
      const snapshot = normalizeHistorySnapshot(rawSnapshot)
      if (
        typeof key !== 'string' ||
        !snapshot ||
        !isFreshTimestamp(snapshot.fetchedAt, MAX_CACHE_AGE_MS)
      ) {
        continue
      }

      result.set(key, snapshot)
    }

    if (result.size > 0) {
      persistMigratedHistoryCache(storage, loaded, result)
    }
  } catch {
    return new Map()
  }

  return result
}

export function saveMarketHistoryCache(
  snapshots: ReadonlyMap<string, MarketHistorySnapshot>,
): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    const recentEntries = newestEntries(
      Array.from(snapshots.entries()),
      MAX_CACHE_ENTRIES,
      (snapshot) => snapshot.fetchedAt,
    )

    const payload: PersistedMarketHistoryCache = {
      version: STORAGE_VERSION,
      snapshots: recentEntries,
    }

    writeStorageJson(storage, HISTORY_CACHE_STORAGE_KEY, payload)
  } catch {
    // La aplicación puede continuar sin caché histórica persistente.
  }
}

export function clearStoredMarketHistoryCache(): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    removeStorageKeys(storage, [
      HISTORY_CACHE_STORAGE_KEY,
      ...LEGACY_HISTORY_CACHE_STORAGE_KEYS,
    ])
  } catch {
    // Sin acción.
  }
}
