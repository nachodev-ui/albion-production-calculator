import type { Item } from '@core/domain/entities/Item'
import { ItemIcon } from '@shared/components/ItemIcon'
import type { ItemFamily } from '../data/craftingBranches'

interface ItemFamilyRowProps {
  readonly family: ItemFamily
  readonly selectedId: string | null
  readonly onSelect: (item: Item) => void
}

export function ItemFamilyRow({ family, selectedId, onSelect }: ItemFamilyRowProps) {
  const hasSelectedItem = family.items.some((item) => item.id === selectedId)
  const columnCount = Math.min(5, Math.max(1, family.items.length))

  return (
    <div
      className={`rounded-lg border p-2.5 transition-colors ${
        hasSelectedItem
          ? 'border-accent-border bg-accent-muted'
          : 'border-border bg-surface hover:border-border-strong'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised">
          <ItemIcon
            itemId={family.representativeItem.id}
            enchantment={0}
            name={family.name}
            size={30}
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{family.name}</p>
          <p className="text-[11px] text-text-faint">
            {family.items.length === 1
              ? `Disponible en T${family.items[0]?.tier ?? ''}`
              : `${family.items.length} tiers disponibles`}
          </p>
        </div>
      </div>

      <div
        className="mt-2 grid gap-1 pl-[46px]"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {family.items.map((item) => {
          const isSelected = item.id === selectedId

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={isSelected}
              title={item.name}
              className={`min-w-0 rounded-md border px-1.5 py-1.5 font-mono text-[11px] font-medium tabular transition-colors ${
                isSelected
                  ? 'border-accent bg-accent text-bg'
                  : 'border-border bg-surface-raised text-text-muted hover:border-accent-border hover:text-accent'
              }`}
            >
              T{item.tier}
            </button>
          )
        })}
      </div>
    </div>
  )
}
