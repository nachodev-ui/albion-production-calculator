import { useMemo, useState, type ComponentType, type SVGProps } from 'react'
import {
  ArrowRightIcon,
  BlackMarketIcon,
  ChartIcon,
  HammerIcon,
  RefiningIcon,
  ReturnIcon,
} from '../../../app/AppIcons'
import {
  asBaseItemId,
  type BaseItemId,
  type Item,
  type ItemCategory,
} from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { ItemIcon } from '@shared/components/ItemIcon'
import { InfoHint } from '@shared/components/InfoHint'
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
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly action: string
  readonly icon: IconComponent
  readonly recommendation: string
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
  {
    term: 'ROI',
    summary: 'Cuánto ganas o pierdes frente a la plata invertida.',
    explanation:
      'Un ROI de 20% estima 20 de ganancia por cada 100 de plata gastada. Un valor negativo significa pérdida.',
  },
  {
    term: 'Retorno de crafteo',
    summary: 'La parte de los materiales que el juego devuelve al fabricar.',
    explanation:
      'El retorno reduce el costo real porque puedes reutilizar o vender lo recuperado. Ciudad, foco y bonos cambian el porcentaje.',
  },
  {
    term: 'Tax del Black Market',
    summary: 'El descuento aplicado a la venta antes de calcular la ganancia.',
    explanation:
      'No recibes todo el precio de la orden: primero se resta el impuesto y luego otros costos, como el transporte.',
  },
  {
    term: 'Precio de equilibrio',
    summary: 'El precio mínimo de venta para no ganar ni perder.',
    explanation:
      'Vender por debajo produce pérdida. Por encima comienza a existir una ganancia estimada.',
  },
] as const

function isItem(value: Item | null): value is Item {
  return value !== null
}

function isExampleDefinition(
  value: ExampleDefinition | null,
): value is ExampleDefinition {
  return value !== null
}

function resolvePreferredItem(
  repository: ItemRepository,
  identifiers: readonly string[],
  category: ItemCategory,
  excludedIds: ReadonlySet<string> = new Set(),
): Item | null {
  for (const identifier of identifiers) {
    const item = repository.getById(asBaseItemId(identifier))
    if (item && !excludedIds.has(item.id)) return item
  }

  return (
    repository
      .getAll(category)
      .find(
        (item) =>
          item.tier === 4 && item.recipe !== null && !excludedIds.has(item.id),
      ) ??
    repository
      .getAll(category)
      .find((item) => item.recipe !== null && !excludedIds.has(item.id)) ??
    null
  )
}

function IntentCard({
  title,
  description,
  action,
  icon: Icon,
  onClick,
}: {
  readonly title: string
  readonly description: string
  readonly action: string
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
      <span className="mt-1 flex-1 text-xs leading-relaxed text-text-faint">
        {description}
      </span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
        {action} <ArrowRightIcon className="h-3.5 w-3.5" />
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
      title={isPinned ? 'Quitar de fijados' : 'Fijar objeto'}
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
          <span className="text-[10px] text-text-faint">
            T{item.tier} · {CATEGORY_LABELS[item.category]}
          </span>
        </span>
      </button>
      <PinButton item={item} isPinned={isPinned} onToggle={onTogglePinned} />
    </div>
  )
}

