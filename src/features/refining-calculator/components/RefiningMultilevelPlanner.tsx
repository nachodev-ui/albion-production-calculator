import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { useMarketDataStore } from '@features/market-data/store/marketDataStore'
import {
  MARKET_SERVER_LABELS,
  MATERIAL_MARKET_QUALITY,
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
  buildItemPriceKey,
  buildMarketCacheKey,
  buildMarketItemIdentifier,
  resolvePurchasePrice,
  resolveSalePrice,
  type AlbionServer,
  type MarketPriceTarget,
  type PurchaseStrategy,
  type SaleStrategy,
} from '@features/market-data/types/MarketPrice'
import {
  REFINING_CITIES,
  REFINING_CITY_LABELS,
  REFINING_ENCHANTMENTS,
  REFINING_RESOURCES,
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
  rankRefiningMultilevelRoutes,
  type RefiningPlannerPriceResolver,
} from '../utils/refiningMultilevelPlanner'

interface RefiningMultilevelPlannerProps {
  readonly repository: ItemRepository
}

type StationAccessType = 'user' | 'associate' | 'free'
type SpecializationTier = 4 | 5 | 6 | 7 | 8

type SpecializationLevels = Readonly<Record<SpecializationTier, number>>

const TIERS = [4, 5, 6, 7, 8] as const
const DEFAULT_LEVELS: SpecializationLevels = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }
const INPUT =
  'mt-2 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text outline-none focus:border-accent-border focus:ring-2 focus:ring-accent/20 disabled:opacity-50'

function Field({ label, hint, children }: {
  readonly label: string
  readonly hint?: string
  readonly children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-text-faint">{hint}</span>}
    </label>
  )
}

function Metric({ label, value, detail, positive }: {
  readonly label: string
  readonly value: string
  readonly detail?: string
  readonly positive?: boolean
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-text-faint">{label}</p>
      <p className={`mt-2 text-lg font-semibold tabular ${positive === undefined ? 'text-text' : positive ? 'text-positive' : 'text-negative'}`}>
        {value}
      </p>
      {detail && <p className="mt-1 text-[11px] text-text-faint">{detail}</p>}
    </article>
  )
}

function numberFrom(value: string, maximum = 1_000_000_000): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, parsed)) : 0
}

