import { useState, type ReactNode } from 'react'
import {
  BlackMarketIcon,
  ChartIcon,
  HammerIcon,
  RefiningIcon,
} from '../../../app/AppIcons'
import { asBaseItemId, type Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { ItemIcon } from '@shared/components/ItemIcon'
import {
  loadGuidedStartState,
  togglePinnedItem,
  type RecentCatalogSearch,
} from '@features/onboarding/storage/guidedStartStorage'

export type GuidedCraftingExample = 'basic' | 'return'

interface EmptyDetailStateProps {
  readonly repository: ItemRepository
  readonly lastCalculationItem: Item | null
  readonly onBrowseCatalog: () => void
  readonly onOpenItem: (item: Item) => void
  readonly onRunCraftingExample: (item: Item, example: GuidedCraftingExample) => void
  readonly onRunBlackMarketExample: (item: Item) => void
  readonly onOpenBlackMarket: () => void
  readonly onCompareCities: () => void
  readonly onOpenRefining: () => void
  readonly onRestoreLastCalculation: () => void
  readonly onOpenRecentSearch: (search: RecentCatalogSearch) => void
}

interface Example {
  readonly item: Item
  readonly title: string
  readonly detail: string
  readonly run: () => void
}

const CONCEPTS = [
  ['ROI', 'Porcentaje ganado o perdido respecto de la plata invertida.'],
  ['Retorno de crafteo', 'Materiales que vuelven al fabricar y reducen el costo real.'],
  ['Tax del Black Market', 'Impuesto restado de la orden antes de calcular la ganancia.'],
] as const

function findItem(
  repository: ItemRepository,
  identifiers: readonly string[],
  category: Item['category'],
): Item | null {
  for (const identifier of identifiers) {
    const item = repository.getById(asBaseItemId(identifier))
    if (item) return item
  }
  return repository.getAll(category).find((item) => item.tier === 4 && item.recipe) ?? null
}

function isItem(item: Item | null): item is Item {
  return item !== null
}

function ActionCard({
  icon,
  title,
  text,
  onClick,
}: {
  readonly icon: ReactNode
  readonly title: string
  readonly text: string
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-surface p-4 text-left hover:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
    >
      <span className="text-accent">{icon}</span>
      <strong className="mt-3 block text-sm text-text">{title}</strong>
      <span className="mt-1 block text-xs leading-relaxed text-text-faint">{text}</span>
    </button>
  )
}

function StarButton({
  item,
  active,
  onToggle,
}: {
  readonly item: Item
  readonly active: boolean
  readonly onToggle: (item: Item) => void
}) {
  return (
    <button
      type="button"
      aria-label={active ? `Quitar ${item.name} de fijados` : `Fijar ${item.name}`}
      aria-pressed={active}
      onClick={(event) => {
        event.stopPropagation()
        onToggle(item)
      }}
      className="shrink-0 rounded-lg border border-border px-2 py-1 text-text-faint hover:text-accent"
    >
      {active ? '★' : '☆'}
    </button>
  )
}

function ItemList({
  title,
  items,
  empty,
  pinnedIds,
  onOpen,
  onToggle,
}: {
  readonly title: string
  readonly items: readonly Item[]
  readonly empty: string
  readonly pinnedIds: ReadonlySet<string>
  readonly onOpen: (item: Item) => void
  readonly onToggle: (item: Item) => void
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-text-faint">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised p-2">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ItemIcon itemId={item.id} enchantment={0} name={item.name} size={38} />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-text">{item.name}</span>
                  <span className="text-[10px] text-text-faint">Tier {item.tier}</span>
                </span>
              </button>
              <StarButton item={item} active={pinnedIds.has(item.id)} onToggle={onToggle} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ExampleCard({
  example,
  pinned,
  onToggle,
}: {
  readonly example: Example
  readonly pinned: boolean
  readonly onToggle: (item: Item) => void
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <ItemIcon itemId={example.item.id} enchantment={0} name={example.item.name} size={58} />
        <StarButton item={example.item} active={pinned} onToggle={onToggle} />
      </div>
      <h3 className="mt-3 font-display text-lg text-text">{example.title}</h3>
      <p className="mt-1 flex-1 text-xs text-text-faint">{example.detail}</p>
      <button
        type="button"
        onClick={example.run}
        className="mt-4 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg"
      >
        Ejecutar ejemplo
      </button>
    </article>
  )
}

export function EmptyDetailState({
  repository,
  lastCalculationItem,
  onBrowseCatalog,
  onOpenItem,
  onRunCraftingExample,
  onRunBlackMarketExample,
  onOpenBlackMarket,
  onCompareCities,
  onOpenRefining,
  onRestoreLastCalculation,
  onOpenRecentSearch,
}: EmptyDetailStateProps) {
  const [guidedState, setGuidedState] = useState(loadGuidedStartState)
  const bag = findItem(repository, ['T4_BAG', 'T5_BAG'], 'accessory')
  const weapon = findItem(repository, ['T4_MAIN_SWORD', 'T4_MAIN_AXE'], 'weapon')
  const marketItem = findItem(
    repository,
    ['T4_HEAD_CLOTH_SET1', 'T4_ARMOR_LEATHER_SET1'],
    'armor',
  )
  const examples: Example[] = []

  if (bag) {
    examples.push({
      item: bag,
      title: 'Calcular una bolsa',
      detail: 'T4 · 1 unidad · sin foco.',
      run: () => onRunCraftingExample(bag, 'basic'),
    })
  }
  if (weapon) {
    examples.push({
      item: weapon,
      title: 'Fabricar un arma con retorno',
      detail: 'T4 · 10 unidades · foco activo.',
      run: () => onRunCraftingExample(weapon, 'return'),
    })
  }
  if (marketItem) {
    examples.push({
      item: marketItem,
      title: 'Comparar un objeto con Caerleon',
      detail: 'T4 · normal · tax 4% · transporte cero.',
      run: () => onRunBlackMarketExample(marketItem),
    })
  }

  const recentItems = guidedState.recentItemIds
    .map((id) => repository.getById(id))
    .filter(isItem)
  const pinnedItems = guidedState.pinnedItemIds
    .map((id) => repository.getById(id))
    .filter(isItem)
  const pinnedIds = new Set<string>(guidedState.pinnedItemIds)

  function togglePinned(item: Item) {
    setGuidedState(togglePinnedItem(item.id))
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-5 pb-14 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Inicio guiado</p>
            <h2 className="mt-2 font-display text-3xl text-text">¿Qué quieres hacer?</h2>
            <p className="mt-2 text-sm text-text-muted">Elige una intención o abre un ejemplo precargado.</p>
          </div>
          {lastCalculationItem && (
            <button
              type="button"
              onClick={onRestoreLastCalculation}
              className="flex items-center gap-2 rounded-xl border border-accent-border bg-accent-muted px-4 py-3 text-left"
            >
              <ItemIcon itemId={lastCalculationItem.id} enchantment={0} name={lastCalculationItem.name} size={36} />
              <span>
                <span className="block text-[10px] uppercase text-text-faint">Restaurar cálculo</span>
                <span className="block max-w-48 truncate text-sm font-semibold text-text">{lastCalculationItem.name}</span>
              </span>
            </button>
          )}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard icon={<HammerIcon className="h-5 w-5" />} title="Fabricar un objeto" text="Calcula costos y ganancia." onClick={onBrowseCatalog} />
          <ActionCard icon={<RefiningIcon className="h-5 w-5" />} title="Refinar recursos" text="Convierte recursos en refinados." onClick={onOpenRefining} />
          <ActionCard icon={<BlackMarketIcon className="h-5 w-5" />} title="Vender al Black Market" text="Compara un objeto con Caerleon." onClick={onOpenBlackMarket} />
          <ActionCard icon={<ChartIcon className="h-5 w-5" />} title="Comparar ciudades" text="Ordena oportunidades y ROI." onClick={onCompareCities} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Ejemplos interactivos</p>
        <h2 className="mt-1 font-display text-2xl text-text">Prueba un cálculo</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {examples.map((example) => (
            <ExampleCard
              key={example.title}
              example={example}
              pinned={pinnedIds.has(example.item.id)}
              onToggle={togglePinned}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <ItemList title="Últimos objetos" items={recentItems} empty="Abre un ejemplo o el catálogo." pinnedIds={pinnedIds} onOpen={onOpenItem} onToggle={togglePinned} />
            <ItemList title="Objetos fijados" items={pinnedItems} empty="Fija un ejemplo u objeto reciente." pinnedIds={pinnedIds} onOpen={onOpenItem} onToggle={togglePinned} />
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex justify-between gap-3">
              <h3 className="text-sm font-semibold text-text">Búsquedas recientes</h3>
              <button type="button" onClick={onBrowseCatalog} className="text-xs font-semibold text-accent">Nueva</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {guidedState.recentSearches.length === 0 ? (
                <span className="text-xs text-text-faint">Aún no hay búsquedas.</span>
              ) : (
                guidedState.recentSearches.map((search) => (
                  <button
                    key={`${search.category}:${search.query.toLowerCase()}`}
                    type="button"
                    onClick={() => onOpenRecentSearch(search)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-text-muted"
                  >
                    {search.query}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Configuraciones recomendadas</p>
          <ul className="mt-4 space-y-2 text-xs leading-relaxed text-text-faint">
            <li><strong className="text-text">Básico:</strong> T4, 1 unidad, sin foco.</li>
            <li><strong className="text-text">Retorno:</strong> T4, 10 unidades, con foco.</li>
            <li><strong className="text-text">Black Market:</strong> normal, tax 4%, transporte cero.</li>
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Conceptos básicos</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {CONCEPTS.map(([term, explanation]) => (
            <article key={term} className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold text-text">{term}</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-faint">{explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
