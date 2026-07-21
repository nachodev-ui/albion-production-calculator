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

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

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

function isItem(value: Item | null): value is Item {
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
          item.tier === 4 &&
          item.recipe !== null &&
          !excludedIds.has(item.id),
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
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg/45 text-accent transition-colors group-hover:border-accent-border group-hover:bg-accent-muted">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-4 text-base font-semibold text-text">{title}</span>
      <span className="mt-1 flex-1 text-xs leading-relaxed text-text-faint">
        {description}
      </span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
        {action}
        <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
      aria-label={
        isPinned ? `Quitar ${item.name} de fijados` : `Fijar ${item.name}`
      }
      title={isPinned ? 'Quitar de fijados' : 'Fijar objeto'}
      onClick={(event) => {
        event.stopPropagation()
        onToggle(item)
      }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg/35 text-sm text-text-faint transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
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
        <ItemIcon
          itemId={item.id}
          enchantment={0}
          name={item.name}
          size={42}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-text">
            {item.name}
          </span>
          <span className="text-[10px] text-text-faint">
            T{item.tier} · {CATEGORY_LABELS[item.category]}
          </span>
        </span>
      </button>
      <PinButton
        item={item}
        isPinned={isPinned}
        onToggle={onTogglePinned}
      />
    </div>
  )
}

