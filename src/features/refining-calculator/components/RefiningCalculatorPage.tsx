import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildItemIconUrl, type BaseItemId } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { useCurrentMarketPrices } from '@features/market-data/hooks/useCurrentMarketPrices'
import {
  MARKET_SERVER_LABELS,
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
  buildItemPriceKey,
  formatMarketPriceRelativeAge,
  type AlbionServer,
  type AutomaticMarketPriceDetail,
  type PurchaseStrategy,
  type SaleStrategy,
} from '@features/market-data/types/MarketPrice'
import {
  REFINING_CITIES,
  REFINING_CITY_LABELS,
  REFINING_ENCHANTMENTS,
  REFINING_MECHANICS_SOURCES,
  REFINING_RESOURCES,
  REFINING_TIERS,
  calculateRefiningFocusCostEfficiency,
  getMaximumRefiningEnchantment,
  getRefiningRecipe,
  getRefiningResource,
  normalizeRefiningEnchantment,
  type RefiningCityId,
  type RefiningEnchantment,
  type RefiningResourceKind,
  type RefiningTier,
} from '../config/refiningGameConfig'
import {
  calculateRefiningEconomics,
  type RefiningScenario,
} from '../utils/refiningEconomics'

interface RefiningCalculatorPageProps {
  readonly repository: ItemRepository
}

type StationAccessType = 'user' | 'associate' | 'free'

function formatSilver(value: number): string {
  return `${new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(value)} plata`
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

function normalizeInteger(value: string, minimum: number, maximum: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)))
}

function parseManualPrice(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function automaticPriceLabel(
  detail: AutomaticMarketPriceDetail | undefined,
): string {
  if (!detail || detail.value === null) return 'Sin precio automático'
  return `${formatSilver(detail.value)} · ${formatMarketPriceRelativeAge(detail.updatedAt)}`
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow: string
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/86 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-xl text-text">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  readonly label: string
  readonly hint?: string
  readonly children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-text-faint">
          {hint}
        </span>
      )}
    </label>
  )
}

const INPUT_CLASS =
  'mt-2 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent-border focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50'

