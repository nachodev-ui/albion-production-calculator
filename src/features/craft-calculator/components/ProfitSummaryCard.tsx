import { InfoHint } from '@shared/components/InfoHint'
import { PROFIT_SUMMARY_INFO } from '../content/craftInfoDescriptions'
import { calculateProfitBreakdown } from '../utils/profitCalculations'

interface ProfitSummaryCardProps {
  readonly totalCost: number
  readonly quantity: number
  readonly isCalculationComplete: boolean
  readonly isPremium: boolean
  readonly onPremiumChange: (isPremium: boolean) => void
  readonly unitSellPrice: number | null
  readonly onUnitSellPriceChange: (price: number | null) => void
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
  quantity,
  isCalculationComplete,
  isPremium,
  onPremiumChange,
  unitSellPrice,
  onUnitSellPriceChange,
}: ProfitSummaryCardProps) {
  const normalizedUnitSellPrice = unitSellPrice ?? 0
  const hasSellPrice = normalizedUnitSellPrice > 0
  const canShowEconomicResult = hasSellPrice && isCalculationComplete

  const {
    taxRate,
    setupFeeRate,
    totalFeeRate,
    grossRevenue,
    taxAmount,
    setupFeeAmount,
    netRevenue,
    profit,
    profitability,
    breakEvenUnitPrice,
    targetPrices,
  } = calculateProfitBreakdown({
    totalCost,
    quantity,
    unitSellPrice: normalizedUnitSellPrice,
    isPremium,
  })

  const priceDifference =
    normalizedUnitSellPrice - breakEvenUnitPrice

  const absolutePriceDifference = Math.abs(priceDifference)

  const isAboveBreakEven =
    canShowEconomicResult && priceDifference > 0

  const isBelowBreakEven =
    canShowEconomicResult && priceDifference < 0

  const isAtBreakEven =
    canShowEconomicResult && priceDifference === 0

  const resultClassName = !canShowEconomicResult
    ? 'text-text-faint'
    : profit >= 0
      ? 'text-positive'
      : 'text-negative'

  const comparisonClassName = !canShowEconomicResult
    ? 'text-text-faint'
    : isBelowBreakEven
      ? 'text-negative'
      : 'text-positive'

  function handleSellPriceChange(rawValue: string) {
    if (rawValue === '') {
      onUnitSellPriceChange(null)
      return
    }

    const next = Number(rawValue)

    if (!Number.isFinite(next)) return

    onUnitSellPriceChange(Math.max(0, Math.floor(next)))
  }

  function applyTargetPrice(unitPrice: number) {
    if (!isCalculationComplete || unitPrice <= 0) return

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
            Calcula el precio mínimo y el resultado real después de comisiones.
          </p>
        </div>

        {!isCalculationComplete ? (
          <span className="shrink-0 rounded-md border border-accent-border bg-accent-muted px-2.5 py-1 text-xs font-medium text-accent">
            Cálculo incompleto
          </span>
        ) : hasSellPrice ? (
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
              isBelowBreakEven
                ? 'border border-border bg-surface text-negative'
                : 'bg-positive-muted text-positive'
            }`}
          >
            {isBelowBreakEven
              ? 'Pérdida estimada'
              : isAtBreakEven
                ? 'Sin pérdida'
                : 'Ganancia estimada'}
          </span>
        ) : null}
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
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="0"
                value={unitSellPrice ?? ''}
                onChange={(event) =>
                  handleSellPriceChange(event.target.value)
                }
                className="w-32 shrink-0 rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-sm text-text-muted">
                  Cuenta Premium
                </span>

                <InfoHint
                  label="Cuenta Premium"
                  text={PROFIT_SUMMARY_INFO.premium}
                  align="left"
                />
              </div>

              <input
                type="checkbox"
                checked={isPremium}
                onChange={(event) =>
                  onPremiumChange(event.target.checked)
                }
                className="shrink-0 accent-accent"
              />
            </label>

            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-text-faint">
                  Comisiones totales
                </span>

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
                      {isCalculationComplete
                        ? formatSilver(unitPrice)
                        : '—'}
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
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Resultado económico
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  Venta bruta
                </span>

                <InfoHint
                  label="Venta bruta"
                  text={PROFIT_SUMMARY_INFO.grossRevenue}
                  align="left"
                />
              </div>

              <p className="mt-1 text-sm font-medium tabular text-text">
                {hasSellPrice
                  ? `${formatSilver(grossRevenue)} plata`
                  : '—'}
              </p>
            </div>

            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  Venta neta
                </span>

                <InfoHint
                  label="Venta neta"
                  text={PROFIT_SUMMARY_INFO.netRevenue}
                  align="right"
                />
              </div>

              <p className="mt-1 text-sm font-medium tabular text-text">
                {hasSellPrice
                  ? `${formatSilver(netRevenue)} plata`
                  : '—'}
              </p>
            </div>

            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  {isCalculationComplete ? 'Costo neto' : 'Costo parcial'}
                </span>

                <InfoHint
                  label={isCalculationComplete ? 'Costo neto' : 'Costo parcial'}
                  text={
                    isCalculationComplete
                      ? PROFIT_SUMMARY_INFO.netCost
                      : 'Es la suma de los materiales que ya tienen precio. Todavía puede aumentar cuando completes los valores pendientes.'
                  }
                  align="left"
                />
              </div>

              <p
                className={`mt-1 text-sm font-medium tabular ${
                  isCalculationComplete ? 'text-text' : 'text-accent'
                }`}
              >
                {formatSilver(totalCost)} plata
              </p>
            </div>

            <div className="rounded-lg bg-surface-raised p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-faint">
                  Resultado
                </span>

                <InfoHint
                  label="Resultado"
                  text={PROFIT_SUMMARY_INFO.result}
                  align="right"
                />
              </div>

              <p className={`mt-1 text-sm font-semibold tabular ${resultClassName}`}>
                {canShowEconomicResult
                  ? `${profit > 0 ? '+' : ''}${formatSilver(profit)} plata`
                  : '—'}
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
                {hasSellPrice
                  ? `-${formatSilver(taxAmount)} plata`
                  : '—'}
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
                {hasSellPrice
                  ? `-${formatSilver(setupFeeAmount)} plata`
                  : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="font-medium text-text">
                  Rentabilidad sobre costo
                </span>

                <InfoHint
                  label="Rentabilidad sobre costo"
                  text={PROFIT_SUMMARY_INFO.profitability}
                  align="left"
                />
              </div>

              <span
                className={`shrink-0 font-mono font-semibold tabular ${resultClassName}`}
              >
                {canShowEconomicResult
                  ? `${profitability > 0 ? '+' : ''}${(
                      profitability * 100
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