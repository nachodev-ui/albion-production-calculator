import { useState } from 'react'
import { InfoHint } from '@shared/components/InfoHint'
import { MarketPriceFreshnessStatus } from '@features/market-data/components/MarketPriceFreshnessStatus'
import { MarketRefreshItemFeedback } from '@features/market-data/components/MarketRefreshFeedback'
import type { MarketRefreshItemReport } from '@features/market-data/types/MarketRefresh'
import { PROFIT_SUMMARY_INFO } from '../content/craftInfoDescriptions'
import { calculateCraftEconomicSummary } from '../utils/profitCalculations'
import type {
  MarketCityId,
  MarketConfig,
  MarketDataSource,
  MarketDefinition,
  MarketQuality,
  MarketRequestStatus,
  SaleStrategy,
} from '@features/market-data/types/MarketPrice'
import {
  MARKET_QUALITIES,
  MARKET_QUALITY_LABELS,
  SALE_STRATEGY_LABELS,
  getMarketName,
} from '@features/market-data/types/MarketPrice'

interface ProfitSummaryCardProps {
  readonly totalCost: number
  readonly recoveredMaterialValue: number
  readonly quantity: number
  readonly isCalculationComplete: boolean
  readonly isPremium: boolean
  readonly onPremiumChange: (isPremium: boolean) => void
  readonly unitSellPrice: number | null
  readonly automaticUnitSellPrice: number | null
  readonly isManualSellPrice: boolean
  readonly automaticPriceLabel: string
  readonly automaticPriceUpdatedAt: string | null
  readonly automaticPriceSource: MarketDataSource | null
  readonly marketStatus: MarketRequestStatus
  readonly refreshResult: MarketRefreshItemReport | null
  readonly marketConfig: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly onMarketConfigChange: (patch: Partial<MarketConfig>) => void
  readonly onUnitSellPriceChange: (price: number | null) => void
  readonly onUseAutomaticSellPrice: () => void
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercentage(rate: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(rate)
}

export function ProfitSummaryCard({
  totalCost,
  recoveredMaterialValue,
  quantity,
  isCalculationComplete,
  isPremium,
  onPremiumChange,
  unitSellPrice,
  automaticUnitSellPrice,
  isManualSellPrice,
  automaticPriceLabel,
  automaticPriceUpdatedAt,
  automaticPriceSource,
  marketStatus,
  refreshResult,
  marketConfig,
  markets,
  onMarketConfigChange,
  onUnitSellPriceChange,
  onUseAutomaticSellPrice,
}: ProfitSummaryCardProps) {
  const [sellPriceText, setSellPriceText] = useState(
    unitSellPrice !== null ? String(unitSellPrice) : '',
  )

  const normalizedUnitSellPrice = unitSellPrice ?? 0
  const hasSellPrice = normalizedUnitSellPrice > 0
  const canShowEconomicResult = hasSellPrice && isCalculationComplete

  const {
    initialInvestment,
    cashResult,
    economicResult,
    cashProfitability,
    economicProfitability,
    cashBreakdown: {
      taxRate,
      setupFeeRate,
      totalFeeRate,
      grossRevenue,
      taxAmount,
      setupFeeAmount,
      netRevenue,
      breakEvenUnitPrice,
      targetPrices,
    },
  } = calculateCraftEconomicSummary({
    totalCost,
    recoveredMaterialValue,
    quantity,
    unitSellPrice: normalizedUnitSellPrice,
    isPremium,
  })

  const priceDifference = normalizedUnitSellPrice - breakEvenUnitPrice

  const absolutePriceDifference = Math.abs(priceDifference)

  const isAboveBreakEven = canShowEconomicResult && priceDifference > 0

  const isBelowBreakEven = canShowEconomicResult && priceDifference < 0

  const isAtBreakEven = canShowEconomicResult && priceDifference === 0

  const cashResultClassName = !canShowEconomicResult
    ? 'text-text-faint'
    : cashResult >= 0
      ? 'text-positive'
      : 'text-negative'

  const economicResultClassName = !canShowEconomicResult
    ? 'text-text-faint'
    : economicResult >= 0
      ? 'text-positive'
      : 'text-negative'

  const comparisonClassName = !canShowEconomicResult
    ? 'text-text-faint'
    : isBelowBreakEven
      ? 'text-negative'
      : 'text-positive'

  function commitSellPrice() {
    const trimmed = sellPriceText.trim()

    if (trimmed === '') {
      onUnitSellPriceChange(null)
      return
    }

    const next = Number(trimmed.replace(',', '.'))

    if (!Number.isFinite(next) || next < 0) {
      setSellPriceText(unitSellPrice !== null ? String(unitSellPrice) : '')
      return
    }

    const normalized = Math.floor(next)
    setSellPriceText(String(normalized))
    onUnitSellPriceChange(normalized)
  }

  function applyTargetPrice(unitPrice: number) {
    if (!isCalculationComplete || unitPrice <= 0) return

    setSellPriceText(String(unitPrice))
    onUnitSellPriceChange(unitPrice)
  }

  function getComparisonLabel(): string {
    if (!isCalculationComplete) {
      return 'Completa los precios'
    }

    if (!hasSellPrice) {
      return 'Ingresa un precio'
    }

    if (isAboveBreakEven) {
      return 'Sobre el mínimo'
    }

    if (isBelowBreakEven) {
      return 'Bajo el mínimo'
    }

    return 'Precio de equilibrio'
  }

  function getComparisonValue(): string {
    if (!isCalculationComplete || !hasSellPrice) {
      return '—'
    }

    if (isAtBreakEven) {
      return 'Sin diferencia'
    }

    return `${isAboveBreakEven ? '+' : '-'}${formatSilver(
      absolutePriceDifference,
    )} plata`
  }

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-text">
              Resumen de ganancia
            </h3>

            <InfoHint
              label="Resumen de ganancia"
              text={PROFIT_SUMMARY_INFO.section}
              align="left"
            />
          </div>

          <p className="mt-1 text-xs text-text-faint">
            Separa la plata disponible del valor que conservas en materiales
            retornados.
          </p>
        </div>

        {!isCalculationComplete ? (
          <span className="shrink-0 rounded-md border border-accent-border bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent">
            Cálculo incompleto
          </span>
        ) : hasSellPrice ? (
          <span
            className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium ${
              cashResult >= 0
                ? 'border-positive/40 bg-positive-muted text-positive'
                : economicResult >= 0
                  ? 'border-accent-border bg-accent-muted text-accent'
                  : 'border-border bg-surface text-negative'
            }`}
          >
            {cashResult > 0
              ? 'Ganancia en plata'
              : cashResult === 0
                ? 'Plata recuperada'
                : economicResult >= 0
                  ? 'Valor total positivo'
                  : 'Pérdida estimada'}
          </span>
        ) : null}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="min-w-0 xl:w-48">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              Configuración de venta
            </h4>
            <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
              Estos controles actualizan el precio y el resultado económico del
              producto terminado.
            </p>
          </div>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-text-faint">
              Vender en
            </span>
            <select
              value={marketConfig.saleCity}
              onChange={(event) =>
                onMarketConfigChange({
                  saleCity: event.target.value as MarketCityId,
                })
              }
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              {markets.map((market) => (
                <option key={market.key} value={market.key}>
                  {market.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-text-faint">
              Método de venta
            </span>
            <select
              value={marketConfig.saleStrategy}
              onChange={(event) =>
                onMarketConfigChange({
                  saleStrategy: event.target.value as SaleStrategy,
                })
              }
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              {(Object.keys(SALE_STRATEGY_LABELS) as SaleStrategy[]).map(
                (strategy) => (
                  <option key={strategy} value={strategy}>
                    {SALE_STRATEGY_LABELS[strategy]}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-text-faint">
              Calidad
            </span>
            <select
              value={marketConfig.quality}
              onChange={(event) =>
                onMarketConfigChange({
                  quality: Number(event.target.value) as MarketQuality,
                })
              }
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              {MARKET_QUALITIES.map((quality) => (
                <option key={quality} value={quality}>
                  {MARKET_QUALITY_LABELS[quality]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p
          className={`mt-3 border-t border-border pt-2 text-[11px] leading-relaxed ${
            marketStatus === 'loading' ? 'text-accent' : 'text-text-faint'
          }`}
          aria-live="polite"
        >
          {marketStatus === 'loading'
            ? `Consultando ${getMarketName(markets, marketConfig.saleCity)} · ${MARKET_QUALITY_LABELS[marketConfig.quality]}…`
            : isManualSellPrice
              ? `La referencia automática usa ${getMarketName(markets, marketConfig.saleCity)} · ${SALE_STRATEGY_LABELS[marketConfig.saleStrategy]} · ${MARKET_QUALITY_LABELS[marketConfig.quality]}; el precio manual conserva la prioridad.`
              : `Precio aplicado desde ${getMarketName(markets, marketConfig.saleCity)} · ${SALE_STRATEGY_LABELS[marketConfig.saleStrategy]} · ${MARKET_QUALITY_LABELS[marketConfig.quality]}.`}
        </p>
      </div>

      {!isCalculationComplete && (
        <div className="mb-4 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
          Puedes ingresar el precio de venta y revisar las comisiones, pero el
          precio mínimo, el resultado y la rentabilidad quedarán pendientes
          hasta completar todos los precios de los materiales.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuración y punto de equilibrio */}
        <div className="rounded-lg border border-border bg-surface p-3">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Precio y comisiones
          </h4>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <label
                    htmlFor="unit-sell-price"
                    className="text-sm text-text-muted"
                  >
                    Precio de venta unitario
                  </label>

                  <InfoHint
                    label="Precio de venta unitario"
                    text={PROFIT_SUMMARY_INFO.unitSellPrice}
                    align="left"
                  />
                </div>

                <input
                  id="unit-sell-price"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={sellPriceText}
                  onChange={(event) => setSellPriceText(event.target.value)}
                  onBlur={commitSellPrice}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur()
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault()
                      setSellPriceText(
                        unitSellPrice !== null ? String(unitSellPrice) : '',
                      )
                    }
                  }}
                  className="w-32 shrink-0 rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </div>

              <div className="mt-1 flex min-h-4 justify-end text-[11px]">
                {isManualSellPrice ? (
                  automaticUnitSellPrice !== null ? (
                    <button
                      type="button"
                      onClick={onUseAutomaticSellPrice}
                      className="text-accent underline decoration-accent/40 underline-offset-2 hover:text-text"
                    >
                      Usar precio automático (
                      {formatSilver(automaticUnitSellPrice)})
                    </button>
                  ) : (
                    <span className="text-text-faint">Precio manual</span>
                  )
                ) : automaticUnitSellPrice !== null ? (
                  <span className="text-positive">
                    Precio automático · {automaticPriceLabel}
                  </span>
                ) : marketStatus === 'loading' ? (
                  <span className="text-text-faint">
                    Consultando fuentes de mercado…
                  </span>
                ) : (
                  <span className="text-text-faint">
                    Sin precio automático disponible
                  </span>
                )}
              </div>

              <div className="mt-2">
                <MarketRefreshItemFeedback
                  result={marketStatus === 'loading' ? null : refreshResult}
                  isManualOverride={isManualSellPrice}
                />
              </div>

              {(marketStatus !== 'loading' ||
                automaticUnitSellPrice !== null) && (
                <div className="mt-2">
                  <MarketPriceFreshnessStatus
                    updatedAt={
                      automaticUnitSellPrice !== null
                        ? automaticPriceUpdatedAt
                        : null
                    }
                    source={
                      automaticUnitSellPrice !== null
                        ? automaticPriceSource
                        : null
                    }
                    isActive={
                      automaticUnitSellPrice !== null && !isManualSellPrice
                    }
                  />
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <img
                  src="/assets/ui/premium-crown.png"
                  alt=""
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 object-contain transition-all ${
                    isPremium ? '' : 'grayscale opacity-40'
                  }`}
                />

                <span className="text-sm text-text-muted">Cuenta Premium</span>

                <InfoHint
                  label="Cuenta Premium"
                  text={PROFIT_SUMMARY_INFO.premium}
                  align="left"
                />
              </div>

              <input
                type="checkbox"
                checked={isPremium}
                onChange={(event) => onPremiumChange(event.target.checked)}
                className="shrink-0 accent-accent"
              />
            </label>

            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-text-faint">Comisiones totales</span>

                <InfoHint
                  label="Comisiones totales"
                  text={PROFIT_SUMMARY_INFO.totalFees}
                  align="left"
                />
              </div>

              <span className="shrink-0 font-mono tabular text-text">
                {formatPercentage(totalFeeRate)}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-sm font-medium text-text">
                  Precio mínimo por unidad
                </span>

                <InfoHint
                  label="Precio mínimo por unidad"
                  text={PROFIT_SUMMARY_INFO.breakEvenPrice}
                  align="left"
                />
              </div>

              <span className="shrink-0 text-base font-semibold tabular text-accent">
                {isCalculationComplete
                  ? `${formatSilver(breakEvenUnitPrice)} plata`
                  : 'Pendiente'}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  {getComparisonLabel()}
                </span>

                <InfoHint
                  label="Comparación con el precio mínimo"
                  text={PROFIT_SUMMARY_INFO.priceComparison}
                  align="left"
                />
              </div>

              <span
                className={`shrink-0 text-xs font-medium tabular ${comparisonClassName}`}
              >
                {getComparisonValue()}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3">
            <div className="flex items-center gap-1.5">
              <h5 className="text-sm font-medium text-text">
                Precios objetivo
              </h5>

              <InfoHint
                label="Precios objetivo"
                text={PROFIT_SUMMARY_INFO.targetPrices}
                align="left"
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {targetPrices.map(({ target, unitPrice }) => {
                const isSelected =
                  isCalculationComplete && normalizedUnitSellPrice === unitPrice
                const isReached =
                  canShowEconomicResult && normalizedUnitSellPrice >= unitPrice

                return (
                  <button
                    key={target}
                    type="button"
                    disabled={!isCalculationComplete}
                    onClick={() => applyTargetPrice(unitPrice)}
                    aria-label={`Usar precio para obtener ${formatPercentage(target)} de rentabilidad`}
                    className={`min-w-0 rounded-lg border px-2 py-2 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      isSelected
                        ? 'border-accent-border bg-accent-muted'
                        : isReached
                          ? 'border-positive bg-positive-muted'
                          : 'border-border bg-surface hover:border-border-strong hover:bg-surface-raised'
                    }`}
                  >
                    <span
                      className={`block text-xs font-semibold ${
                        isReached ? 'text-positive' : 'text-text-muted'
                      }`}
                    >
                      +{formatPercentage(target)}
                    </span>

                    <span className="mt-1 block truncate text-sm font-semibold tabular text-text">
                      {isCalculationComplete ? formatSilver(unitPrice) : '—'}
                    </span>

                    <span className="block text-[10px] text-text-faint">
                      plata c/u
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-text-faint">
              Presiona un objetivo para copiar su precio al campo de venta.
            </p>
          </div>
        </div>

        {/* Resultado económico */}
        <div
          className="rounded-lg border border-border bg-surface p-3"
          aria-live="polite"
        >
          <div className="mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              Resultado económico
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
              El resultado en plata no cuenta los materiales devueltos. El
              resultado económico total sí suma su valor reutilizable.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">Venta bruta</span>

                <InfoHint
                  label="Venta bruta"
                  text={PROFIT_SUMMARY_INFO.grossRevenue}
                  align="left"
                />
              </div>

              <p className="mt-1 text-sm font-medium tabular text-text">
                {hasSellPrice ? `${formatSilver(grossRevenue)} plata` : '—'}
              </p>
            </div>

            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">Venta neta</span>

                <InfoHint
                  label="Venta neta"
                  text={PROFIT_SUMMARY_INFO.netRevenue}
                  align="right"
                />
              </div>

              <p className="mt-1 text-sm font-medium tabular text-text">
                {hasSellPrice ? `${formatSilver(netRevenue)} plata` : '—'}
              </p>
            </div>

            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  {isCalculationComplete
                    ? 'Inversión inicial'
                    : 'Inversión parcial'}
                </span>

                <InfoHint
                  label={
                    isCalculationComplete
                      ? 'Inversión inicial'
                      : 'Inversión parcial'
                  }
                  text={
                    isCalculationComplete
                      ? PROFIT_SUMMARY_INFO.initialInvestment
                      : 'Suma provisional de materiales, componentes y tarifas con precio disponible. Todavía puede aumentar.'
                  }
                  align="left"
                />
              </div>

              <p
                className={`mt-1 text-sm font-medium tabular ${
                  isCalculationComplete ? 'text-text' : 'text-accent'
                }`}
              >
                {formatSilver(initialInvestment)} plata
              </p>
              <p className="mt-1 text-[10px] text-text-faint">
                Antes de recibir retornos
              </p>
            </div>

            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  Resultado en plata
                </span>

                <InfoHint
                  label="Resultado en plata"
                  text={PROFIT_SUMMARY_INFO.cashResult}
                  align="right"
                />
              </div>

              <p
                className={`mt-1 text-sm font-semibold tabular ${cashResultClassName}`}
              >
                {canShowEconomicResult
                  ? `${cashResult > 0 ? '+' : ''}${formatSilver(cashResult)} plata`
                  : '—'}
              </p>
              <p className="mt-1 text-[10px] text-text-faint">
                Plata líquida de esta operación
              </p>
            </div>

            <div className="rounded-lg border border-accent-border/60 bg-accent-muted/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-accent">Valor recuperado</span>

                <InfoHint
                  label="Valor recuperado"
                  text={PROFIT_SUMMARY_INFO.recoveredValue}
                  align="left"
                />
              </div>

              <p className="mt-1 text-sm font-semibold tabular text-accent">
                {isCalculationComplete
                  ? `+${formatSilver(recoveredMaterialValue)} plata`
                  : '—'}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
                Inventario reutilizable, no plata disponible
              </p>
            </div>

            <div className="rounded-lg border border-positive/40 bg-positive-muted/40 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  Resultado económico total
                </span>

                <InfoHint
                  label="Resultado económico total"
                  text={PROFIT_SUMMARY_INFO.economicResult}
                  align="right"
                />
              </div>

              <p
                className={`mt-1 text-sm font-semibold tabular ${economicResultClassName}`}
              >
                {canShowEconomicResult
                  ? `${economicResult > 0 ? '+' : ''}${formatSilver(economicResult)} plata`
                  : '—'}
              </p>
              <p className="mt-1 text-[10px] text-text-faint">
                Resultado en plata + retornos
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-text-faint">
                  Tax de venta ({formatPercentage(taxRate)})
                </span>

                <InfoHint
                  label="Tax de venta"
                  text={PROFIT_SUMMARY_INFO.marketTax}
                  align="left"
                />
              </div>

              <span className="shrink-0 tabular text-negative">
                {hasSellPrice ? `-${formatSilver(taxAmount)} plata` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-text-faint">
                  Setup Fee ({formatPercentage(setupFeeRate)})
                </span>

                <InfoHint
                  label="Setup Fee"
                  text={PROFIT_SUMMARY_INFO.setupFee}
                  align="left"
                />
              </div>

              <span className="shrink-0 tabular text-negative">
                {hasSellPrice ? `-${formatSilver(setupFeeAmount)} plata` : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="font-medium text-text">
                  Rentabilidad en plata
                </span>

                <InfoHint
                  label="Rentabilidad en plata"
                  text={PROFIT_SUMMARY_INFO.cashProfitability}
                  align="left"
                />
              </div>

              <span
                className={`shrink-0 font-mono font-semibold tabular ${cashResultClassName}`}
              >
                {canShowEconomicResult
                  ? `${cashProfitability > 0 ? '+' : ''}${(
                      cashProfitability * 100
                    ).toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="font-medium text-text">
                  Rentabilidad económica total
                </span>

                <InfoHint
                  label="Rentabilidad económica total"
                  text={PROFIT_SUMMARY_INFO.economicProfitability}
                  align="left"
                />
              </div>

              <span
                className={`shrink-0 font-mono font-semibold tabular ${economicResultClassName}`}
              >
                {canShowEconomicResult
                  ? `${economicProfitability > 0 ? '+' : ''}${(
                      economicProfitability * 100
                    ).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