function Metric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  readonly label: string
  readonly value: string
  readonly detail?: string
  readonly tone?: 'default' | 'positive' | 'negative' | 'accent' | 'warning'
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-positive'
      : tone === 'negative'
        ? 'text-negative'
        : tone === 'accent'
          ? 'text-accent'
          : tone === 'warning'
            ? 'text-warning'
            : 'text-text'

  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold tabular ${toneClass}`}>{value}</p>
      {detail && (
        <p className="mt-1 text-[11px] leading-relaxed text-text-faint">{detail}</p>
      )}
    </article>
  )
}

function PriceField({
  label,
  manualValue,
  automaticDetail,
  onChange,
}: {
  readonly label: string
  readonly manualValue: number | null
  readonly automaticDetail: AutomaticMarketPriceDetail | undefined
  readonly onChange: (value: number | null) => void
}) {
  return (
    <Field
      label={label}
      hint={
        manualValue === null
          ? automaticPriceLabel(automaticDetail)
          : `Manual · automático: ${automaticPriceLabel(automaticDetail)}`
      }
    >
      <input
        type="number"
        min="0"
        step="1"
        value={manualValue ?? ''}
        placeholder={automaticDetail?.value?.toString() ?? 'Sin dato'}
        onChange={(event) => onChange(parseManualPrice(event.target.value))}
        className={INPUT_CLASS}
      />
    </Field>
  )
}

function VisualRecipeChoice({
  label,
  detail,
  rawItemId,
  rawEnchantment,
  outputItemId,
  outputEnchantment,
  selected,
  dense = false,
  onClick,
}: {
  readonly label: string
  readonly detail?: string
  readonly rawItemId: BaseItemId
  readonly rawEnchantment: RefiningEnchantment
  readonly outputItemId: BaseItemId
  readonly outputEnchantment: RefiningEnchantment
  readonly selected: boolean
  readonly dense?: boolean
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`group rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
        selected
          ? 'border-accent-border bg-accent-muted/40 shadow-[0_0_0_1px_rgba(245,158,11,0.12)]'
          : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface'
      } ${dense ? 'p-2.5' : 'p-3.5'}`}
    >
      <span className="flex items-center justify-center gap-1.5">
        <img
          src={buildItemIconUrl(rawItemId, rawEnchantment, dense ? 64 : 80)}
          alt=""
          className={`${dense ? 'h-10 w-10' : 'h-14 w-14'} rounded-lg bg-bg/45 object-contain transition-transform group-hover:scale-105`}
        />
        <span className="text-xs text-text-faint">→</span>
        <img
          src={buildItemIconUrl(
            outputItemId,
            outputEnchantment,
            dense ? 64 : 80,
          )}
          alt=""
          className={`${dense ? 'h-10 w-10' : 'h-14 w-14'} rounded-lg bg-bg/45 object-contain transition-transform group-hover:scale-105`}
        />
      </span>
      <span
        className={`mt-2 block text-center font-semibold ${
          dense ? 'text-xs' : 'text-sm'
        } ${selected ? 'text-accent' : 'text-text'}`}
      >
        {label}
      </span>
      {detail && (
        <span className="mt-1 block text-center text-[10px] leading-relaxed text-text-faint">
          {detail}
        </span>
      )}
    </button>
  )
}

function ScenarioColumn({
  title,
  scenario,
  active,
}: {
  readonly title: string
  readonly scenario: RefiningScenario
  readonly active: boolean
}) {
  const profitable = scenario.profit >= 0
  return (
    <article
      className={`rounded-2xl border p-5 ${
        active
          ? 'border-accent-border bg-accent-muted/35'
          : 'border-border bg-surface-raised'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {active && (
          <span className="rounded-full border border-accent-border bg-accent-muted px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
            Seleccionado
          </span>
        )}
      </div>
      <dl className="mt-4 space-y-3 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">RRR efectivo</dt>
          <dd className="font-medium tabular text-text">
            {formatPercent(scenario.returnRate)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">Costo efectivo</dt>
          <dd className="font-medium tabular text-text">
            {formatSilver(scenario.effectiveProductionCost)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">Beneficio del lote</dt>
          <dd
            className={`font-semibold tabular ${
              profitable ? 'text-positive' : 'text-negative'
            }`}
          >
            {formatSilver(scenario.profit)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">ROI sobre inversión</dt>
          <dd
            className={`font-semibold tabular ${
              profitable ? 'text-positive' : 'text-negative'
            }`}
          >
            {formatPercent(scenario.roi)}
          </dd>
        </div>
      </dl>
    </article>
  )
}

export function RefiningCalculatorPage({
  repository,
}: RefiningCalculatorPageProps) {
  const [resourceKind, setResourceKind] =
    useState<RefiningResourceKind>('ore')
  const [tier, setTier] = useState<RefiningTier>(4)
  const [enchantment, setEnchantment] =
    useState<RefiningEnchantment>(0)
  const [city, setCity] = useState<RefiningCityId>('thetford')
  const [quantity, setQuantity] = useState(100)
  const [useFocus, setUseFocus] = useState(false)
  const [selectedTierLevel, setSelectedTierLevel] = useState(0)
  const [otherTierLevelsTotal, setOtherTierLevelsTotal] = useState(0)
  const [silverPerFocus, setSilverPerFocus] = useState(0)
  const [stationAccessType, setStationAccessType] =
    useState<StationAccessType>('user')
  const [userFeePer100, setUserFeePer100] = useState(500)
  const [associateFeePer100, setAssociateFeePer100] = useState(0)
  const [isPremium, setIsPremium] = useState(true)
  const [manualRawPrice, setManualRawPrice] = useState<number | null>(null)
  const [manualPreviousPrice, setManualPreviousPrice] = useState<number | null>(null)
  const [manualOutputPrice, setManualOutputPrice] = useState<number | null>(null)

  const resource = getRefiningResource(resourceKind)
  const recipe = useMemo(
    () => getRefiningRecipe({ resourceKind, tier, enchantment }),
    [enchantment, resourceKind, tier],
  )
  const rawTarget = useMemo(
    () => ({ itemId: recipe.rawItemId, enchantment: recipe.rawEnchantment }),
    [recipe.rawEnchantment, recipe.rawItemId],
  )
  const previousTarget = useMemo(
    () =>
      recipe.previousRefinedItemId
        ? {
            itemId: recipe.previousRefinedItemId,
            enchantment: recipe.previousRefinedEnchantment,
          }
        : null,
    [recipe.previousRefinedEnchantment, recipe.previousRefinedItemId],
  )
  const outputTarget = useMemo(
    () => ({
      itemId: recipe.outputItemId,
      enchantment: recipe.outputEnchantment,
    }),
    [recipe.outputEnchantment, recipe.outputItemId],
  )
  const materialTargets = useMemo(
    () => (previousTarget ? [rawTarget, previousTarget] : [rawTarget]),
    [previousTarget, rawTarget],
  )
  const rawItem = repository.getById(recipe.rawItemId)
  const previousItem = recipe.previousRefinedItemId
    ? repository.getById(recipe.previousRefinedItemId)
    : null
  const outputItem = repository.getById(recipe.outputItemId)
  const targetLabels = useMemo(
    () =>
      new Map([
        [buildItemPriceKey(rawTarget.itemId, rawTarget.enchantment), rawItem?.name ?? resource.rawLabel],
        ...(previousTarget
          ? [
              [
                buildItemPriceKey(
                  previousTarget.itemId,
                  previousTarget.enchantment,
                ),
                previousItem?.name ?? `Refinado T${tier - 1}`,
              ] as const,
            ]
          : []),
        [
          buildItemPriceKey(outputTarget.itemId, outputTarget.enchantment),
          outputItem?.name ?? resource.refinedLabel,
        ],
      ]),
    [
      outputItem?.name,
      outputTarget.enchantment,
      outputTarget.itemId,
      previousItem?.name,
      previousTarget,
      rawItem?.name,
      rawTarget.enchantment,
      rawTarget.itemId,
      resource.rawLabel,
      resource.refinedLabel,
      tier,
    ],
  )
  const rootKey = `refining:${resourceKind}:T${tier}.${enchantment}`
  const market = useCurrentMarketPrices({
    rootKey,
    materialTargets,
    saleTarget: outputTarget,
    targetLabels,
  })
  const setMarketConfig = market.setConfig

  useEffect(() => {
    setMarketConfig({ purchaseCity: city, saleCity: city, quality: 1 })
  }, [city, setMarketConfig])

  const rawKey = buildItemPriceKey(rawTarget.itemId, rawTarget.enchantment)
  const previousKey = previousTarget
    ? buildItemPriceKey(previousTarget.itemId, previousTarget.enchantment)
    : null
  const automaticRawDetail = market.automaticPurchasePriceDetails.get(rawKey)
  const automaticPreviousDetail = previousKey
    ? market.automaticPurchasePriceDetails.get(previousKey)
    : undefined
  const rawUnitPrice = manualRawPrice ?? automaticRawDetail?.value ?? 0
  const previousRefinedUnitPrice =
    recipe.previousRefinedItemId === null
      ? 0
      : (manualPreviousPrice ?? automaticPreviousDetail?.value ?? 0)
  const outputUnitPrice =
    manualOutputPrice ?? market.automaticSalePriceDetail.value ?? 0
  const focusCostEfficiency =
    tier >= 4
      ? calculateRefiningFocusCostEfficiency({
          selectedTierLevel,
          otherTierLevelsTotal,
        })
      : 0
  const stationFeeConfig = useMemo(
    () => ({
      accessType: stationAccessType,
      userFeePer100Nutrition: userFeePer100,
      associateFeePer100Nutrition: associateFeePer100,
    }),
    [associateFeePer100, stationAccessType, userFeePer100],
  )
  const calculation = useMemo(
    () =>
      calculateRefiningEconomics({
        resource,
        recipe,
        city,
        requestedOutputQuantity: quantity,
        prices: {
          rawUnitPrice,
          previousRefinedUnitPrice,
          outputUnitPrice,
        },
        stationFeeConfig,
        focusCostEfficiency,
        silverPerFocus,
        isPremium,
      }),
    [
      city,
      focusCostEfficiency,
      isPremium,
      outputUnitPrice,
      previousRefinedUnitPrice,
      quantity,
      rawUnitPrice,
      recipe,
      resource,
      silverPerFocus,
      stationFeeConfig,
    ],
  )
  const activeScenario = useFocus
    ? calculation.withFocus
    : calculation.withoutFocus
  const hasCompletePrices =
    rawUnitPrice > 0 &&
    outputUnitPrice > 0 &&
    (recipe.previousRefinedItemId === null || previousRefinedUnitPrice > 0)
  const maximumEnchantment = getMaximumRefiningEnchantment(resource, tier)
  const activeFee =
    stationAccessType === 'free'
      ? 0
      : stationAccessType === 'associate'
        ? associateFeePer100
        : userFeePer100
  const profitTone = activeScenario.profit >= 0 ? 'positive' : 'negative'
  const rawName = rawItem?.name ?? `${resource.rawLabel} T${tier}`
  const previousName =
    previousItem?.name ?? `${resource.refinedLabel} T${Math.max(2, tier - 1)}`
  const outputName = outputItem?.name ?? `${resource.refinedLabel} T${tier}`

  function resetManualPrices() {
    setManualRawPrice(null)
    setManualPreviousPrice(null)
    setManualOutputPrice(null)
  }

  function changeResource(nextKind: RefiningResourceKind) {
    resetManualPrices()
    const nextResource = getRefiningResource(nextKind)
    setResourceKind(nextKind)
    setCity(nextResource.specialtyCity)
    setEnchantment((current) =>
      normalizeRefiningEnchantment(nextResource, tier, current),
    )
  }

  function changeTier(nextTier: RefiningTier) {
    resetManualPrices()
    setTier(nextTier)
    setEnchantment((current) =>
      normalizeRefiningEnchantment(resource, nextTier, current),
    )
    if (nextTier < 4) {
      setSelectedTierLevel(0)
      setOtherTierLevelsTotal(0)
    }
  }

  function changeEnchantment(nextEnchantment: RefiningEnchantment) {
    resetManualPrices()
    setEnchantment(nextEnchantment)
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 pb-14 pt-2 sm:px-6">
      <section className="mb-6 overflow-hidden rounded-2xl border border-accent-border bg-accent-muted/25 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              MVP económico T2–T8
            </p>
            <h2 className="mt-2 font-display text-2xl text-text sm:text-3xl">
              Convierte retorno, foco y tarifas en una decisión de refinamiento
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
              Sigue el flujo de una operación real: define qué refinar, revisa la
              mecánica, decide dónde comprar y vender, agrega los costos y compara el
              resultado con o sin foco.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Flujo de cálculo">
              {['1 · Operación', '2 · Mecánica', '3 · Mercado', '4 · Costos', '5 · Resultado'].map(
                (step) => (
                  <span
                    key={step}
                    className="rounded-full border border-border bg-surface/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted"
                  >
                    {step}
                  </span>
                ),
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/70 p-3">
            <img
              src={buildItemIconUrl(recipe.rawItemId, recipe.rawEnchantment, 80)}
              alt=""
              className="h-14 w-14 rounded-lg bg-bg/45 object-contain"
            />
            <span className="text-xl text-text-faint">→</span>
            <img
              src={buildItemIconUrl(
                recipe.outputItemId,
                recipe.outputEnchantment,
                80,
              )}
              alt=""
              className="h-14 w-14 rounded-lg bg-bg/45 object-contain"
            />
          </div>
        </div>
      </section>

      <div className="space-y-5">
        <div className="space-y-5">
                    <Panel eyebrow="1 · Operación" title="Elige el recurso y el lote">
            <div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-text-muted">Tipo de recurso</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
                    Las tarjetas usan los iconos oficiales del tier y encantamiento activos.
                  </p>
                </div>
                <p className="text-[11px] text-text-faint">
                  Seleccionado: <strong className="text-text">{resource.label}</strong>
                </p>
              </div>
              <div
                className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
                role="group"
                aria-label="Tipo de recurso"
              >
                {REFINING_RESOURCES.map((candidate) => {
                  const candidateEnchantment = normalizeRefiningEnchantment(
                    candidate,
                    tier,
                    enchantment,
                  )
                  const candidateRecipe = getRefiningRecipe({
                    resourceKind: candidate.kind,
                    tier,
                    enchantment: candidateEnchantment,
                  })
                  return (
                    <VisualRecipeChoice
                      key={candidate.kind}
                      label={candidate.label}
                      detail={`T${tier}.${candidateEnchantment}`}
                      rawItemId={candidateRecipe.rawItemId}
                      rawEnchantment={candidateRecipe.rawEnchantment}
                      outputItemId={candidateRecipe.outputItemId}
                      outputEnchantment={candidateRecipe.outputEnchantment}
                      selected={candidate.kind === resourceKind}
                      onClick={() => changeResource(candidate.kind)}
                    />
                  )
                })}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <p className="text-xs font-medium text-text-muted">Tier</p>
                <div
                  className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
                  role="group"
                  aria-label="Tier del recurso"
                >
                  {REFINING_TIERS.map((candidate) => {
                    const candidateEnchantment = normalizeRefiningEnchantment(
                      resource,
                      candidate,
                      enchantment,
                    )
                    const candidateRecipe = getRefiningRecipe({
                      resourceKind,
                      tier: candidate,
                      enchantment: candidateEnchantment,
                    })
                    return (
                      <VisualRecipeChoice
                        key={candidate}
                        label={`T${candidate}`}
                        rawItemId={candidateRecipe.rawItemId}
                        rawEnchantment={candidateRecipe.rawEnchantment}
                        outputItemId={candidateRecipe.outputItemId}
                        outputEnchantment={candidateRecipe.outputEnchantment}
                        selected={candidate === tier}
                        dense
                        onClick={() => changeTier(candidate)}
                      />
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-text-muted">Encantamiento</p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
                  {resourceKind === 'rock'
                    ? 'La roca encantada produce múltiples bloques normales por tirada.'
                    : tier === 4
                      ? 'T4 encantado utiliza refinado T3 normal.'
                      : 'Desde T5, el refinado previo conserva el encantamiento.'}
                </p>
                <div
                  className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
                  role="group"
                  aria-label="Encantamiento del recurso"
                >
                  {REFINING_ENCHANTMENTS.filter(
                    (candidate) => candidate <= maximumEnchantment,
                  ).map((candidate) => {
                    const candidateRecipe = getRefiningRecipe({
                      resourceKind,
                      tier,
                      enchantment: candidate,
                    })
                    return (
                      <VisualRecipeChoice
                        key={candidate}
                        label={`.${candidate}`}
                        detail={candidate === 0 ? 'Normal' : `Nivel ${candidate}`}
                        rawItemId={candidateRecipe.rawItemId}
                        rawEnchantment={candidateRecipe.rawEnchantment}
                        outputItemId={candidateRecipe.outputItemId}
                        outputEnchantment={candidateRecipe.outputEnchantment}
                        selected={candidate === enchantment}
                        dense
                        onClick={() => changeEnchantment(candidate)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field
                label="Ciudad de refinamiento"
                hint={`Especialidad recomendada: ${REFINING_CITY_LABELS[resource.specialtyCity]}`}
              >
                <select
                  value={city}
                  onChange={(event) => setCity(event.target.value as RefiningCityId)}
                  className={INPUT_CLASS}
                >
                  {REFINING_CITIES.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {REFINING_CITY_LABELS[candidate]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Cantidad refinada objetivo"
                hint={
                  recipe.outputPerCraft > 1
                    ? `Cada tirada produce ${recipe.outputPerCraft}; el lote se redondea hacia arriba.`
                    : 'Cantidad mínima que quieres obtener.'
                }
              >
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(normalizeInteger(event.target.value, 1, 1_000_000))
                  }
                  className={INPUT_CLASS}
                />
              </Field>
              <Field
                label="Escenario principal"
                hint="Ambos escenarios se calculan siempre para comparar el valor del foco."
              >
                <select
                  value={useFocus ? 'focus' : 'no-focus'}
                  onChange={(event) => setUseFocus(event.target.value === 'focus')}
                  className={INPUT_CLASS}
                >
                  <option value="no-focus">Sin foco</option>
                  <option value="focus">Con foco</option>
                </select>
              </Field>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-faint">
                Receta por tirada
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <article className="flex min-w-[9rem] items-center gap-3 rounded-xl border border-border bg-surface p-3">
                  <img
                    src={buildItemIconUrl(recipe.rawItemId, recipe.rawEnchantment, 96)}
                    alt=""
                    className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                  />
                  <div>
                    <p className="text-lg font-semibold tabular text-text">{recipe.rawPerCraft}×</p>
                    <p className="text-xs text-text-muted">{rawName}</p>
                  </div>
                </article>
                {recipe.previousRefinedItemId && (
                  <>
                    <span className="text-lg text-text-faint">+</span>
                    <article className="flex min-w-[9rem] items-center gap-3 rounded-xl border border-border bg-surface p-3">
                      <img
                        src={buildItemIconUrl(
                          recipe.previousRefinedItemId,
                          recipe.previousRefinedEnchantment,
                          96,
                        )}
                        alt=""
                        className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                      />
                      <div>
                        <p className="text-lg font-semibold tabular text-text">
                          {recipe.previousRefinedPerCraft}×
                        </p>
                        <p className="text-xs text-text-muted">{previousName}</p>
                      </div>
                    </article>
                  </>
                )}
                <span className="text-xl text-text-faint">→</span>
                <article className="flex min-w-[9rem] items-center gap-3 rounded-xl border border-accent-border bg-accent-muted/25 p-3">
                  <img
                    src={buildItemIconUrl(
                      recipe.outputItemId,
                      recipe.outputEnchantment,
                      96,
                    )}
                    alt=""
                    className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                  />
                  <div>
                    <p className="text-lg font-semibold tabular text-accent">
                      {recipe.outputPerCraft}×
                    </p>
                    <p className="text-xs text-text-muted">{outputName}</p>
                  </div>
                </article>
              </div>
            </div>
          </Panel>

                    <Panel eyebrow="2 · Mecánica" title="Materiales y retorno esperado">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric
                label="Recurso bruto necesario"
                value={`${formatQuantity(calculation.grossRawRequired)} × ${rawName}`}
                detail={`${calculation.craftsNeeded} tiradas`}
              />
              <Metric
                label="Refinado previo necesario"
                value={
                  recipe.previousRefinedItemId
                    ? `${formatQuantity(calculation.grossPreviousRefinedRequired)} × ${previousName}`
                    : 'No aplica'
                }
              />
              <Metric
                label="Producción obtenida"
                value={`${formatQuantity(calculation.productionObtained)} × ${outputName}`}
                detail={
                  calculation.productionObtained !== quantity
                    ? `Objetivo solicitado: ${formatQuantity(quantity)}`
                    : undefined
                }
              />
              <Metric
                label="Especialidad de ciudad"
                value={
                  calculation.hasCitySpecialty
                    ? `Sí · ${REFINING_CITY_LABELS[city]}`
                    : 'No aplicada'
                }
                detail={
                  calculation.hasCitySpecialty
                    ? '+40% de bono de producción local'
                    : `La especialidad está en ${REFINING_CITY_LABELS[resource.specialtyCity]}`
                }
                tone={calculation.hasCitySpecialty ? 'positive' : 'warning'}
              />
              <Metric
                label="Retorno sin foco"
                value={formatPercent(calculation.withoutFocus.returnRate)}
                detail={`${formatQuantity(calculation.withoutFocus.returnedRaw)} crudo + ${formatQuantity(calculation.withoutFocus.returnedPreviousRefined)} previo`}
              />
              <Metric
                label="Retorno con foco"
                value={formatPercent(calculation.withFocus.returnRate)}
                detail={`${formatQuantity(calculation.withFocus.returnedRaw)} crudo + ${formatQuantity(calculation.withFocus.returnedPreviousRefined)} previo`}
                tone="accent"
              />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-text-faint">
              Los retornos fraccionarios son valores esperados. Albion redondea cada
              tanda para aproximar el promedio, por lo que una operación pequeña puede
              devolver una unidad más o menos.
            </p>
          </Panel>

          <Panel eyebrow="3 · Mercado" title="Dónde comprar y dónde vender">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Servidor">
                <select
                  value={market.config.server}
                  onChange={(event) =>
                    market.setConfig({ server: event.target.value as AlbionServer })
                  }
                  className={INPUT_CLASS}
                >
                  {Object.entries(MARKET_SERVER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Ciudad de compra"
                hint="Mercado donde buscarás el recurso crudo y el refinado previo."
              >
                <select
                  value={market.config.purchaseCity}
                  onChange={(event) =>
                    market.setConfig({
                      purchaseCity: event.target.value as RefiningCityId,
                    })
                  }
                  className={INPUT_CLASS}
                >
                  {REFINING_CITIES.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {REFINING_CITY_LABELS[candidate]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cómo comprar">
                <select
                  value={market.config.purchaseStrategy}
                  onChange={(event) =>
                    market.setConfig({
                      purchaseStrategy: event.target.value as PurchaseStrategy,
                    })
                  }
                  className={INPUT_CLASS}
                >
                  {Object.entries(PURCHASE_STRATEGY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Ciudad de venta"
                hint="Mercado donde venderás el recurso refinado terminado."
              >
                <select
                  value={market.config.saleCity}
                  onChange={(event) =>
                    market.setConfig({ saleCity: event.target.value as RefiningCityId })
                  }
                  className={INPUT_CLASS}
                >
                  {REFINING_CITIES.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {REFINING_CITY_LABELS[candidate]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cómo vender">
                <select
                  value={market.config.saleStrategy}
                  onChange={(event) =>
                    market.setConfig({
                      saleStrategy: event.target.value as SaleStrategy,
                    })
                  }
                  className={INPUT_CLASS}
                >
                  {Object.entries(SALE_STRATEGY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Estado Premium"
                hint="Premium no cambia el RRR; aquí solo ajusta el impuesto de venta."
              >
                <select
                  value={isPremium ? 'premium' : 'standard'}
                  onChange={(event) => setIsPremium(event.target.value === 'premium')}
                  className={INPUT_CLASS}
                >
                  <option value="premium">Premium · impuesto 4%</option>
                  <option value="standard">Sin Premium · impuesto 8%</option>
                </select>
              </Field>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="flex -space-x-3">
                    <img
                      src={buildItemIconUrl(recipe.rawItemId, recipe.rawEnchantment, 80)}
                      alt=""
                      className="h-14 w-14 rounded-lg border border-border bg-bg/70 object-contain"
                    />
                    {recipe.previousRefinedItemId && (
                      <img
                        src={buildItemIconUrl(
                          recipe.previousRefinedItemId,
                          recipe.previousRefinedEnchantment,
                          80,
                        )}
                        alt=""
                        className="h-14 w-14 rounded-lg border border-border bg-bg/70 object-contain"
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-faint">
                      Compra de materiales
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      {REFINING_CITY_LABELS[market.config.purchaseCity as RefiningCityId]}
                    </p>
                    <p className="text-[11px] text-text-faint">
                      Busca el costo de entrada más bajo antes de refinar.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <PriceField
                    label={`Compra: ${rawName}`}
                    manualValue={manualRawPrice}
                    automaticDetail={automaticRawDetail}
                    onChange={setManualRawPrice}
                  />
                  {recipe.previousRefinedItemId && (
                    <PriceField
                      label={`Compra: ${previousName}`}
                      manualValue={manualPreviousPrice}
                      automaticDetail={automaticPreviousDetail}
                      onChange={setManualPreviousPrice}
                    />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-accent-border bg-accent-muted/20 p-4 sm:p-5">
                <div className="flex items-center gap-3 border-b border-accent-border/50 pb-4">
                  <img
                    src={buildItemIconUrl(
                      recipe.outputItemId,
                      recipe.outputEnchantment,
                      96,
                    )}
                    alt=""
                    className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
                      Venta del refinado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text">
                      {REFINING_CITY_LABELS[market.config.saleCity as RefiningCityId]}
                    </p>
                    <p className="text-[11px] text-text-faint">
                      Compara el precio final con todos los costos de la operación.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <PriceField
                    label={`Venta: ${outputName}`}
                    manualValue={manualOutputPrice}
                    automaticDetail={market.automaticSalePriceDetail}
                    onChange={setManualOutputPrice}
                  />
                </div>
              </section>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-text-faint">
                {market.status === 'loading'
                  ? 'Consultando precios mediante el pipeline central…'
                  : market.error
                    ? market.error
                    : 'Los valores automáticos usan la API central y su fallback/caché existente.'}
              </p>
              <button
                type="button"
                onClick={() => void market.refresh()}
                disabled={market.status === 'loading'}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:border-accent-border hover:text-accent disabled:cursor-wait disabled:opacity-50"
              >
                {market.status === 'loading' ? 'Actualizando…' : 'Actualizar precios'}
              </button>
            </div>
          </Panel>

          <Panel eyebrow="4 · Costos" title="Tarifa y acceso a la estación">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tipo de acceso">
                <select
                  value={stationAccessType}
                  onChange={(event) =>
                    setStationAccessType(event.target.value as StationAccessType)
                  }
                  className={INPUT_CLASS}
                >
                  <option value="user">Usuario</option>
                  <option value="associate">Asociado</option>
                  <option value="free">Gratis / puesto propio</option>
                </select>
              </Field>
              <Field label="Tarifa usuario / 100 nutrición">
                <input
                  type="number"
                  min="0"
                  value={userFeePer100}
                  onChange={(event) =>
                    setUserFeePer100(
                      normalizeInteger(event.target.value, 0, 1_000_000),
                    )
                  }
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Tarifa asociado / 100 nutrición">
                <input
                  type="number"
                  min="0"
                  value={associateFeePer100}
                  onChange={(event) =>
                    setAssociateFeePer100(
                      normalizeInteger(event.target.value, 0, 1_000_000),
                    )
                  }
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-text-faint">
              Tarifa aplicada: {new Intl.NumberFormat('es-CL').format(activeFee)} por
              100 de nutrición. Fórmula: ((Item Value × 0,1125) × tarifa) / 100 por
              tirada.
            </p>
          </Panel>

          <Panel eyebrow="4 · Foco" title="Especialización y costo de oportunidad">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label={`Especialización T${tier} (0–100)`}
                hint={
                  tier < 4
                    ? 'T2 y T3 no poseen un nodo de especialización propio.'
                    : 'Aporta 280 de eficiencia por nivel para este tier.'
                }
              >
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedTierLevel}
                  disabled={tier < 4}
                  onChange={(event) =>
                    setSelectedTierLevel(
                      normalizeInteger(event.target.value, 0, 100),
                    )
                  }
                  className={INPUT_CLASS}
                />
              </Field>
              <Field
                label="Niveles de los otros tiers"
                hint="Suma de los otros cuatro nodos T4–T8; máximo 400. Cada nivel aporta 30 compartidos."
              >
                <input
                  type="number"
                  min="0"
                  max="400"
                  value={otherTierLevelsTotal}
                  disabled={tier < 4}
                  onChange={(event) =>
                    setOtherTierLevelsTotal(
                      normalizeInteger(event.target.value, 0, 400),
                    )
                  }
                  className={INPUT_CLASS}
                />
              </Field>
              <Field
                label="Costo de oportunidad por foco"
                hint="Plata que valoras por cada punto; 0 muestra solo la ganancia extra bruta."
              >
                <input
                  type="number"
                  min="0"
                  value={silverPerFocus}
                  onChange={(event) =>
                    setSilverPerFocus(
                      Math.max(0, Number(event.target.value) || 0),
                    )
                  }
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Eficiencia total"
                value={new Intl.NumberFormat('es-CL').format(focusCostEfficiency)}
              />
              <Metric
                label="Foco por tirada"
                value={formatQuantity(calculation.focus.effectiveFocusPerCraft)}
                detail={`Base: ${calculation.focus.baseFocusPerCraft}`}
              />
              <Metric
                label="Foco para el lote"
                value={new Intl.NumberFormat('es-CL').format(
                  calculation.focus.totalFocusRequired,
                )}
              />
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          {!hasCompletePrices && (
            <div className="rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm leading-relaxed text-warning">
              Faltan precios utilizables. Ingresa valores manuales o actualiza el
              mercado para obtener beneficio, ROI y equilibrio confiables.
            </div>
          )}

          <Panel eyebrow="5 · Resultado" title={useFocus ? 'Economía con foco' : 'Economía sin foco'}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric
                label="Precio compra crudo"
                value={formatSilver(rawUnitPrice)}
                detail={manualRawPrice === null ? 'Automático' : 'Manual'}
              />
              <Metric
                label="Precio venta refinado"
                value={formatSilver(outputUnitPrice)}
                detail={manualOutputPrice === null ? 'Automático' : 'Manual'}
              />
              <Metric
                label="Tarifa de estación"
                value={formatSilver(activeScenario.stationFee)}
                detail={`${formatQuantity(recipe.itemValuePerCraft)} Item Value por tirada`}
              />
              <Metric
                label="Inversión inicial"
                value={formatSilver(activeScenario.initialInvestment)}
                detail="Materiales brutos + tarifa antes del retorno"
              />
              <Metric
                label="Valor recuperado"
                value={formatSilver(activeScenario.recoveredMaterialValue)}
                detail="Valor de reposición de los materiales devueltos"
                tone="accent"
              />
              <Metric
                label="Costo efectivo"
                value={formatSilver(activeScenario.effectiveProductionCost)}
                detail={`${formatSilver(activeScenario.effectiveCostPerUnit)} por unidad`}
              />
              <Metric
                label="Beneficio por unidad"
                value={formatSilver(activeScenario.profitPerUnit)}
                tone={profitTone}
              />
              <Metric
                label="Beneficio por lote"
                value={formatSilver(activeScenario.profit)}
                detail={`Ingreso neto: ${formatSilver(activeScenario.market.netRevenue)}`}
                tone={profitTone}
              />
              <Metric
                label="ROI"
                value={formatPercent(activeScenario.roi)}
                detail="Beneficio / inversión inicial"
                tone={profitTone}
              />
              <Metric
                label="Precio de equilibrio"
                value={formatSilver(activeScenario.breakEvenUnitPrice)}
                detail={`Incluye ${formatPercent(activeScenario.market.totalFeeRate)} en comisiones de venta`}
              />
            </div>
          </Panel>

          <Panel eyebrow="6 · Comparación" title="Sin foco vs. con foco">
            <div className="grid gap-4 md:grid-cols-2">
              <ScenarioColumn
                title="Sin foco"
                scenario={calculation.withoutFocus}
                active={!useFocus}
              />
              <ScenarioColumn
                title="Con foco"
                scenario={calculation.withFocus}
                active={useFocus}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Ganancia extra por foco"
                value={formatSilver(
                  calculation.focus.extraProfitBeforeFocusValuation,
                )}
                detail="Diferencia bruta frente a no usar foco"
                tone="accent"
              />
              <Metric
                label="Plata generada / foco"
                value={formatSilver(calculation.focus.silverPerFocusProduced)}
              />
              <Metric
                label="Costo oportunidad foco"
                value={formatSilver(calculation.focus.opportunityCost)}
                detail={`${formatSilver(silverPerFocus)} por punto`}
              />
              <Metric
                label="Valor neto de usar foco"
                value={formatSilver(calculation.focus.netFocusValue)}
                detail="Ganancia extra menos costo de oportunidad"
                tone={calculation.focus.netFocusValue >= 0 ? 'positive' : 'negative'}
              />
            </div>
          </Panel>

          <Panel eyebrow="Transparencia" title="Fórmulas, fuentes y alcance">
            <div className="space-y-3 text-xs leading-relaxed text-text-muted">
              <p>
                El RRR se deriva del bono de producción mediante{' '}
                <code className="rounded bg-bg/60 px-1.5 py-0.5 text-accent">
                  bono / (1 + bono)
                </code>
                . El costo efectivo descuenta el valor esperado del retorno, mientras
                el ROI usa la plata que debiste desembolsar inicialmente.
              </p>
              <p>
                La fuente de precios pública estándar de la comunidad es AODP. Esta
                pantalla no la consulta directamente: reutiliza la API central,
                receiver y caché ya existentes para conservar controles de frescura y
                disponibilidad.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(REFINING_MECHANICS_SOURCES).map(([key, href]) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-[11px] font-medium text-text-muted hover:border-accent-border hover:text-accent"
                  >
                    {key === 'returnRate'
                      ? 'RRR y bonos'
                      : key === 'recipes'
                        ? 'Recetas oficiales'
                        : key === 'focus'
                          ? 'Foco base'
                          : key === 'specialization'
                            ? 'Especialización'
                            : key === 'stationFee'
                              ? 'Tarifa de estación'
                              : 'AODP'}
                  </a>
                ))}
              </div>
            </div>
          </Panel>

          <section className="rounded-2xl border border-dashed border-border-strong bg-surface/55 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint">
              Estructura preparada
            </p>
            <h2 className="mt-1 font-display text-lg text-text">Siguientes extensiones</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                'Comparación automática entre ciudades',
                'Refinamiento encadenado T4→T8',
                'Compra y venta en ciudades distintas',
                'Ranking por plata por foco',
                'Planificación completa multinivel',
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-[11px] text-text-muted"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
