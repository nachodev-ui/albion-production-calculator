import type { Item } from '@core/domain/entities/Item'
import type { ItemFamily } from '../data/craftingBranches'
import { ItemFamilyRow } from './ItemFamilyRow'

interface ArmorFamilySearchResultsProps {
  readonly families: readonly ItemFamily[]
  readonly ungroupedItems: readonly Item[]
  readonly selectedId: string | null
  readonly onSelect: (item: Item) => void
}

export function ArmorFamilySearchResults({
  families,
  ungroupedItems,
  selectedId,
  onSelect,
}: ArmorFamilySearchResultsProps) {
  if (families.length === 0 && ungroupedItems.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-text-muted">No hay ítems que coincidan con la búsqueda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3">
      {families.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-faint">
            Familias del Destiny Board
          </p>
          <div className="space-y-2">
            {families.map((family) => (
              <ItemFamilyRow
                key={family.id}
                family={family}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}

      {ungroupedItems.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-faint">
            Otros resultados
          </p>
          <div className="space-y-1">
            {ungroupedItems.map((item) => {
              const isSelected = item.id === selectedId

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-accent-border bg-accent-muted text-text'
                      : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text'
                  }`}
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-accent">T{item.tier}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
