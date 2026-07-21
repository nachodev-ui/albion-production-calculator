import { useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowRightIcon,
  BlackMarketIcon,
  ChartIcon,
  HammerIcon,
  RefiningIcon,
} from '../../../app/AppIcons'
import {
  asBaseItemId,
  type BaseItemId,
  type Item,
  type ItemCategory,
} from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { ItemIcon } from '@shared/components/ItemIcon'
import {
  loadGuidedStartState,
  togglePinnedItem,
  type RecentCatalogSearch,
} from '@features/onboarding/storage/guidedStartStorage'

export type GuidedCraftingExample = 'basic' | 'return'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

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

interface ExampleDefinition {
  readonly item: Item
  readonly title: string
  readonly detail: string
  readonly run: () => void
}

const CATEGORY_LABELS: Readonly<Record<ItemCategory, string>> = {
  weapon: 'Armas',
  armor: 'Armaduras',
  offhand: 'Offhands',
  accessory: 'Accesorios',
  resource: 'Recursos',
  refined_resource: 'Refinados',
  food: 'Comida',
  potion: 'Pociones',
  other: 'Otros',
}

const BASIC_CONCEPTS = [
  ['ROI', 'Ganancia o pérdida frente a lo invertido. Un ROI de 20% equivale a 20 de ganancia por cada 100 de plata gastada.'],
  ['Retorno de crafteo', 'Materiales que el juego devuelve al fabricar. Ciudad, foco y bonos cambian el porcentaje y reducen el costo real.'],
  ['Tax del Black Market', 'Impuesto descontado de la orden de compra antes de calcular la ganancia y otros costos, como transporte.'],
] as const

function isItem(value: Item | null): value is Item {
  return value !== null
}

function isExample(value: ExampleDefinition | null): value is ExampleDefinition {
  return value !== null
}

function resolvePreferredItem(
  repository: ItemRepository,
  identifiers: readonly string[],
  category: ItemCategory,
): Item | null {
  for (const identifier of identifiers) {
    const item = repository.getById(asBaseItemId(identifier))
    if (item) return item
  }
  return repository.getAll(category).find((item) => item.tier === 4 && item.recipe) ?? null
}

