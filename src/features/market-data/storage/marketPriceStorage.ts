import type {
  MarketConfig,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import { DEFAULT_MARKET_CONFIG } from '../types/MarketPrice'

const CONFIG_STORAGE_KEY = 'albion-production-calculator.market-config.v1'
const CACHE_STORAGE_KEY = 'albion-production-calculator.market-cache.v1'
const SELL_OVERRIDES_STORAGE_KEY =
  'albion-production-calculator.manual-sell-prices.v1'
const STORAGE_VERSION = 1
const MAX_CACHE_ENTRIES = 1500
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface PersistedMarketConfig {
  readonly version: number
  readonly config: MarketConfig
}

interface PersistedMarketCache {
  readonly version: number
  readonly snapshots: readonly (readonly [string, MarketPriceSnapshot])[]
}

interface PersistedSellOverrides {
  readonly version: number
  readonly prices: readonly (readonly [string, number])[]
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

function isValidMarketConfig(value: unknown): value is MarketConfig {
  if (!isObject(value)) return false

  const candidate = value as Partial<MarketConfig>

  return (
    (candidate.server === 'americas' ||
      candidate.server === 'europe' ||
      candidate.server === 'asia') &&
    (candidate.purchaseCity === 'martlock' ||
      candidate.purchaseCity === 'bridgewatch' ||
      candidate.purchaseCity === 'lymhurst' ||
      candidate.purchaseCity === 'fort_sterling' ||
      candidate.purchaseCity === 'thetford' ||
      candidate.purchaseCity === 'caerleon' ||
      candidate.purchaseCity === 'brecilien') &&
    (candidate.saleCity === 'martlock' ||
      candidate.saleCity === 'bridgewatch' ||
      candidate.saleCity === 'lymhurst' ||
      candidate.saleCity === 'fort_sterling' ||
      candidate.saleCity === 'thetford' ||
      candidate.saleCity === 'caerleon' ||
      candidate.saleCity === 'brecilien') &&
    (candidate.purchaseStrategy === 'buy-now' ||
      candidate.purchaseStrategy === 'buy-order') &&
    (candidate.saleStrategy === 'sell-order' ||
      candidate.saleStrategy === 'sell-now') &&
    typeof candidate.quality === 'number' &&
    Number.isInteger(candidate.quality) &&
    candidate.quality > 0
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

function isValidSnapshot(value: unknown): value is MarketPriceSnapshot {
  if (!isObject(value)) return false

  const candidate = value as Partial<MarketPriceSnapshot>

  return (
    (candidate.server === 'americas' ||
      candidate.server === 'europe' ||
      candidate.server === 'asia') &&
    typeof candidate.itemIdentifier === 'string' &&
    (candidate.city === 'martlock' ||
      candidate.city === 'bridgewatch' ||
      candidate.city === 'lymhurst' ||
      candidate.city === 'fort_sterling' ||
      candidate.city === 'thetford' ||
      candidate.city === 'caerleon' ||
      candidate.city === 'brecilien') &&
    typeof candidate.quality === 'number' &&
    Number.isInteger(candidate.quality) &&
    candidate.quality > 0 &&
    isNullablePrice(candidate.sellPriceMin) &&
    isNullableDate(candidate.sellPriceMinDate) &&
    isNullablePrice(candidate.buyPriceMax) &&
    isNullableDate(candidate.buyPriceMaxDate) &&
    typeof candidate.fetchedAt === 'string' &&
    Number.isFinite(Date.parse(candidate.fetchedAt))
  )
}

export function loadMarketConfig(): MarketConfig {
  const storage = getLocalStorage()
  if (!storage) return DEFAULT_MARKET_CONFIG

  try {
    const raw = storage.getItem(CONFIG_STORAGE_KEY)
    if (!raw) return DEFAULT_MARKET_CONFIG

    const parsed: unknown = JSON.parse(raw)
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
  const storage = getLocalStorage()
  if (!storage) return

  try {
    const payload: PersistedMarketConfig = {
      version: STORAGE_VERSION,
      config,
    }

    storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // El cálculo sigue funcionando aunque el navegador bloquee storage.
  }
}

export function loadMarketCache(): Map<string, MarketPriceSnapshot> {
  const storage = getLocalStorage()
  const result = new Map<string, MarketPriceSnapshot>()
  if (!storage) return result

  try {
    const raw = storage.getItem(CACHE_STORAGE_KEY)
    if (!raw) return result

    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed)) return result

    const candidate = parsed as Partial<PersistedMarketCache>
    if (
      candidate.version !== STORAGE_VERSION ||
      !Array.isArray(candidate.snapshots)
    ) {
      return result
    }

    const oldestAllowed = Date.now() - MAX_CACHE_AGE_MS

    for (const entry of candidate.snapshots) {
      if (!Array.isArray(entry) || entry.length !== 2) continue

      const [key, snapshot] = entry
      if (typeof key !== 'string' || !isValidSnapshot(snapshot)) continue
      if (Date.parse(snapshot.fetchedAt) < oldestAllowed) continue

      result.set(key, snapshot)
    }
  } catch {
    return new Map()
  }

  return result
}

export function saveMarketCache(
  snapshots: ReadonlyMap<string, MarketPriceSnapshot>,
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

    const payload: PersistedMarketCache = {
      version: STORAGE_VERSION,
      snapshots: recentEntries,
    }

    storage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Una cuota de almacenamiento llena no debe romper el cálculo.
  }
}

export function clearStoredMarketCache(): void {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    storage.removeItem(CACHE_STORAGE_KEY)
  } catch {
    // Sin acción.
  }
}

export function loadManualSellPrices(): Map<string, number> {
  const storage = getLocalStorage()
  const result = new Map<string, number>()
  if (!storage) return result

  try {
    const raw = storage.getItem(SELL_OVERRIDES_STORAGE_KEY)
    if (!raw) return result

    const parsed: unknown = JSON.parse(raw)
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
  const storage = getLocalStorage()
  if (!storage) return

  try {
    const payload: PersistedSellOverrides = {
      version: STORAGE_VERSION,
      prices: Array.from(prices.entries()),
    }

    storage.setItem(SELL_OVERRIDES_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Sin acción.
  }
}