function formatSilver(value: number): string {
  return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)} plata`
}

function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits }).format(value)
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}

export function RefiningMultilevelPlanner({ repository }: RefiningMultilevelPlannerProps) {
  const [resourceKind, setResourceKind] = useState<RefiningResourceKind>('ore')
  const [targetTier, setTargetTier] = useState<RefiningTier>(8)
  const [enchantment, setEnchantment] = useState<RefiningEnchantment>(0)
  const [quantity, setQuantity] = useState(100)
  const [useFocus, setUseFocus] = useState(true)
  const [isPremium, setIsPremium] = useState(true)
  const [silverPerFocus, setSilverPerFocus] = useState(0)
  const [transportCostPerLeg, setTransportCostPerLeg] = useState(0)
  const [stationAccessType, setStationAccessType] = useState<StationAccessType>('user')
  const [userFeePer100, setUserFeePer100] = useState(500)
  const [associateFeePer100, setAssociateFeePer100] = useState(0)
  const [levels, setLevels] = useState<SpecializationLevels>(DEFAULT_LEVELS)

  const config = useMarketDataStore((state) => state.config)
  const markets = useMarketDataStore((state) => state.markets)
  const snapshots = useMarketDataStore((state) => state.snapshots)
  const status = useMarketDataStore((state) => state.status)
  const error = useMarketDataStore((state) => state.error)
  const refreshWarnings = useMarketDataStore((state) => state.refreshWarnings)
  const refreshProgress = useMarketDataStore((state) => state.refreshProgress)
  const loadMarkets = useMarketDataStore((state) => state.loadMarkets)
  const refreshPrices = useMarketDataStore((state) => state.refreshPrices)
  const setMarketConfig = useMarketDataStore((state) => state.setConfig)

  const resource = getRefiningResource(resourceKind)
  const normalizedEnchantment = normalizeRefiningEnchantment(
    resource,
    targetTier,
    enchantment,
  )
  const chainTiers = useMemo(
    () => TIERS.filter((tier): tier is SpecializationTier => tier <= targetTier),
    [targetTier],
  )
  const recipes = useMemo(
    () => chainTiers.map((tier) => getRefiningRecipe({
      resourceKind,
      tier,
      enchantment: normalizedEnchantment,
    })),
    [chainTiers, normalizedEnchantment, resourceKind],
  )
  const targets = useMemo<readonly MarketPriceTarget[]>(() => {
    const unique = new Map<string, MarketPriceTarget>()
    for (const recipe of recipes) {
      const candidates = [
        { itemId: recipe.rawItemId, enchantment: recipe.rawEnchantment },
        { itemId: recipe.outputItemId, enchantment: recipe.outputEnchantment },
        ...(recipe.tier === 4 && recipe.previousRefinedItemId
          ? [{
              itemId: recipe.previousRefinedItemId,
              enchantment: recipe.previousRefinedEnchantment,
            }]
          : []),
      ]
      for (const target of candidates) {
        unique.set(buildItemPriceKey(target.itemId, target.enchantment), target)
      }
    }
    return Array.from(unique.values())
  }, [recipes])
  const rootKey = `refining-multilevel:${config.server}:${resourceKind}:T${targetTier}.${normalizedEnchantment}`

  useEffect(() => {
    void loadMarkets().catch(() => undefined)
  }, [loadMarkets])

  useEffect(() => {
    void refreshPrices({
      rootKey,
      materialTargets: targets,
      saleTarget: null,
      origin: 'automatic',
    })
  }, [refreshPrices, rootKey, targets])

  const loadedCities = useMemo(
    () => markets
      .filter((market) =>
        market.enabled &&
        market.type === 'regular' &&
        REFINING_CITIES.includes(market.key as RefiningCityId),
      )
      .map((market) => market.key as RefiningCityId),
    [markets],
  )
  const cities = loadedCities.length > 0 ? loadedCities : REFINING_CITIES
  const stationFeeConfig = useMemo(() => ({
    accessType: stationAccessType,
    userFeePer100Nutrition: userFeePer100,
    associateFeePer100Nutrition: associateFeePer100,
  }), [associateFeePer100, stationAccessType, userFeePer100])
  const focusEfficiency = useMemo(() => new Map<RefiningTier, number>(
    TIERS.map((tier) => [
      tier,
      calculateRefiningFocusCostEfficiency({
        selectedTierLevel: levels[tier],
        otherTierLevelsTotal: TIERS.reduce(
          (total, otherTier) => otherTier === tier ? total : total + levels[otherTier],
          0,
        ),
      }),
    ]),
  ), [levels])
  const focusedTiers = useMemo(
    () => new Set<RefiningTier>(useFocus ? chainTiers : []),
    [chainTiers, useFocus],
  )
  const resolvePrice = useCallback<RefiningPlannerPriceResolver>((request) => {
    const snapshot = snapshots.get(buildMarketCacheKey(
      config.server,
      request.city,
      buildMarketItemIdentifier(request.itemId, request.enchantment),
      MATERIAL_MARKET_QUALITY,
    ))
    return request.operation === 'purchase'
      ? resolvePurchasePrice(snapshot, config.purchaseStrategy)
      : resolveSalePrice(snapshot, config.saleStrategy)
  }, [config.purchaseStrategy, config.saleStrategy, config.server, snapshots])
  const ranking = useMemo(() => rankRefiningMultilevelRoutes({
    resource,
    targetTier,
    enchantment: normalizedEnchantment,
    requestedOutputQuantity: quantity,
    cities,
    focusedTiers,
    focusCostEfficiencyByTier: focusEfficiency,
    silverPerFocus,
    stationFeeConfig,
    isPremium,
    transportCostPerLeg,
    resolvePrice,
  }), [
    cities,
    focusEfficiency,
    focusedTiers,
    isPremium,
    normalizedEnchantment,
    quantity,
    resolvePrice,
    resource,
    silverPerFocus,
    stationFeeConfig,
    targetTier,
    transportCostPerLeg,
  ])
  const best = ranking.bestRoute
  const focusRanking = useMemo(
    () => [...(best?.steps ?? [])].sort(
      (left, right) => right.silverPerFocusProduced - left.silverPerFocusProduced,
    ),
    [best],
  )
  const outputName = best
    ? repository.getById(best.finalOutputItemId)?.name ?? String(best.finalOutputItemId)
    : resource.refinedLabel

  function changeResource(next: RefiningResourceKind) {
    const nextResource = getRefiningResource(next)
    setResourceKind(next)
    setEnchantment((current) =>
      normalizeRefiningEnchantment(nextResource, targetTier, current),
    )
  }

  function changeTier(next: RefiningTier) {
    setTargetTier(next)
    setEnchantment((current) =>
      normalizeRefiningEnchantment(resource, next, current),
    )
  }

  function refreshAll() {
    void refreshPrices({
      rootKey,
      materialTargets: targets,
      saleTarget: null,
      force: true,
      origin: 'manual',
    })
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] space-y-5 px-5 pb-14 pt-2 sm:px-6">
      <section className="rounded-2xl border border-accent-border bg-accent-muted/25 p-5 sm:p-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          Planificador avanzado T4→T8
        </p>
        <h2 className="mt-2 font-display text-2xl text-text sm:text-3xl">
          Compara compra, refinamiento y venta entre todas las ciudades
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-text-muted">
          Reutiliza el retorno de cada tier para alimentar el siguiente, calcula el
          capital real, permite comprar y vender en ciudades distintas y ordena las
          rutas por beneficio neto y plata por foco.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface/86 p-5 sm:p-6">
        <h3 className="font-display text-xl text-text">Configuración multinivel</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Recurso">
            <select value={resourceKind} onChange={(event) => changeResource(event.target.value as RefiningResourceKind)} className={INPUT}>
              {REFINING_RESOURCES.map((candidate) => (
                <option key={candidate.kind} value={candidate.kind}>{candidate.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Tier final" hint="La cadena comienza en T4.">
            <select value={targetTier} onChange={(event) => changeTier(Number(event.target.value) as RefiningTier)} className={INPUT}>
              {TIERS.map((tier) => <option key={tier} value={tier}>T{tier}</option>)}
            </select>
          </Field>
          <Field label="Encantamiento">
            <select value={normalizedEnchantment} onChange={(event) => setEnchantment(Number(event.target.value) as RefiningEnchantment)} className={INPUT}>
              {REFINING_ENCHANTMENTS
                .filter((candidate) => candidate <= getMaximumRefiningEnchantment(resource, targetTier))
                .map((candidate) => <option key={candidate} value={candidate}>.{candidate}</option>)}
            </select>
          </Field>
          <Field label="Cantidad final">
            <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.floor(numberFrom(event.target.value, 1_000_000))))} className={INPUT} />
          </Field>
          <Field label="Servidor">
            <select value={config.server} onChange={(event) => setMarketConfig({ server: event.target.value as AlbionServer })} className={INPUT}>
              {Object.entries(MARKET_SERVER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Compra">
            <select value={config.purchaseStrategy} onChange={(event) => setMarketConfig({ purchaseStrategy: event.target.value as PurchaseStrategy })} className={INPUT}>
              {Object.entries(PURCHASE_STRATEGY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Venta">
            <select value={config.saleStrategy} onChange={(event) => setMarketConfig({ saleStrategy: event.target.value as SaleStrategy })} className={INPUT}>
              {Object.entries(SALE_STRATEGY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Premium">
            <select value={isPremium ? 'yes' : 'no'} onChange={(event) => setIsPremium(event.target.value === 'yes')} className={INPUT}>
              <option value="yes">Sí · impuesto 4%</option>
              <option value="no">No · impuesto 8%</option>
            </select>
          </Field>
          <Field label="Foco">
            <select value={useFocus ? 'all' : 'none'} onChange={(event) => setUseFocus(event.target.value === 'all')} className={INPUT}>
              <option value="all">Toda la cadena</option>
              <option value="none">Sin foco</option>
            </select>
          </Field>
          <Field label="Valor por foco" hint="Costo de oportunidad descontado del beneficio.">
            <input type="number" min="0" value={silverPerFocus} onChange={(event) => setSilverPerFocus(numberFrom(event.target.value))} className={INPUT} />
          </Field>
          <Field label="Transporte por tramo">
            <input type="number" min="0" value={transportCostPerLeg} onChange={(event) => setTransportCostPerLeg(numberFrom(event.target.value))} className={INPUT} />
          </Field>
          <Field label="Acceso a estación">
            <select value={stationAccessType} onChange={(event) => setStationAccessType(event.target.value as StationAccessType)} className={INPUT}>
              <option value="user">Usuario</option>
              <option value="associate">Asociado</option>
              <option value="free">Gratis / propia</option>
            </select>
          </Field>
          <Field label="Tarifa usuario / 100">
            <input type="number" min="0" disabled={stationAccessType !== 'user'} value={userFeePer100} onChange={(event) => setUserFeePer100(numberFrom(event.target.value))} className={INPUT} />
          </Field>
          <Field label="Tarifa asociado / 100">
            <input type="number" min="0" disabled={stationAccessType !== 'associate'} value={associateFeePer100} onChange={(event) => setAssociateFeePer100(numberFrom(event.target.value))} className={INPUT} />
          </Field>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface-raised p-4">
          <p className="text-xs font-semibold text-text">Especialización por tier</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TIERS.map((tier) => (
              <Field key={tier} label={`T${tier}`}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={levels[tier]}
                  onChange={(event) => setLevels((current) => ({
                    ...current,
                    [tier]: Math.floor(numberFrom(event.target.value, 100)),
                  }))}
                  className={INPUT}
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-text-muted" aria-live="polite">
              {status === 'loading'
                ? `Consultando ${refreshProgress?.totalCombinations ?? targets.length * cities.length} combinaciones…`
                : error ?? `${targets.length} ítems comparados en ${cities.length} ciudades.`}
            </p>
            {refreshWarnings.length > 0 && <p className="mt-1 text-[11px] text-warning">{refreshWarnings.join(' · ')}</p>}
          </div>
          <button type="button" onClick={refreshAll} disabled={status === 'loading'} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:border-accent-border hover:text-accent disabled:opacity-50">
            {status === 'loading' ? 'Actualizando…' : 'Actualizar todas las ciudades'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface/86 p-5 sm:p-6">
        <h3 className="font-display text-xl text-text">Mejor ruta automática</h3>
        {best ? (
          <>
            <p className="mt-3 text-xl font-semibold text-accent">
              {REFINING_CITY_LABELS[best.purchaseCity]} → {REFINING_CITY_LABELS[best.refiningCity]} → {REFINING_CITY_LABELS[best.saleCity]}
            </p>
            <p className="mt-1 text-xs text-text-faint">Compra → refinamiento → venta de {outputName}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Beneficio ajustado" value={formatSilver(best.profitAfterFocusOpportunityCost)} positive={best.profitAfterFocusOpportunityCost >= 0} />
              <Metric label="ROI" value={formatPercent(best.roiOnInitialInvestment)} positive={best.roiOnInitialInvestment >= 0} />
              <Metric label="Capital inicial" value={formatSilver(best.initialInvestment)} detail={`Costo efectivo: ${formatSilver(best.effectiveProductionCost)}`} />
              <Metric label="Foco" value={formatNumber(best.totalFocusRequired, 0)} detail={`${formatNumber(best.silverPerFocusProduced)} plata/foco`} />
              <Metric label="Retorno valorizado" value={formatSilver(best.recoveredExternalMaterialValue)} />
              <Metric label="Transporte" value={formatSilver(best.transportCost)} detail={`${best.transportLegs} tramo(s)`} />
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-xl border border-warning/40 bg-warning-muted p-4 text-sm text-warning">
            {status === 'loading' ? 'Esperando precios suficientes.' : 'No hay una ruta completa con los datos disponibles.'}
          </p>
        )}
      </section>

      {best && (
        <section className="rounded-2xl border border-border bg-surface/86 p-5 sm:p-6">
          <h3 className="font-display text-xl text-text">Planificación completa multinivel</h3>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.1em] text-text-faint">
                <tr>
                  <th className="px-3 py-3">Tier</th><th className="px-3 py-3">Producción</th><th className="px-3 py-3">Crudo bruto</th><th className="px-3 py-3">Crudo neto</th><th className="px-3 py-3">Previo neto</th><th className="px-3 py-3">RRR</th><th className="px-3 py-3">Foco</th><th className="px-3 py-3">Plata/foco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {best.steps.map((step) => (
                  <tr key={step.tier}>
                    <td className="px-3 py-3 font-semibold text-accent">T{step.tier}.{step.enchantment}</td>
                    <td className="px-3 py-3 tabular text-text">{formatNumber(step.productionObtained)}</td>
                    <td className="px-3 py-3 tabular text-text-muted">{formatNumber(step.grossRawRequired)}</td>
                    <td className="px-3 py-3 tabular text-text-muted">{formatNumber(step.netRawConsumed)}</td>
                    <td className="px-3 py-3 tabular text-text-muted">{formatNumber(step.netPreviousRefinedConsumed)}</td>
                    <td className="px-3 py-3 tabular text-text-muted">{formatPercent(step.returnRate)}</td>
                    <td className="px-3 py-3 tabular text-text-muted">{step.useFocus ? formatNumber(step.totalFocusRequired, 0) : 'Sin foco'}</td>
                    <td className="px-3 py-3 tabular text-text-muted">{formatNumber(step.silverPerFocusProduced)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="text-xs font-semibold text-text">Lista de compra externa</p>
              <div className="mt-3 space-y-2">
                {best.purchases.map((line) => (
                  <div key={`${line.kind}:${line.tier}:${line.itemId}`} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="text-xs text-text">{repository.getById(line.itemId)?.name ?? String(line.itemId)}</p>
                      <p className="text-[10px] text-text-faint">Neto {formatNumber(line.netQuantity)} · bruto {formatNumber(line.grossQuantity)}</p>
                    </div>
                    <p className="text-xs font-semibold tabular text-text">{formatSilver(line.netCost)}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-xl border border-border bg-surface-raised p-4">
              <p className="text-xs font-semibold text-text">Ranking por plata por foco</p>
              <div className="mt-3 space-y-2">
                {focusRanking.map((step, index) => (
                  <div key={step.tier} className="flex justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-2">
                    <span className="text-xs text-text">#{index + 1} · T{step.tier}.{step.enchantment}</span>
                    <span className="text-xs font-semibold tabular text-accent">{formatNumber(step.silverPerFocusProduced)} plata/foco</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface/86 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="font-display text-xl text-text">Top 10 rutas por beneficio neto</h3>
          <p className="text-xs text-text-faint">{ranking.completeRoutes.length} completas · {ranking.missingRouteCount} con datos faltantes</p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.1em] text-text-faint">
              <tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Compra</th><th className="px-3 py-3">Refina</th><th className="px-3 py-3">Vende</th><th className="px-3 py-3">Beneficio</th><th className="px-3 py-3">ROI</th><th className="px-3 py-3">Plata/foco</th></tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {ranking.completeRoutes.slice(0, 10).map((route, index) => (
                <tr key={`${route.purchaseCity}:${route.refiningCity}:${route.saleCity}`} className={index === 0 ? 'bg-accent-muted/20' : undefined}>
                  <td className="px-3 py-3 font-semibold text-accent">{index + 1}</td>
                  <td className="px-3 py-3 text-text">{REFINING_CITY_LABELS[route.purchaseCity]}</td>
                  <td className="px-3 py-3 text-text">{REFINING_CITY_LABELS[route.refiningCity]}</td>
                  <td className="px-3 py-3 text-text">{REFINING_CITY_LABELS[route.saleCity]}</td>
                  <td className={`px-3 py-3 font-semibold tabular ${route.profitAfterFocusOpportunityCost >= 0 ? 'text-positive' : 'text-negative'}`}>{formatSilver(route.profitAfterFocusOpportunityCost)}</td>
                  <td className="px-3 py-3 tabular text-text-muted">{formatPercent(route.roiOnInitialInvestment)}</td>
                  <td className="px-3 py-3 tabular text-text-muted">{formatNumber(route.silverPerFocusProduced)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rounded-xl border border-border bg-surface-raised p-4 text-xs leading-relaxed text-text-faint">
        Los retornos son valores esperados y se reutilizan entre tandas. En lotes pequeños,
        el redondeo real puede exigir inventario adicional. El ranking no obliga a comprar,
        refinar y vender en la misma ciudad.
      </p>
    </div>
  )
}
