import {
  asBaseItemId,
  type BaseItemId,
  type ItemCategory,
} from '@core/domain/entities/Item'

export const GUIDED_START_STORAGE_KEY =
  'albion-production-calculator:guided-start:v1'

const LIMITS = { recent: 6, pinned: 8, searches: 5 } as const
const CATEGORIES: readonly ItemCategory[] = [
  'weapon',
  'armor',
  'offhand',
  'accessory',
  'resource',
  'refined_resource',
  'food',
  'potion',
  'other',
]

export interface RecentCatalogSearch {
  readonly query: string
  readonly category: ItemCategory
}

export interface GuidedStartState {
  readonly recentItemIds: readonly BaseItemId[]
  readonly pinnedItemIds: readonly BaseItemId[]
  readonly recentSearches: readonly RecentCatalogSearch[]
}

const EMPTY_STATE: GuidedStartState = {
  recentItemIds: [],
  pinnedItemIds: [],
  recentSearches: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function itemIds(value: unknown, limit: number): BaseItemId[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  )
    .slice(0, limit)
    .map(asBaseItemId)
}

function searches(value: unknown): RecentCatalogSearch[] {
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const result: RecentCatalogSearch[] = []
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const query = typeof entry['query'] === 'string' ? entry['query'].trim() : ''
    const category = entry['category'] as ItemCategory
    const key = `${category}:${query.toLowerCase()}`
    if (query.length < 2 || !CATEGORIES.includes(category) || seen.has(key)) continue
    seen.add(key)
    result.push({ query, category })
    if (result.length === LIMITS.searches) break
  }
  return result
}

export function deserializeGuidedStartState(value: unknown): GuidedStartState {
  if (!isRecord(value) || value['version'] !== 1) return EMPTY_STATE
  return {
    recentItemIds: itemIds(value['recentItemIds'], LIMITS.recent),
    pinnedItemIds: itemIds(value['pinnedItemIds'], LIMITS.pinned),
    recentSearches: searches(value['recentSearches']),
  }
}

export function loadGuidedStartState(): GuidedStartState {
  if (typeof window === 'undefined') return EMPTY_STATE
  try {
    const raw = window.localStorage.getItem(GUIDED_START_STORAGE_KEY)
    return raw ? deserializeGuidedStartState(JSON.parse(raw) as unknown) : EMPTY_STATE
  } catch {
    return EMPTY_STATE
  }
}

function save(state: GuidedStartState): GuidedStartState {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        GUIDED_START_STORAGE_KEY,
        JSON.stringify({ version: 1, ...state }),
      )
    } catch {
      // El inicio continúa operativo aunque el navegador bloquee storage.
    }
  }
  return state
}

function update(
  change: (current: GuidedStartState) => GuidedStartState,
): GuidedStartState {
  return save(change(loadGuidedStartState()))
}

export function recordRecentItem(itemId: BaseItemId): GuidedStartState {
  return update((current) => ({
    ...current,
    recentItemIds: [
      itemId,
      ...current.recentItemIds.filter((candidate) => candidate !== itemId),
    ].slice(0, LIMITS.recent),
  }))
}

export function togglePinnedItem(itemId: BaseItemId): GuidedStartState {
  return update((current) => ({
    ...current,
    pinnedItemIds: current.pinnedItemIds.includes(itemId)
      ? current.pinnedItemIds.filter((candidate) => candidate !== itemId)
      : [itemId, ...current.pinnedItemIds].slice(0, LIMITS.pinned),
  }))
}

export function recordRecentSearch(
  search: RecentCatalogSearch,
): GuidedStartState {
  const query = search.query.trim()
  if (query.length < 2) return loadGuidedStartState()
  const normalized = query.toLowerCase()
  return update((current) => ({
    ...current,
    recentSearches: [
      { query, category: search.category },
      ...current.recentSearches.filter(
        (candidate) =>
          candidate.category !== search.category ||
          candidate.query.toLowerCase() !== normalized,
      ),
    ].slice(0, LIMITS.searches),
  }))
}
