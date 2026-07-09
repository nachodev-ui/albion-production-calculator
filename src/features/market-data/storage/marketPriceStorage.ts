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
  MarketConfig,
  MarketDefinition,
  MarketPriceSnapshot,
  MarketType,
} from '../types/MarketPrice'
import { DEFAULT_MARKET_CONFIG } from '../types/MarketPrice'

const CONFIG_STORAGE_KEY = 'albion-production-calculator.market-config.v2'
const CACHE_STORAGE_KEY = 'albion-production-calculator.market-cache.v3'
const CATALOG_STORAGE_KEY =
  'albion-production-calculator.market-catalog-cache.v1'
const LEGACY_CACHE_STORAGE_KEYS = [
  'albion-production-calculator.local-market-cache.v2',
  'albion-production-calculator.local-market-cache.v1',
  'albion-production-calculator.market-cache.v1',
] as const
const SELL_OVERRIDES_STORAGE_KEY =
  'albion-production-calculator.manual-sell-prices.v1'
const STORAGE_VERSION = 2
const CACHE_STORAGE_VERSION = 3
const CATALOG_STORAGE_VERSION = 1
const MAX_CACHE_ENTRIES = 1500
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const MARKET_PRICE_STORAGE_POLICY = {
  config: {
    currentKey: CONFIG_STORAGE_KEY,
    version: STORAGE_VERSION,
  },
  cache: {
    currentKey: CACHE_STORAGE_KEY,
    legacyKeys: LEGACY_CACHE_STORAGE_KEYS,
    version: CACHE_STORAGE_VERSION,
    maxEntries: MAX_CACHE_ENTRIES,
    maxAgeMs: MAX_CACHE_AGE_MS,
  },
  catalog: {
    currentKey: CATALOG_STORAGE_KEY,
    version: CATALOG_STORAGE_VERSION,
  },
  manualSellPrices: {
    currentKey: SELL_OVERRIDES_STORAGE_KEY,
    version: STORAGE_VERSION,
  },
} as const satisfies Record<string, StoragePolicy>

interface PersistedMarketConfig {
  readonly version: number
  readonly config: MarketConfig
}

interface PersistedMarketCache {
  readonly version: number
  readonly snapshots: readonly (readonly [string, unknown])[]
}

interface PersistedMarketCatalog {
  readonly version: number
  readonly markets: readonly unknown[]
}

interface PersistedSellOverrides {
  readonly version: number
  readonly prices: readonly (readonly [string, number])[]
}

interface LoadedMarketCache {
  readonly storageKey: string
  readonly version: number
  readonly snapshots: readonly (readonly [string, unknown])[]
}

function isValidMarketKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMarketType(value: unknown): value is MarketType {
  return value === 'regular' || value === 'black-market'
}

function normalizeStoredMarket(value: unknown): MarketDefinition | null {
  if (!isObject(value)) return null

  const candidate = value as Partial<MarketDefinition>
  if (
    !isValidMarketKey(candidate.key) ||
    typeof candidate.name !== 'string' ||
    candidate.name.trim().length === 0 ||
    !isMarketType(candidate.type) ||
    typeof candidate.enabled !== 'boolean'
  ) {
    return null
  }

  return {
    key: candidate.key.trim(),
    name: candidate.name.trim(),
    type: candidate.type,
    enabled: candidate.enabled,
  }
}

function isValidMarketConfig(value: unknown): value is MarketConfig {
  if (!isObject(value)) return false

  const candidate = value as Partial<MarketConfig>

  return (
    (candidate.server === 'americas' ||
      candidate.server === 'europe' ||
      candidate.server === 'asia') &&
    isValidMarketKey(candidate.purchaseCity) &&
    isValidMarketKey(candidate.saleCity) &&
    (candidate.purchaseStrategy === 'buy-now' ||
      candidate.purchaseStrategy === 'buy-order') &&
    (candidate.saleStrategy === 'sell-order' ||
      candidate.saleStrategy === 'sell-now') &&
    typeof candidate.quality === 'number' &&
    Number.isInteger(candidate.quality) &&
    candidate.quality >= 1 &&
    candidate.quality <= 5
  )
}

