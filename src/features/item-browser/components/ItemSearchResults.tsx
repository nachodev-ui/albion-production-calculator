import type { Item } from '@core/domain/entities/Item'
import { ItemIcon } from '@shared/components/ItemIcon'
import { TierBadge } from '@shared/components/TierBadge'
import { CATEGORY_ACCENT } from '@shared/theme/tokens'
import { CATEGORY_OPTIONS } from '../hooks/useItemSearch'

const CATEGORY_LABEL = new Map(CATEGORY_OPTIONS.map((option) => [option.value, option.label]))

interface ItemSearchResultsProps {
  readonly items: readonly Item[]
  readonly selectedId: string | null
  readonly onSelect: (item: Item) => void
}

/**
 * Lista de resultados del buscador, estilo "registro de gremio": una
 * fila por ítem con ícono real, sello de tier, y un borde izquierdo
 * sutil coloreado por categoría — permite reconocer de un vistazo
 * "esto es un arma" / "esto es comida" sin leer texto.
 */
export function ItemSearchResults({ items, selectedId, onSelect }: ItemSearchResultsProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-text-muted text-sm">No hay ítems que coincidan con la búsqueda.</p>
      </div>
    )
  }

  return (
    <ul className="p-2 space-y-1">
      {items.map((item) => {
        const isSelected = item.id === selectedId
        const accent = CATEGORY_ACCENT[item.category] ?? CATEGORY_ACCENT['other']

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={isSelected}
              style={{ borderLeftColor: accent }}
              className={`group relative w-full flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pl-3 pr-2.5 text-left transition-all ${
                isSelected
                  ? 'bg-accent-muted ring-1 ring-inset ring-accent-border'
                  : 'hover:bg-surface-raised'
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-surface transition-colors ${
                  isSelected ? 'border-accent-border' : 'border-border group-hover:border-border'
                }`}
              >
                <ItemIcon itemId={item.id} enchantment={0} name={item.name} size={32} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm truncate transition-colors ${
                    isSelected ? 'text-text font-medium' : 'text-text group-hover:text-text'
                  }`}
                >
                  {item.name}
                </span>
                <span className="block text-xs text-text-faint">
                  {CATEGORY_LABEL.get(item.category) ?? item.category}
                </span>
              </span>
              <TierBadge tier={item.tier} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}