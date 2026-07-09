export const BROWSER_STORAGE_NAMESPACE = 'albion-production-calculator.'

export interface StoragePolicy {
  readonly currentKey: string
  readonly legacyKeys?: readonly string[]
  readonly version: number
  readonly maxEntries?: number
  readonly maxAgeMs?: number
}

export function getBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function assertStorageKeyIsNamespaced(key: string): void {
  if (!key.startsWith(BROWSER_STORAGE_NAMESPACE)) {
    throw new Error(`Storage key fuera del namespace permitido: ${key}`)
  }
}

export function assertStoragePolicyIsNamespaced(policy: StoragePolicy): void {
  assertStorageKeyIsNamespaced(policy.currentKey)

  for (const key of policy.legacyKeys ?? []) {
    assertStorageKeyIsNamespaced(key)
  }
}

export function readStorageJson(storage: Storage, key: string): unknown | null {
  assertStorageKeyIsNamespaced(key)

  const raw = storage.getItem(key)
  if (!raw) return null

  return JSON.parse(raw) as unknown
}

export function writeStorageJson(
  storage: Storage,
  key: string,
  value: unknown,
): void {
  assertStorageKeyIsNamespaced(key)
  storage.setItem(key, JSON.stringify(value))
}

export function removeStorageKeys(
  storage: Storage,
  keys: readonly string[],
): void {
  for (const key of keys) {
    assertStorageKeyIsNamespaced(key)
    storage.removeItem(key)
  }
}

export function isFreshTimestamp(value: string, maxAgeMs: number): boolean {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp >= Date.now() - maxAgeMs
}

export function newestEntries<T>(
  entries: readonly (readonly [string, T])[],
  maxEntries: number,
  getTimestamp: (value: T) => string,
): readonly (readonly [string, T])[] {
  return [...entries]
    .sort(
      (left, right) =>
        Date.parse(getTimestamp(right[1])) - Date.parse(getTimestamp(left[1])),
    )
    .slice(0, maxEntries)
}