function SavedItemsPanel({
  title,
  description,
  emptyText,
  items,
  pinnedIds,
  onOpen,
  onTogglePinned,
}: {
  readonly title: string
  readonly description: string
  readonly emptyText: string
  readonly items: readonly Item[]
  readonly pinnedIds: ReadonlySet<BaseItemId>
  readonly onOpen: (item: Item) => void
  readonly onTogglePinned: (item: Item) => void
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-text">{title}</h2>
      <p className="mt-1 text-xs text-text-faint">{description}</p>
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
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
          <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-text-faint">
            {emptyText}
          </p>
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
        <ItemIcon
          itemId={example.item.id}
          enchantment={0}
          name={example.item.name}
          size={64}
          className="rounded-xl"
        />
        <PinButton
          item={example.item}
          isPinned={isPinned}
          onToggle={onTogglePinned}
        />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
        {example.eyebrow}
      </p>
      <h3 className="mt-1 font-display text-xl text-text">{example.title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-text-faint">
        {example.description}
      </p>
      <button
        type="button"
        onClick={example.run}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        {example.action} <ArrowRightIcon className="h-4 w-4" />
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

  const examples = useMemo(() => {
    const bag = resolvePreferredItem(repository, ['T4_BAG', 'T5_BAG'], 'accessory')
    const excluded = new Set(bag ? [bag.id] : [])
    const weapon = resolvePreferredItem(
      repository,
      ['T4_MAIN_SWORD', 'T4_MAIN_AXE'],
      'weapon',
      excluded,
    )
    if (weapon) excluded.add(weapon.id)
    const blackMarket = resolvePreferredItem(
      repository,
      ['T4_HEAD_CLOTH_SET1', 'T4_ARMOR_LEATHER_SET1'],
      'armor',
      excluded,
    )
    return { bag, weapon, blackMarket }
  }, [repository])

  const exampleDefinitions = useMemo(() => {
    const definitions: Array<ExampleDefinition | null> = [
      examples.bag && {
        item: examples.bag,
        eyebrow: 'Ejemplo 1 · Crafteo básico',
        title: 'Calcular una bolsa',
        description: 'Bolsa T4, una unidad y sin foco para reconocer materiales y costos.',
        action: 'Ejecutar ejemplo',
        icon: HammerIcon,
        recommendation: 'T4 · 1 unidad · sin foco. Ideal para aprender cada costo.',
        run: () => onRunCraftingExample(examples.bag as Item, 'basic'),
      },
      examples.weapon && {
        item: examples.weapon,
        eyebrow: 'Ejemplo 2 · Retorno',
        title: 'Fabricar un arma con retorno',
        description: 'Diez armas T4 con foco para ver materiales recuperados y ahorro.',
        action: 'Calcular con retorno',
        icon: ReturnIcon,
        recommendation: 'T4 · 10 unidades · foco activo para comparar ahorro.',
        run: () => onRunCraftingExample(examples.weapon as Item, 'return'),
      },
      examples.blackMarket && {
        item: examples.blackMarket,
        eyebrow: 'Ejemplo 3 · Black Market',
        title: 'Comparar un objeto con Caerleon',
        description: 'Objeto T4, calidad normal, una unidad y tax de 4%.',
        action: 'Abrir comparación',
        icon: BlackMarketIcon,
        recommendation: 'Calidad normal · 1 unidad · tax 4% · transporte en cero.',
        run: () => onRunBlackMarketExample(examples.blackMarket as Item),
      },
    ]
    return definitions.filter(isExampleDefinition)
  }, [examples, onRunBlackMarketExample, onRunCraftingExample])

  const recentItems = guidedState.recentItemIds
    .map((itemId) => repository.getById(itemId))
    .filter(isItem)
  const pinnedItems = guidedState.pinnedItemIds
    .map((itemId) => repository.getById(itemId))
    .filter(isItem)
  const pinnedIds = new Set(guidedState.pinnedItemIds)

  function handleTogglePinned(item: Item) {
    setGuidedState(togglePinnedItem(item.id))
  }

  const intentions = [
    ['Fabricar un objeto', 'Calcula materiales, tarifas, retorno y ganancia.', 'Elegir objeto', HammerIcon, onBrowseCatalog],
    ['Refinar recursos', 'Convierte recursos crudos en materiales refinados.', 'Abrir refinamiento', RefiningIcon, onOpenRefining],
    ['Vender al Black Market', 'Compara un objeto con una orden de Caerleon.', 'Comparar objeto', BlackMarketIcon, onOpenBlackMarket],
    ['Comparar ciudades', 'Ordena oportunidades por ganancia, ROI o frescura.', 'Abrir escáner', ChartIcon, onCompareCities],
  ] as const

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-5 pb-14 pt-1 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-8">
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Inicio guiado</p>
            <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-text sm:text-4xl">
              ¿Qué quieres hacer en Albion Online?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Elige una intención o ejecuta un ejemplo. La app precargará un objeto real y valores iniciales para aprender modificando un cálculo funcional.
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
          {intentions.map(([title, description, action, icon, onClick]) => (
            <IntentCard key={title} title={title} description={description} action={action} icon={icon} onClick={onClick} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/82 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Ejemplos interactivos</p>
        <h2 className="mt-1 font-display text-2xl text-text">Aprende con un cálculo listo para usar</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
          Cada botón abre la herramienta y aplica valores reales que luego puedes cambiar.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {exampleDefinitions.map((example) => (
            <ExampleCard
              key={example.title}
              example={example}
              isPinned={pinnedIds.has(example.item.id)}
              onTogglePinned={handleTogglePinned}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <SavedItemsPanel
              title="Últimos objetos usados"
              description="Se guardan en este navegador."
              emptyText="Ejecuta un ejemplo o abre el catálogo para iniciar este historial."
              items={recentItems}
              pinnedIds={pinnedIds}
              onOpen={onOpenItem}
              onTogglePinned={handleTogglePinned}
            />
            <SavedItemsPanel
              title="Objetos fijados"
              description="La estrella mantiene accesibles tus recetas frecuentes."
              emptyText="Fija cualquiera de los ejemplos o de tus objetos recientes."
              items={pinnedItems}
              pinnedIds={pinnedIds}
              onOpen={onOpenItem}
              onTogglePinned={handleTogglePinned}
            />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text">Búsquedas recientes</h2>
                <p className="mt-1 text-xs text-text-faint">Reabre categoría y texto ya aplicados.</p>
              </div>
              <button type="button" onClick={onBrowseCatalog} className="text-xs font-semibold text-accent hover:underline">
                Nueva búsqueda
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {guidedState.recentSearches.length > 0 ? (
                guidedState.recentSearches.map((search) => (
                  <button
                    key={`${search.category}:${search.query.toLocaleLowerCase('es')}`}
                    type="button"
                    onClick={() => onOpenRecentSearch(search)}
                    className="rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  >
                    {search.query} · {CATEGORY_LABELS[search.category]}
                  </button>
                ))
              ) : (
                <span className="text-xs text-text-faint">Las búsquedas aparecerán al usar el catálogo.</span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Configuraciones recomendadas</p>
          <h2 className="mt-1 font-display text-2xl text-text">Puntos de partida seguros</h2>
          <div className="mt-5 space-y-3">
            {exampleDefinitions.map((example) => (
              <button
                key={example.recommendation}
                type="button"
                onClick={example.run}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left hover:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                <example.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-semibold text-text">{example.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-faint">{example.recommendation}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface/82 p-5 sm:p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Conceptos básicos</p>
        <h2 className="mt-1 font-display text-2xl text-text">Lee resultados sin saber economía de juegos</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">Pulsa el icono de información para ampliar cada explicación.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {BASIC_CONCEPTS.map(({ term, summary, explanation }) => (
            <article key={term} className="rounded-xl border border-border bg-bg/30 p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text">{term}</h3>
                <InfoHint label={term} text={explanation} openOnHover align="left" width={288} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-faint">{summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
