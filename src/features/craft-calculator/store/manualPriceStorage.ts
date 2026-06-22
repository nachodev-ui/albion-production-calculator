import type { NodePath } from '@core/usecases/calculateCraftCost'

const STORAGE_KEY = 'albion-craft-calculator.manual-prices.v1'
const STORAGE_VERSION = 1

export type ManualPricesByRoot = ReadonlyMap<
  string,
  ReadonlyMap<NodePath, number>
>

interface PersistedRootPrices {
  readonly rootKey: string
  readonly prices: readonly (readonly [NodePath, number])[]
}

interface PersistedManualPrices {
  readonly version: number
  readonly roots: readonly PersistedRootPrices[]
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Convierte el caché de Maps a una estructura JSON versionada.
 * Los precios con valor 0 se conservan porque representan una entrada
 * confirmada por el usuario, no un precio faltante.
 */
export function serializeManualPrices(
  pricesByRoot: ManualPricesByRoot,
): PersistedManualPrices {
  const roots: PersistedRootPrices[] = []

  for (const [rootKey, prices] of pricesByRoot) {
    if (prices.size === 0) continue

    roots.push({
      rootKey,
      prices: Array.from(prices.entries()),
    })
  }

  return {
    version: STORAGE_VERSION,
    roots,
  }
}

/**
 * Valida los datos leídos desde localStorage antes de incorporarlos al
 * estado. Las entradas corruptas o incompatibles simplemente se ignoran.
 */
export function deserializeManualPrices(
  value: unknown,
): Map<string, Map<NodePath, number>> {
  const result = new Map<string, Map<NodePath, number>>()

  if (!value || typeof value !== 'object') return result

  const candidate = value as Partial<PersistedManualPrices>

  if (candidate.version !== STORAGE_VERSION || !Array.isArray(candidate.roots)) {
    return result
  }

  for (const root of candidate.roots) {
    if (!root || typeof root !== 'object') continue

    const rootCandidate = root as Partial<PersistedRootPrices>

    if (
      typeof rootCandidate.rootKey !== 'string' ||
      !Array.isArray(rootCandidate.prices)
    ) {
      continue
    }

    const prices = new Map<NodePath, number>()

    for (const entry of rootCandidate.prices) {
      if (!Array.isArray(entry) || entry.length !== 2) continue

      const [path, price] = entry

      if (typeof path !== 'string' || !isValidPrice(price)) continue

      prices.set(path, price)
    }

    if (prices.size > 0) {
      result.set(rootCandidate.rootKey, prices)
    }
  }

  return result
}

export function loadManualPrices(): Map<string, Map<NodePath, number>> {
  const storage = getLocalStorage()
  if (!storage) return new Map()

  try {
    const rawValue = storage.getItem(STORAGE_KEY)
    if (!rawValue) return new Map()

    return deserializeManualPrices(JSON.parse(rawValue) as unknown)
  } catch {
    return new Map()
  }
}

export function saveManualPrices(pricesByRoot: ManualPricesByRoot): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    const payload = serializeManualPrices(pricesByRoot)

    if (payload.roots.length === 0) {
      storage.removeItem(STORAGE_KEY)
    } else {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload))
    }

    return true
  } catch {
    // localStorage puede estar deshabilitado, lleno o bloqueado por el navegador.
    return false
  }
}

export function countSavedManualPrices(
  pricesByRoot: ManualPricesByRoot,
): number {
  let count = 0

  for (const prices of pricesByRoot.values()) {
    count += prices.size
  }

  return count
}