function IntentCard({
  title,
  description,
  icon: Icon,
  onClick,
}: {
  readonly title: string
  readonly description: string
  readonly icon: IconComponent
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-40 flex-col rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent-border hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg/45 text-accent group-hover:border-accent-border group-hover:bg-accent-muted">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-4 text-base font-semibold text-text">{title}</span>
      <span className="mt-1 flex-1 text-xs leading-relaxed text-text-faint">{description}</span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
        Abrir <ArrowRightIcon className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}

function PinButton({
  item,
  isPinned,
  onToggle,
}: {
  readonly item: Item
  readonly isPinned: boolean
  readonly onToggle: (item: Item) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isPinned}
      aria-label={isPinned ? `Quitar ${item.name} de fijados` : `Fijar ${item.name}`}
      onClick={(event) => {
        event.stopPropagation()
        onToggle(item)
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg/35 text-sm text-text-faint hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
    >
      {isPinned ? '★' : '☆'}
    </button>
  )
}

function ItemShortcut({
  item,
  isPinned,
  onOpen,
  onTogglePinned,
}: {
  readonly item: Item
  readonly isPinned: boolean
  readonly onOpen: (item: Item) => void
  readonly onTogglePinned: (item: Item) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised p-2">
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        <ItemIcon itemId={item.id} enchantment={0} name={item.name} size={42} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-text">{item.name}</span>
          <span className="text-[10px] text-text-faint">T{item.tier} · {CATEGORY_LABELS[item.category]}</span>
        </span>
      </button>
      <PinButton item={item} isPinned={isPinned} onToggle={onTogglePinned} />
    </div>
  )
}

function SavedItemsPanel({
  title,
  emptyText,
  items,
  pinnedIds,
  onOpen,
  onTogglePinned,
}: {
  readonly title: string
  readonly emptyText: string
  readonly items: readonly Item[]
  readonly pinnedIds: ReadonlySet<BaseItemId>
  readonly onOpen: (item: Item) => void
  readonly onTogglePinned: (item: Item) => void
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item) => (
            <ItemShortcut
              key={item.id}
              item={item}
              isPinned={pinnedIds.has(item.id)}
              onOpen={onOpen}
              onTogglePinned={onTogglePinned}
            />
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-text-faint">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

function ExampleCard({
  example,
  isPinned,
  onTogglePinned,
}: {
  readonly example: ExampleDefinition
  readonly isPinned: boolean
  readonly onTogglePinned: (item: Item) => void
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <ItemIcon itemId={example.item.id} enchantment={0} name={example.item.name} size={64} className="rounded-xl" />
        <PinButton item={example.item} isPinned={isPinned} onToggle={onTogglePinned} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Ejemplo interactivo</p>
      <h3 className="mt-1 font-display text-xl text-text">{example.title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-text-faint">{example.detail}</p>
      <button
        type="button"
        onClick={example.run}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        Ejecutar ejemplo <ArrowRightIcon className="h-4 w-4" />
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

  const examples = useMemo(
    () => ({
      bag: resolvePreferredItem(repository, ['T4_BAG', 'T5_BAG'], 'accessory'),
      weapon: resolvePreferredItem(repository, ['T4_MAIN_SWORD', 'T4_MAIN_AXE'], 'weapon'),
      blackMarket: resolvePreferredItem(repository, ['T4_HEAD_CLOTH_SET1', 'T4_ARMOR_LEATHER_SET1'], 'armor'),
    }),
    [repository],
  )

  const exampleDefinitions = useMemo(() => {
    const definitions: Array<ExampleDefinition | null> = [
      examples.bag && {
        item: examples.bag,
        title: 'Calcular una bolsa',
        detail: 'T4 · 1 unidad · sin foco para reconocer materiales y costos.',
        run: () => onRunCraftingExample(examples.bag as Item, 'basic'),
      },
      examples.weapon && {
        item: examples.weapon,
        title: 'Fabricar un arma con retorno',
        detail: 'T4 · 10 unidades · foco activo para ver materiales recuperados.',
        run: () => onRunCraftingExample(examples.weapon as Item, 'return'),
      },
      examples.blackMarket && {
        item: examples.blackMarket,
        title: 'Comparar un objeto con Caerleon',
        detail: 'T4 · calidad normal · 1 unidad · tax 4% · transporte en cero.',
        run: () => onRunBlackMarketExample(examples.blackMarket as Item),
      },
    ]
    return definitions.filter(isExample)
  }, [examples, onRunBlackMarketExample, onRunCraftingExample])

  const recentItems = guidedState.recentItemIds.map((id) => repository.getById(id)).filter(isItem)
  const pinnedItems = guidedState.pinnedItemIds.map((id) => repository.getById(id)).filter(isItem)
  const pinnedIds = new Set(guidedState.pinnedItemIds)
  const intentions = [
    ['Fabricar un objeto', 'Materiales, tarifas, retorno y ganancia.', HammerIcon, onBrowseCatalog],
    ['Refinar recursos', 'Convierte recursos crudos en refinados.', RefiningIcon, onOpenRefining],
    ['Vender al Black Market', 'Compara un objeto con una orden de Caerleon.', BlackMarketIcon, onOpenBlackMarket],
    ['Comparar ciudades', 'Ordena oportunidades por ganancia, ROI o frescura.', ChartIcon, onCompareCities],
  ] as const

  function togglePinned(item: Item) {
    setGuidedState(togglePinnedItem(item.id))
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-5 pb-14 pt-1 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-8">
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Inicio guiado</p>
            <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-text sm:text-4xl">¿Qué quieres hacer en Albion Online?</h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Elige una intención o ejecuta un ejemplo. La app precargará un objeto real y valores iniciales para aprender con un cálculo funcional.
            </p>
          </div>
          {lastCalculationItem && (
            <button
              type="button"
              onClick={onRestoreLastCalculation}
              className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl border border-accent-border bg-accent-muted px-4 py-3 text-left text-sm font-semibold text-accent hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              <ItemIcon itemId={lastCalculationItem.id} enchantment={0} name={lastCalculationItem.name} size={38} />
              <span>
                <span className="block text-[10px] uppercase tracking-[0.12em] text-text-faint">Restaurar último cálculo</span>
                <span className="block max-w-52 truncate text-text">{lastCalculationItem.name}</span>
              </span>
            </button>
          )}
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {intentions.map(([title, description, icon, onClick]) => (
            <IntentCard key={title} title={title} description={description} icon={icon} onClick={onClick} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/82 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Ejemplos interactivos</p>
        <h2 className="mt-1 font-display text-2xl text-text">Aprende con un cálculo listo para usar</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {exampleDefinitions.map((example) => (
            <ExampleCard key={example.title} example={example} isPinned={pinnedIds.has(example.item.id)} onTogglePinned={togglePinned} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SavedItemsPanel
              title="Últimos objetos usados"
              emptyText="Ejecuta un ejemplo o abre el catálogo para iniciar este historial."
              items={recentItems}
              pinnedIds={pinnedIds}
              onOpen={onOpenItem}
              onTogglePinned={togglePinned}
            />
            <SavedItemsPanel
              title="Objetos fijados"
              emptyText="Fija cualquiera de los ejemplos o de tus objetos recientes."
              items={pinnedItems}
              pinnedIds={pinnedIds}
              onOpen={onOpenItem}
              onTogglePinned={togglePinned}
            />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text">Búsquedas recientes</h2>
                <p className="mt-1 text-xs text-text-faint">Reabre categoría y texto ya aplicados.</p>
              </div>
              <button type="button" onClick={onBrowseCatalog} className="text-xs font-semibold text-accent hover:underline">Nueva búsqueda</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {guidedState.recentSearches.length ? guidedState.recentSearches.map((search) => (
                <button
                  key={`${search.category}:${search.query.toLowerCase()}`}
                  type="button"
                  onClick={() => onOpenRecentSearch(search)}
                  className="rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                >
                  {search.query} · {CATEGORY_LABELS[search.category]}
                </button>
              )) : <span className="text-xs text-text-faint">Las búsquedas aparecerán al usar el catálogo.</span>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Configuraciones recomendadas</p>
          <h2 className="mt-1 font-display text-2xl text-text">Puntos de partida seguros</h2>
          <ul className="mt-5 space-y-2 text-xs leading-relaxed text-text-faint">
            <li><strong className="text-text">Crafteo básico:</strong> T4, una unidad y sin foco.</li>
            <li><strong className="text-text">Retorno visible:</strong> T4, diez unidades y foco activo.</li>
            <li><strong className="text-text">Black Market:</strong> calidad normal, tax 4% y transporte cero.</li>
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface/82 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Conceptos básicos</p>
        <h2 className="mt-1 font-display text-2xl text-text">Lee resultados sin saber economía de juegos</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {BASIC_CONCEPTS.map(([term, explanation]) => (
            <article key={term} className="rounded-xl border border-border bg-bg/30 p-4">
              <h3 className="text-sm font-semibold text-text">{term}</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-faint">{explanation}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
