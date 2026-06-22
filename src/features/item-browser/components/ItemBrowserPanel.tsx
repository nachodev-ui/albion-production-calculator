import { useMemo } from 'react'
import type { Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import {
  buildCategoryCraftingCatalog,
  buildCategorySearchFamilies,
  isBranchCategory,
  isGroupedCraftingItem,
} from '../data/craftingBranches'
import { CATEGORY_OPTIONS, useItemSearch } from '../hooks/useItemSearch'
import { CategoryFilter } from './CategoryFilter'
import { CraftingBranchBrowser } from './CraftingBranchBrowser'
import { FamilySearchResults } from './FamilySearchResults'
import { ItemSearchResults } from './ItemSearchResults'

interface ItemBrowserPanelProps {
  readonly repository: ItemRepository
  readonly selectedId: string | null
  readonly onSelect: (item: Item) => void
}

/**
 * Panel izquierdo de la app.
 *
 * Armas, Armaduras, Offhands y Accesorios navegan por ramas/familias.
 * Al escribir, la jerarquía se reemplaza temporalmente por resultados
 * agrupados; recursos y consumibles conservan su listado directo.
 */
export function ItemBrowserPanel({ repository, selectedId, onSelect }: ItemBrowserPanelProps) {
  const { query, setQuery, category, setCategory, results } = useItemSearch(repository)

  function handleCategoryChange(nextCategory: typeof category) {
    setCategory(nextCategory)
    setQuery('')
  }
  const normalizedQuery = query.trim()
  const activeCategory = CATEGORY_OPTIONS.find((option) => option.value === category)
  const hasBranchBrowser = isBranchCategory(category) && activeCategory?.browserMode === 'branches'
  const isBranchMode = hasBranchBrowser && normalizedQuery.length === 0
  const isGroupedSearchMode = hasBranchBrowser && normalizedQuery.length > 0

  const categoryCounts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORY_OPTIONS.map((option) => [
          option.value,
          repository.getAll(option.value).length,
        ]),
      ) as Record<(typeof CATEGORY_OPTIONS)[number]['value'], number>,
    [repository],
  )

  const branchCatalog = useMemo(
    () =>
      isBranchMode && isBranchCategory(category)
        ? buildCategoryCraftingCatalog(category, results)
        : null,
    [category, isBranchMode, results],
  )

  const searchFamilies = useMemo(
    () =>
      isGroupedSearchMode && isBranchCategory(category)
        ? buildCategorySearchFamilies(category, results)
        : [],
    [category, isGroupedSearchMode, results],
  )

  const ungroupedSearchItems = useMemo(
    () =>
      isGroupedSearchMode && isBranchCategory(category)
        ? results.filter((item) => !isGroupedCraftingItem(category, item))
        : [],
    [category, isGroupedSearchMode, results],
  )

  const isSearching = normalizedQuery.length > 0
  const headerLabel = isSearching
    ? 'Resultados de búsqueda'
    : isBranchMode
      ? 'Ramas de crafteo'
      : 'Catálogo de la categoría'

  const headerValue = branchCatalog
    ? `${branchCatalog.branches.length} ramas · ${branchCatalog.itemCount} ítems`
    : `${results.length} ítem${results.length === 1 ? '' : 's'}`

  return (
    <div className="flex h-full flex-col">
      <div className="hidden border-b border-border px-4 py-4 lg:block">
        <p className="text-sm font-semibold text-text">Catálogo de crafteo</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-text-faint">
          Navega por ramas o busca directamente un objeto.
        </p>
      </div>

      <div className="space-y-3 border-b border-border px-3 pb-3 pt-3">
        <label className="block">
          <span className="sr-only">Buscar ítem</span>
          <span className="relative block">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar ítem…"
              className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-text outline-none transition-shadow placeholder:text-text-faint focus-visible:border-accent-border focus-visible:ring-2 focus-visible:ring-accent-border"
            />
          </span>
        </label>

        <CategoryFilter
          value={category}
          counts={categoryCounts}
          onChange={handleCategoryChange}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-faint">
            {headerLabel}
          </p>
          <p className="text-right text-xs tabular text-text-muted">{headerValue}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {branchCatalog ? (
          <CraftingBranchBrowser
            key={branchCatalog.category}
            catalog={branchCatalog}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : isGroupedSearchMode ? (
          <FamilySearchResults
            families={searchFamilies}
            ungroupedItems={ungroupedSearchItems}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : (
          <ItemSearchResults items={results} selectedId={selectedId} onSelect={onSelect} />
        )}
      </div>
    </div>
  )
}