function ExampleCard({
  item,
  eyebrow,
  title,
  description,
  action,
  isPinned,
  onRun,
  onTogglePinned,
}: {
  readonly item: Item
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly action: string
  readonly isPinned: boolean
  readonly onRun: () => void
  readonly onTogglePinned: (item: Item) => void
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <ItemIcon
          itemId={item.id}
          enchantment={0}
          name={item.name}
          size={64}
          className="rounded-xl"
        />
        <PinButton
          item={item}
          isPinned={isPinned}
          onToggle={onTogglePinned}
        />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
        {eyebrow}
      </p>
      <h3 className="mt-1 font-display text-xl text-text">{title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-text-faint">
        {description}
      </p>
      <button
        type="button"
        onClick={onRun}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        {action}
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </article>
  )
}

function BasicConcept({
  term,
  summary,
  explanation,
}: {
  readonly term: string
  readonly summary: string
  readonly explanation: string
}) {
  return (
    <article className="rounded-xl border border-border bg-bg/30 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-text">{term}</h3>
        <InfoHint
          label={term}
          text={explanation}
          openOnHover
          align="left"
          width={288}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-text-faint">{summary}</p>
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
    const bag = resolvePreferredItem(
      repository,
      ['T4_BAG', 'T5_BAG'],
      'accessory',
    )
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-5 pb-14 pt-1 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-accent/[0.08] blur-3xl"
        />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Inicio guiado
            </p>
            <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-text sm:text-4xl">
              ¿Qué quieres hacer en Albion Online?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
              Elige una intención o ejecuta un ejemplo. La app precargará un
              objeto real, una cantidad y una configuración inicial para que
              puedas aprender modificando un cálculo que ya funciona.
            </p>
          </div>
          {lastCalculationItem && (
            <button
              type="button"
              onClick={onRestoreLastCalculation}
              className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl border border-accent-border bg-accent-muted px-4 py-3 text-left text-sm font-semibold text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              <ItemIcon
                itemId={lastCalculationItem.id}
                enchantment={0}
                name={lastCalculationItem.name}
                size={38}
              />
              <span>
                <span className="block text-[10px] uppercase tracking-[0.12em] text-text-faint">
                  Restaurar último cálculo
                </span>
                <span className="block max-w-52 truncate text-text">
                  {lastCalculationItem.name}
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntentCard
            title="Fabricar un objeto"
            description="Abre el catálogo de recetas y calcula materiales, tarifas, retorno y ganancia."
            action="Elegir objeto"
            icon={HammerIcon}
            onClick={onBrowseCatalog}
          />
          <IntentCard
            title="Refinar recursos"
            description="Revisa el módulo dedicado a convertir recursos crudos en materiales refinados."
            action="Abrir refinamiento"
            icon={RefiningIcon}
            onClick={onOpenRefining}
          />
          <IntentCard
            title="Vender al Black Market"
            description="Compara un objeto concreto con la orden de compra observada en Caerleon."
            action="Comparar objeto"
            icon={BlackMarketIcon}
            onClick={onOpenBlackMarket}
          />
          <IntentCard
            title="Comparar ciudades"
            description="Escanea varias ciudades y ordena oportunidades por ganancia, ROI o frescura."
            action="Abrir escáner"
            icon={ChartIcon}
            onClick={onCompareCities}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/82 p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Ejemplos interactivos
          </p>
          <h2 className="mt-1 font-display text-2xl text-text">
            Aprende con un cálculo listo para usar
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
            Cada botón abre la herramienta correspondiente y aplica valores
            iniciales reales. Después puedes cambiar cualquier precio o regla.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {examples.bag && (
            <ExampleCard
              item={examples.bag}
              eyebrow="Ejemplo 1 · Crafteo básico"
              title="Calcular una bolsa"
              description="Abre una bolsa T4 con una unidad y sin foco para identificar materiales, costo bruto y precio de equilibrio."
              action="Ejecutar ejemplo"
              isPinned={pinnedIds.has(examples.bag.id)}
              onRun={() =>
                onRunCraftingExample(examples.bag as Item, 'basic')
              }
              onTogglePinned={handleTogglePinned}
            />
          )}
          {examples.weapon && (
            <ExampleCard
              item={examples.weapon}
              eyebrow="Ejemplo 2 · Retorno"
              title="Fabricar un arma con retorno"
              description="Precarga diez armas T4 y activa foco para mostrar cuánto material vuelve y cómo cambia el costo real."
              action="Calcular con retorno"
              isPinned={pinnedIds.has(examples.weapon.id)}
              onRun={() =>
                onRunCraftingExample(examples.weapon as Item, 'return')
              }
              onTogglePinned={handleTogglePinned}
            />
          )}
          {examples.blackMarket && (
            <ExampleCard
              item={examples.blackMarket}
              eyebrow="Ejemplo 3 · Black Market"
              title="Comparar un objeto con Caerleon"
              description="Precarga un objeto T4, calidad normal, una unidad y tax de 4% para ejecutar la comparación individual."
              action="Abrir comparación"
              isPinned={pinnedIds.has(examples.blackMarket.id)}
              onRun={() =>
                onRunBlackMarketExample(examples.blackMarket as Item)
              }
              onTogglePinned={handleTogglePinned}
            />
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-text">
                Últimos objetos usados
              </h2>
              <p className="mt-1 text-xs text-text-faint">
                Se guardan solo en este navegador hasta que abras una cuenta.
              </p>
              <div className="mt-4 space-y-2">
                {recentItems.length > 0 ? (
                  recentItems.map((item) => (
                    <ItemShortcut
                      key={item.id}
                      item={item}
                      isPinned={pinnedIds.has(item.id)}
                      onOpen={onOpenItem}
                      onTogglePinned={handleTogglePinned}
                    />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-text-faint">
                    Aún no has abierto objetos. Ejecuta un ejemplo o usa el
                    catálogo para iniciar este historial.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-text">Objetos fijados</h2>
              <p className="mt-1 text-xs text-text-faint">
                Usa la estrella para mantener accesibles tus recetas frecuentes.
              </p>
              <div className="mt-4 space-y-2">
                {pinnedItems.length > 0 ? (
                  pinnedItems.map((item) => (
                    <ItemShortcut
                      key={item.id}
                      item={item}
                      isPinned
                      onOpen={onOpenItem}
                      onTogglePinned={handleTogglePinned}
                    />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-text-faint">
                    No hay objetos fijados. Puedes fijar cualquiera de los
                    ejemplos o de tus objetos recientes.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text">
                  Búsquedas recientes
                </h2>
                <p className="mt-1 text-xs text-text-faint">
                  Reabre el catálogo con la categoría y el texto ya aplicados.
                </p>
              </div>
              <button
                type="button"
                onClick={onBrowseCatalog}
                className="text-xs font-semibold text-accent hover:underline"
              >
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
                    className="rounded-full border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  >
                    {search.query} · {CATEGORY_LABELS[search.category]}
                  </button>
                ))
              ) : (
                <span className="text-xs text-text-faint">
                  Las búsquedas aparecerán aquí al usar el catálogo.
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Configuraciones recomendadas
          </p>
          <h2 className="mt-1 font-display text-2xl text-text">
            Puntos de partida seguros
          </h2>
          <div className="mt-5 space-y-3">
            {examples.bag && (
              <button
                type="button"
                onClick={() =>
                  onRunCraftingExample(examples.bag as Item, 'basic')
                }
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                <HammerIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-semibold text-text">
                    Primer cálculo
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-faint">
                    T4 · 1 unidad · sin foco. Ideal para aprender cada costo.
                  </span>
                </span>
              </button>
            )}
            {examples.weapon && (
              <button
                type="button"
                onClick={() =>
                  onRunCraftingExample(examples.weapon as Item, 'return')
                }
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                <ReturnIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-semibold text-text">
                    Retorno visible
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-faint">
                    T4 · 10 unidades · foco activo para comparar ahorro.
                  </span>
                </span>
              </button>
            )}
            {examples.blackMarket && (
              <button
                type="button"
                onClick={() =>
                  onRunBlackMarketExample(examples.blackMarket as Item)
                }
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                <BlackMarketIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>
                  <span className="block text-sm font-semibold text-text">
                    Venta conservadora
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-faint">
                    Calidad normal · 1 unidad · tax 4% · transporte en cero.
                  </span>
                </span>
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface/82 p-5 sm:p-6">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Conceptos básicos
          </p>
          <h2 className="mt-1 font-display text-2xl text-text">
            Lee los resultados sin saber economía de juegos
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Pulsa o pasa el cursor por el icono de información cuando necesites
            una explicación más detallada.
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <BasicConcept
            term="ROI"
            summary="Mide cuánto ganas o pierdes comparado con la plata que invertiste."
            explanation="Un ROI de 20% significa que, por cada 100 de plata gastada, el cálculo estima 20 de ganancia. Un valor negativo significa pérdida."
          />
          <BasicConcept
            term="Retorno de crafteo"
            summary="Es la parte de los materiales que el juego devuelve después de fabricar."
            explanation="El retorno reduce el costo real porque puedes reutilizar o vender los materiales recuperados. La ciudad, el foco y algunos bonos cambian este porcentaje."
          />
          <BasicConcept
            term="Tax del Black Market"
            summary="Es el descuento aplicado a la venta antes de calcular tu ganancia final."
            explanation="La orden puede mostrar un precio alto, pero no recibes todo ese valor: primero se resta el impuesto configurado y luego otros costos como transporte."
          />
          <BasicConcept
            term="Precio de equilibrio"
            summary="Es el precio mínimo al que debes vender para no ganar ni perder."
            explanation="Si vendes por debajo del precio de equilibrio, el cálculo termina en pérdida. Por encima, comienza a existir una ganancia estimada."
          />
        </div>
      </section>
    </div>
  )
}
