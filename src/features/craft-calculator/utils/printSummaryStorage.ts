import type { CalculationSummarySnapshot } from './calculationSummary'

const STORAGE_PREFIX = 'albion-craft-calculator:print-summary:v1:'
const MAX_AGE_MS = 60 * 60 * 1000

interface StoredPrintSummary {
  readonly version: 1
  readonly createdAt: number
  readonly snapshot: CalculationSummarySnapshot
}

function createToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getStorageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStoredPrintSummary(value: unknown): value is StoredPrintSummary {
  if (!isRecord(value) || value['version'] !== 1) return false
  if (typeof value['createdAt'] !== 'number') return false
  if (!isRecord(value['snapshot'])) return false

  const snapshot = value['snapshot']

  return (
    typeof snapshot['generatedAt'] === 'string' &&
    typeof snapshot['itemName'] === 'string' &&
    typeof snapshot['tier'] === 'number' &&
    typeof snapshot['enchantment'] === 'number' &&
    typeof snapshot['quantity'] === 'number' &&
    typeof snapshot['cityName'] === 'string' &&
    typeof snapshot['totalCost'] === 'number' &&
    typeof snapshot['silverSaved'] === 'number' &&
    typeof snapshot['stationFees'] === 'number' &&
    typeof snapshot['isComplete'] === 'boolean' &&
    Array.isArray(snapshot['missingPrices']) &&
    Array.isArray(snapshot['returnedMaterials']) &&
    typeof snapshot['isPremium'] === 'boolean'
  )
}

function removeExpiredEntries(): void {
  const now = Date.now()

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(STORAGE_PREFIX)) continue

    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue

      const parsed: unknown = JSON.parse(raw)
      if (!isStoredPrintSummary(parsed) || now - parsed.createdAt > MAX_AGE_MS) {
        localStorage.removeItem(key)
      }
    } catch {
      localStorage.removeItem(key)
    }
  }
}

export function saveCalculationPrintSummary(
  snapshot: CalculationSummarySnapshot,
): string {
  removeExpiredEntries()

  const token = createToken()
  const payload: StoredPrintSummary = {
    version: 1,
    createdAt: Date.now(),
    snapshot,
  }

  localStorage.setItem(getStorageKey(token), JSON.stringify(payload))
  return token
}

export function loadCalculationPrintSummary(
  token: string,
): CalculationSummarySnapshot | null {
  removeExpiredEntries()

  try {
    const raw = localStorage.getItem(getStorageKey(token))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isStoredPrintSummary(parsed)) return null

    return parsed.snapshot
  } catch {
    return null
  }
}