function isNullablePrice(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isFinite(value) && value > 0)
  )
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function normalizeStoredSnapshot(value: unknown): MarketPriceSnapshot | null {
  if (!isObject(value)) return null

  const candidate = value as Partial<MarketPriceSnapshot>

  if (
    (candidate.server !== 'americas' &&
      candidate.server !== 'europe' &&
      candidate.server !== 'asia') ||
    typeof candidate.itemIdentifier !== 'string' ||
    !isValidMarketKey(candidate.city) ||
    typeof candidate.quality !== 'number' ||
    !Number.isInteger(candidate.quality) ||
    candidate.quality <= 0 ||
    !isNullablePrice(candidate.sellPriceMin) ||
    !isNullableDate(candidate.sellPriceMinDate) ||
    !isNullablePrice(candidate.buyPriceMax) ||
    !isNullableDate(candidate.buyPriceMaxDate) ||
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
    sellPriceMin: candidate.sellPriceMin,
    sellPriceMinDate: candidate.sellPriceMinDate,
    sellPriceSource: candidate.sellPriceMin === null ? null : 'browser-cache',
    buyPriceMax: candidate.buyPriceMax,
    buyPriceMaxDate: candidate.buyPriceMaxDate,
    buyPriceSource: candidate.buyPriceMax === null ? null : 'browser-cache',
    source: 'browser-cache',
    fetchedAt: candidate.fetchedAt,
  }
}

function readPersistedMarketCache(
  storage: Storage,
  storageKey: string,
): LoadedMarketCache | null {
  const parsed = readStorageJson(storage, storageKey)
  if (!isObject(parsed)) return null

  const candidate = parsed as Partial<PersistedMarketCache>
  if (!Array.isArray(candidate.snapshots)) return null

  return {
    storageKey,
    version:
      typeof candidate.version === 'number' ? candidate.version : 1,
    snapshots: candidate.snapshots,
  }
}

function persistMigratedMarketCache(
  storage: Storage,
  loaded: LoadedMarketCache,
  snapshots: ReadonlyMap<string, MarketPriceSnapshot>,
): void {
  if (
    loaded.storageKey === CACHE_STORAGE_KEY &&
    loaded.version === CACHE_STORAGE_VERSION
  ) {
    return
  }

  saveMarketCache(snapshots)
  removeStorageKeys(storage, LEGACY_CACHE_STORAGE_KEYS)
}

export function loadMarketConfig(): MarketConfig {
  const storage = getBrowserLocalStorage()
  if (!storage) return DEFAULT_MARKET_CONFIG

  try {
    const parsed = readStorageJson(storage, CONFIG_STORAGE_KEY)
    if (!isObject(parsed)) return DEFAULT_MARKET_CONFIG

    const candidate = parsed as Partial<PersistedMarketConfig>
    return candidate.version === STORAGE_VERSION &&
      isValidMarketConfig(candidate.config)
      ? candidate.config
      : DEFAULT_MARKET_CONFIG
  } catch {
    return DEFAULT_MARKET_CONFIG
  }
}

export function saveMarketConfig(config: MarketConfig): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    const payload: PersistedMarketConfig = {
      version: STORAGE_VERSION,
      config,
    }

    writeStorageJson(storage, CONFIG_STORAGE_KEY, payload)
  } catch {
    // El cálculo sigue funcionando aunque el navegador bloquee storage.
  }
}

export function loadMarketCatalog(): readonly MarketDefinition[] {
  const storage = getBrowserLocalStorage()
  if (!storage) return []

  try {
    const parsed = readStorageJson(storage, CATALOG_STORAGE_KEY)
    if (!isObject(parsed)) return []

    const candidate = parsed as Partial<PersistedMarketCatalog>
    if (
      candidate.version !== CATALOG_STORAGE_VERSION ||
      !Array.isArray(candidate.markets)
    ) {
      return []
    }

    const markets = candidate.markets.flatMap((value) => {
      const market = normalizeStoredMarket(value)
      return market?.enabled ? [market] : []
    })

    return Array.from(
      new Map(markets.map((market) => [market.key, market])).values(),
    )
  } catch {
    return []
  }
}

