import {
  asBaseItemId,
  type BaseItemId,
  type ItemCategory,
} from '@core/domain/entities/Item'

export const GUIDED_START_STORAGE_KEY =
  'albion-production-calculator:guided-start:v1'

const STORAGE_VERSION = 1
const RECENT_ITEM_LIMIT = 6
const PINNED_ITEM_LIMIT = 8
const RECENT_SEARCH_LIMIT = 5

const VALID_CATEGORIES = new Set<ItemCategory>([
  'weapon',
  'armor',
  'offhand',
  'accessory',
  'resource',
  'refined_resource',
  'food',
  'potion',
  'other',
])

export interface RecentCatalogSearch {
  readonly query: string
  readonly category: ItemCategory
}

export interface GuidedStartState {
  readonly recentItemIds: readonly BaseItemId[]
  readonly pinnedItemIds: readonly BaseItemId[]
  readonly recentSearches: readonly RecentCatalogSearch[]
}

interface SerializedGuidedStartState {
  readonly version: number
  readonly recentItemIds: readonly string[]
  readonly pinnedItemIds: readonly string[]
  readonly recentSearches: readonly RecentCatalogSearch[]
}

export const EMPTY_GUIDED_START_STATE: GuidedStartState = {
  recentItemIds: [],
  pinnedItemIds: [],
  recentSearches: [],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeItemIds(value: unknown, limit: number): BaseItemId[] {
  if (!Array.isArray(value)) return []

  const unique = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const normalized = entry.trim()
    if (!normalized || unique.has(normalized)) continue
    unique.add(normalized)
    if (unique.size >= limit) break
  }

  return Array.from(unique, asBaseItemId)
}

function normalizeSearches(value: unknown): RecentCatalogSearch[] {
  if (!Array.isArray(value)) return []

  const searches: RecentCatalogSearch[] = []
  const unique = new Set<string>()

  for (const entry of value) {
    if (!isRecord(entry)) continue

    const query =
      typeof entry['query'] === 'string' ? entry['query'].trim() : ''
    const category = entry['category']
    if (
      query.length < 2 ||
      !VALID_CATEGORIES.has(category as ItemCategory)
    ) {
      continue
    }

    const key = `${category}:${query.toLocaleLowerCase('es')}`
    if (unique.has(key)) continue
    unique.add(key)
    searches.push({ query, category: category as ItemCategory })
    if (searches.length >= RECENT_SEARCH_LIMIT) break
  }

  return searches
}

export function deserializeGuidedStartState(
  value: unknown,
): GuidedStartState {
  if (!isRecord(value) || value['version'] !== STORAGE_VERSION) {
    return EMPTY_GUIDED_START_STATE
  }

  return {
    recentItemIds: normalizeItemIds(
      value['recentItemIds'],
      RECENT_ITEM_LIMIT,
    ),
    pinnedItemIds: normalizeItemIds(
      value['pinnedItemIds'],
      PINNED_ITEM_LIMIT,
    ),
    recentSearches: normalizeSearches(value['recentSearches']),
  }
}

export function serializeGuidedStartState(
  state: GuidedStartState,
): SerializedGuidedStartState {
  return {
    version: STORAGE_VERSION,
    recentItemIds: state.recentItemIds,
    pinnedItemIds: state.pinnedItemIds,
    recentSearches: state.recentSearches,
  }
}

export function loadGuidedStartState(): GuidedStartState {
  if (typeof window === 'undefined') return EMPTY_GUIDED_START_STATE

  try {
    const raw = window.localStorage.getItem(GUIDED_START_STORAGE_KEY)
    return raw
      ? deserializeGuidedStartState(JSON.parse(raw) as unknown)
      : EMPTY_GUIDED_START_STATE
  } catch {
    return EMPTY_GUIDED_START_STATE
  }
}

export function saveGuidedStartState(state: GuidedStartState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      GUIDED_START_STORAGE_KEY,
      JSON.stringify(serializeGuidedStartState(state)),
    )
  } catch {
    // El inicio continúa operativo aunque el navegador bloquee storage.
  }
}

function updateGuidedStartState(
  update: (current: GuidedStartState) => GuidedStartState,
): GuidedStartState {
  const next = update(loadGuidedStartState())
  saveGuidedStartState(next)
  return next
}

export function recordRecentItem(itemId: BaseItemId): GuidedStartState {
  return updateGuidedStartState((current) => ({
    ...current,
    recentItemIds: [
      itemId,
      ...current.recentItemIds.filter((candidate) => candidate !== itemId),
    ].slice(0, RECENT_ITEM_LIMIT),
  }))
}

export function togglePinnedItem(itemId: BaseItemId): GuidedStartState {
  return updateGuidedStartState((current) => {
    const isPinned = current.pinnedItemIds.includes(itemId)
    return {
      ...current,
      pinnedItemIds: isPinned
        ? current.pinnedItemIds.filter((candidate) => candidate !== itemId)
        : [itemId, ...current.pinnedItemIds].slice(0, PINNED_ITEM_LIMIT),
    }
  })
}

export function recordRecentSearch(
  search: RecentCatalogSearch,
): GuidedStartState {
  const query = search.query.trim()
  if (query.length < 2) return loadGuidedStartState()

  const normalizedQuery = query.toLocaleLowerCase('es')
  return updateGuidedStartState((current) => ({
    ...current,
    recentSearches: [
      { query, category: search.category },
      ...current.recentSearches.filter(
        (candidate) =>
          candidate.category !== search.category ||
          candidate.query.toLocaleLowerCase('es') !== normalizedQuery,
      ),
    ].slice(0, RECENT_SEARCH_LIMIT),
  }))
}
