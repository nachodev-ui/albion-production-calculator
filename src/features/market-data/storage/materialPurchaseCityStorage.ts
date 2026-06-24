import type {
  MarketCityId,
  MaterialPurchaseCitiesByRoot,
} from '../types/MarketPrice'

const STORAGE_KEY =
  'albion-production-calculator.material-purchase-cities.v1'
const STORAGE_VERSION = 1

interface PersistedRootCities {
  readonly rootKey: string
  readonly cities: readonly (readonly [string, MarketCityId])[]
}

interface PersistedMaterialPurchaseCities {
  readonly version: number
  readonly roots: readonly PersistedRootCities[]
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

function isMarketCityId(value: unknown): value is MarketCityId {
  return typeof value === 'string' && value.trim().length > 0
}

export function serializeMaterialPurchaseCities(
  source: MaterialPurchaseCitiesByRoot,
): PersistedMaterialPurchaseCities {
  return {
    version: STORAGE_VERSION,
    roots: Array.from(source.entries()).map(([rootKey, cities]) => ({
      rootKey,
      cities: Array.from(cities.entries()),
    })),
  }
}

export function deserializeMaterialPurchaseCities(
  value: unknown,
): Map<string, ReadonlyMap<string, MarketCityId>> {
  const result = new Map<string, ReadonlyMap<string, MarketCityId>>()
  if (!isObject(value)) return result

  const candidate = value as Partial<PersistedMaterialPurchaseCities>
  if (candidate.version !== STORAGE_VERSION || !Array.isArray(candidate.roots)) {
    return result
  }

  for (const rootCandidate of candidate.roots) {
    if (!isObject(rootCandidate)) continue

    const root = rootCandidate as Partial<PersistedRootCities>
    if (typeof root.rootKey !== 'string' || !Array.isArray(root.cities)) {
      continue
    }

    const cities = new Map<string, MarketCityId>()

    for (const entry of root.cities) {
      if (!Array.isArray(entry) || entry.length !== 2) continue

      const [itemPriceKey, city] = entry
      if (typeof itemPriceKey !== 'string' || !isMarketCityId(city)) continue

      cities.set(itemPriceKey, city)
    }

    if (cities.size > 0) {
      result.set(root.rootKey, cities)
    }
  }

  return result
}

export function loadMaterialPurchaseCities(): Map<
  string,
  ReadonlyMap<string, MarketCityId>
> {
  const storage = getLocalStorage()
  if (!storage) return new Map()

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return new Map()

    return deserializeMaterialPurchaseCities(JSON.parse(raw) as unknown)
  } catch {
    return new Map()
  }
}

export function saveMaterialPurchaseCities(
  source: MaterialPurchaseCitiesByRoot,
): void {
  const storage = getLocalStorage()
  if (!storage) return

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(serializeMaterialPurchaseCities(source)),
    )
  } catch {
    // La selección sigue funcionando durante la sesión si storage falla.
  }
}