export function saveMarketCatalog(markets: readonly MarketDefinition[]): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    const payload: PersistedMarketCatalog = {
      version: CATALOG_STORAGE_VERSION,
      markets: markets.filter((market) => market.enabled),
    }

    writeStorageJson(storage, CATALOG_STORAGE_KEY, payload)
  } catch {
    // El catálogo remoto puede seguir utilizándose aunque falle localStorage.
  }
}

export function loadMarketCache(): Map<string, MarketPriceSnapshot> {
  const storage = getBrowserLocalStorage()
  const result = new Map<string, MarketPriceSnapshot>()
  if (!storage) return result

  const keys = [CACHE_STORAGE_KEY, ...LEGACY_CACHE_STORAGE_KEYS]

  for (const storageKey of keys) {
    try {
      const loaded = readPersistedMarketCache(storage, storageKey)
      if (!loaded) continue

      for (const entry of loaded.snapshots) {
        if (!Array.isArray(entry) || entry.length !== 2) continue

        const [key, storedSnapshot] = entry
        const snapshot = normalizeStoredSnapshot(storedSnapshot)
        if (typeof key !== 'string' || !snapshot) continue
        if (!isFreshTimestamp(snapshot.fetchedAt, MAX_CACHE_AGE_MS)) continue

        result.set(key, snapshot)
      }

      if (result.size > 0) {
        persistMigratedMarketCache(storage, loaded, result)
        break
      }
    } catch {
      // Intenta con la siguiente versión legado.
    }
  }

  return result
}

export function saveMarketCache(
  snapshots: ReadonlyMap<string, MarketPriceSnapshot>,
): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    const recentEntries = newestEntries(
      Array.from(snapshots.entries()),
      MAX_CACHE_ENTRIES,
      (snapshot) => snapshot.fetchedAt,
    )

    const payload: PersistedMarketCache = {
      version: CACHE_STORAGE_VERSION,
      snapshots: recentEntries,
    }

    writeStorageJson(storage, CACHE_STORAGE_KEY, payload)
  } catch {
    // Una cuota de almacenamiento llena no debe romper el cálculo.
  }
}

export function clearStoredMarketCache(): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    removeStorageKeys(storage, [CACHE_STORAGE_KEY, ...LEGACY_CACHE_STORAGE_KEYS])
  } catch {
    // Sin acción.
  }
}

export function loadManualSellPrices(): Map<string, number> {
  const storage = getBrowserLocalStorage()
  const result = new Map<string, number>()
  if (!storage) return result

  try {
    const parsed = readStorageJson(storage, SELL_OVERRIDES_STORAGE_KEY)
    if (!isObject(parsed)) return result

    const candidate = parsed as Partial<PersistedSellOverrides>
    if (
      candidate.version !== STORAGE_VERSION ||
      !Array.isArray(candidate.prices)
    ) {
      return result
    }

    for (const entry of candidate.prices) {
      if (!Array.isArray(entry) || entry.length !== 2) continue

      const [key, price] = entry
      if (
        typeof key !== 'string' ||
        typeof price !== 'number' ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        continue
      }

      result.set(key, price)
    }
  } catch {
    return new Map()
  }

  return result
}

export function saveManualSellPrices(
  prices: ReadonlyMap<string, number>,
): void {
  const storage = getBrowserLocalStorage()
  if (!storage) return

  try {
    const payload: PersistedSellOverrides = {
      version: STORAGE_VERSION,
      prices: Array.from(prices.entries()),
    }

    writeStorageJson(storage, SELL_OVERRIDES_STORAGE_KEY, payload)
  } catch {
    // Sin acción.
  }
}
