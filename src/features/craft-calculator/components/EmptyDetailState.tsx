import { useState } from 'react'
import { asBaseItemId, type Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import {
  loadBlackMarketScannerFilters,
  saveBlackMarketScannerFilters,
} from '@features/black-market/storage/blackMarketScannerStorage'
import {
  loadGuidedStartState,
  togglePinnedItem,
  type RecentCatalogSearch,
} from '@features/onboarding/storage/guidedStartStorage'
import { startGuidedTutorial } from '@features/onboarding/tutorials/guidedTutorial'
import { ItemIcon } from '@shared/components/ItemIcon'

export type GuidedCraftingExample = 'basic' | 'return'

interface EmptyDetailStateProps {
  readonly repository: ItemRepository
  readonly lastCalculationItem: Item | null
  readonly onBrowseCatalog: () => void
  readonly onOpenItem: (item: Item) => void
  readonly onRunCraftingExample: (
    item: Item,
    example: GuidedCraftingExample,
  ) => void
  readonly onRunBlackMarketExample: (item: Item) => void
  readonly onOpenBlackMarket: () => void
  readonly onCompareCities: () => void
  readonly onOpenRefining: () => void
  readonly onRestoreLastCalculation: () => void
  readonly onOpenRecentSearch: (search: RecentCatalogSearch) => void
}

interface TutorialCardProps {
  readonly item: Item
  readonly title: string
  readonly description: string
  readonly steps: string
  readonly pinned: boolean
  readonly onStart: () => void
  readonly onTogglePinned: (item: Item) => void
}

function findItem(
  repository: ItemRepository,
  identifiers: readonly string[],
  category: Item['category'],
): Item | null {
  for (const identifier of identifiers) {
    const item = repository.getById(asBaseItemId(identifier))
    if (item) return item
  }
  return (
    repository
      .getAll(category)
      .find((item) => item.tier === 4 && item.recipe) ?? null
  )
}

function isItem(item: Item | null): item is Item {
  return item !== null
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

function TutorialCard({
  item,
  title,
  description,
  steps,
  pinned,
  onStart,
  onTogglePinned,
}: TutorialCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <ItemIcon itemId={item.id} enchantment={0} name={item.name} size={58} />
        <StarButton item={item} active={pinned} onToggle={onTogglePinned} />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
        Tutorial interactivo
      </p>
      <h3 className="mt-1 font-display text-lg text-text">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">{description}</p>
      <p className="mt-3 flex-1 rounded-lg bg-surface-raised px-3 py-2 text-[11px] leading-relaxed text-text-faint">
        {steps}
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-bg"
      >
        Comenzar tutorial
      </button>
    </article>
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
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-text-faint">
            {empty}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised p-2"
            >
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ItemIcon
                  itemId={item.id}
                  enchantment={0}
                  name={item.name}
                  size={38}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-text">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-text-faint">
                    Tier {item.tier}
                  </span>
                </span>
              </button>
              <StarButton
                item={item}
                active={pinnedIds.has(item.id)}
                onToggle={onToggle}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function EmptyDetailState({
  repository,
  lastCalculationItem,
  onBrowseCatalog,
  onOpenItem,
  onRunCraftingExample,
  onCompareCities,
  onOpenRefining,
  onRestoreLastCalculation,
  onOpenRecentSearch,
}: EmptyDetailStateProps) {
  const [guidedState, setGuidedState] = useState(loadGuidedStartState)
  const bag = findItem(repository, ['T4_BAG', 'T5_BAG'], 'accessory')
  const weapon = findItem(
    repository,
    ['T4_MAIN_SWORD', 'T4_MAIN_AXE'],
    'weapon',
  )
  const marketItem = findItem(
    repository,
    ['T4_HEAD_CLOTH_SET1', 'T4_ARMOR_LEATHER_SET1'],
    'armor',
  )
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

  function beginCraftTutorial(
    item: Item,
    tutorial: 'bag' | 'return',
    example: GuidedCraftingExample,
  ) {
    onRunCraftingExample(item, example)
    startGuidedTutorial(tutorial, item)
  }

  function beginBlackMarketTutorial(item: Item) {
    const filters = loadBlackMarketScannerFilters()
    saveBlackMarketScannerFilters({
      ...filters,
      tiers: [4],
      enchantments: [0],
      qualities: [1],
      categories: ['armor'],
      minimumProfit: 0,
      minimumReturnOnCostPercent: 0,
      maximumCityAgeMinutes: 10_080,
      maximumBlackMarketAgeMinutes: 10_080,
      salesTaxPercent: 4,
      transportCostPerUnit: 0,
      strategyFilter: 'all',
      strategySort: 'best-profit',
      sort: 'profit',
      limit: 25,
    })
    onCompareCities()
    startGuidedTutorial('black-market', item)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-5 pb-14 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Inicio para nuevos usuarios
            </p>
            <h2 className="mt-2 font-display text-3xl text-text">
              ¿Qué quieres aprender a hacer?
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
              Puedes abrir una herramienta directamente o seguir un tutorial que
              resaltará cada control, te dirá dónde presionar y avanzará cuando
              completes la acción indicada.
            </p>
          </div>
          {lastCalculationItem && (
            <button
              type="button"
              onClick={onRestoreLastCalculation}
              className="flex items-center gap-2 rounded-xl border border-accent-border bg-accent-muted px-4 py-3 text-left"
            >
              <ItemIcon
                itemId={lastCalculationItem.id}
                enchantment={0}
                name={lastCalculationItem.name}
                size={36}
              />
              <span>
                <span className="block text-[10px] uppercase text-text-faint">
                  Restaurar último cálculo
                </span>
                <span className="block max-w-48 truncate text-sm font-semibold text-text">
                  {lastCalculationItem.name}
                </span>
              </span>
            </button>
          )}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Fabricar un objeto', 'Abre el catálogo de recetas.', onBrowseCatalog],
            ['Refinar recursos', 'Conoce el módulo de refinamiento.', onOpenRefining],
            ['Vender al Black Market', 'Busca órdenes reales de Caerleon.', onCompareCities],
            ['Comparar ciudades', 'Ordena oportunidades por beneficio y ROI.', onCompareCities],
          ].map(([title, description, action]) => (
            <button
              key={String(title)}
              type="button"
              onClick={action as () => void}
              className="rounded-xl border border-border bg-surface-raised p-4 text-left hover:border-accent-border"
            >
              <strong className="block text-sm text-text">{String(title)}</strong>
              <span className="mt-1 block text-xs text-text-faint">
                {String(description)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-accent-border/60 bg-surface-raised p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
          Tutoriales guiados
        </p>
        <h2 className="mt-1 font-display text-2xl text-text">
          Aprende usando la interfaz real
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
          No son demostraciones pasivas: tendrás que usar uno o dos controles
          resaltados y el tutorial te llevará después al resultado que debes leer.
        </p>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {bag && (
            <TutorialCard
              item={bag}
              title="Calcular una bolsa"
              description="Aprende a cambiar el tamaño del lote, elegir una ciudad de venta y encontrar el ROI."
              steps="5 pasos · cantidad → ciudad de venta → materiales → rentabilidad"
              pinned={pinnedIds.has(bag.id)}
              onStart={() => beginCraftTutorial(bag, 'bag', 'basic')}
              onTogglePinned={togglePinned}
            />
          )}
          {weapon && (
            <TutorialCard
              item={weapon}
              title="Fabricar un arma con retorno"
              description="Activa el foco tú mismo y aprende por qué los materiales devueltos reducen el costo real."
              steps="5 pasos · cantidad → foco → ahorro por RRR → ROI económico"
              pinned={pinnedIds.has(weapon.id)}
              onStart={() => beginCraftTutorial(weapon, 'return', 'return')}
              onTogglePinned={togglePinned}
            />
          )}
          {marketItem && (
            <TutorialCard
              item={marketItem}
              title="Comparar un objeto con el Black Market"
              description="Ejecuta un escaneo real, abre una oportunidad y aprende a revisar beneficio, tax, datos y riesgo."
              steps="4 pasos · escanear → abrir resultado → leer detalle económico"
              pinned={pinnedIds.has(marketItem.id)}
              onStart={() => beginBlackMarketTutorial(marketItem)}
              onTogglePinned={togglePinned}
            />
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <ItemList
              title="Últimos objetos"
              items={recentItems}
              empty="Abre un tutorial o selecciona un objeto del catálogo."
              pinnedIds={pinnedIds}
              onOpen={onOpenItem}
              onToggle={togglePinned}
            />
            <ItemList
              title="Objetos fijados"
              items={pinnedItems}
              empty="Usa la estrella para guardar accesos frecuentes."
              pinnedIds={pinnedIds}
              onOpen={onOpenItem}
              onToggle={togglePinned}
            />
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex justify-between gap-3">
              <h3 className="text-sm font-semibold text-text">
                Búsquedas recientes
              </h3>
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="text-xs font-semibold text-accent"
              >
                Nueva búsqueda
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {guidedState.recentSearches.length === 0 ? (
                <span className="text-xs text-text-faint">
                  Aún no hay búsquedas guardadas.
                </span>
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

        <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Configuraciones recomendadas
          </p>
          <ul className="mt-4 space-y-3 text-xs leading-relaxed text-text-muted">
            <li>
              <strong className="text-text">Primera receta:</strong> Tier 4,
              una unidad y precios automáticos.
            </li>
            <li>
              <strong className="text-text">Aprender retorno:</strong> compara
              el mismo lote con foco apagado y encendido.
            </li>
            <li>
              <strong className="text-text">Black Market:</strong> comienza con
              calidad normal y revisa siempre la antigüedad de la orden.
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
