import type { MarketHistoryRefreshProgress } from '@features/market-data/types/MarketHistory'
import type {
  MarketDefinition,
  MarketRequestStatus,
} from '@features/market-data/types/MarketPrice'
import { getMarketName } from '@features/market-data/types/MarketPrice'
import { getMarketCityTone } from '@features/market-data/presentation/marketCityPresentation'
import type { MarketLiquidityAssessment } from '@features/market-data/utils/marketLiquidity'
import { getMarketLiquidityReasonLabel } from '@features/market-data/utils/marketLiquidity'
import type {
  ProfitabilityMarketRecommendation,
  RejectedMarketCandidate,
} from '@features/market-data/utils/profitabilityOptimizer'

interface ProfitabilityOptimizerCardProps {
  readonly recommendation: ProfitabilityMarketRecommendation
  readonly markets: readonly MarketDefinition[]
  readonly marketStatus: MarketRequestStatus
  readonly liquidityStatus: MarketRequestStatus
  readonly liquidityError: string | null
  readonly liquidityProgress: MarketHistoryRefreshProgress | null
  readonly currentTotalCost: number
  readonly optimizedTotalCost: number
  readonly purchaseSavings: number | null
  readonly currentEconomicResult: number | null
  readonly optimizedEconomicResult: number | null
  readonly resultImprovement: number | null
  readonly isManualSellPrice: boolean
  readonly manualMaterialPriceCount: number
  readonly onApply: () => void
  readonly onRefreshLiquidity: () => void
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatQuantity(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 1,
  }).format(amount)
}

function formatSignedSilver(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${formatSilver(Math.abs(amount))}`
}

function formatEstimatedDays(days: number | null): string {
  if (days === null || !Number.isFinite(days)) return 'sin estimación'
  if (days < 0.1) return 'menos de 0,1 días'
  if (days < 1) return `${days.toFixed(1).replace('.', ',')} días`
  return `${Math.ceil(days)} días`
}

function CityBadge({
  city,
  markets,
}: {
  readonly city: string
  readonly markets: readonly MarketDefinition[]
}) {
  const tone = getMarketCityTone(city)

  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium"
      style={{
        color: tone.foreground,
        borderColor: tone.border,
        backgroundColor: tone.background,
      }}
    >
      {getMarketName(markets, city)}
    </span>
  )
}

function LiquidityBadge({
  assessment,
}: {
  readonly assessment: MarketLiquidityAssessment | null
}) {
  if (!assessment) {
    return (
      <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-faint">
        Sin historial
      </span>
    )
  }

  const isHigh = assessment.confidence === 'high'
  const isMedium = assessment.confidence === 'medium'

  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
        isHigh
          ? 'border-positive/40 bg-positive-muted text-positive'
          : isMedium
            ? 'border-accent-border bg-accent-muted text-accent'
            : 'border-negative/40 bg-negative-muted text-negative'
      }`}
    >
      {isHigh
        ? 'Confianza alta'
        : isMedium
          ? 'Confianza media'
          : 'No elegible'}
    </span>
  )
}

function LiquiditySummary({
  assessment,
}: {
  readonly assessment: MarketLiquidityAssessment | null
}) {
  if (!assessment) {
    return <span>Historial todavía no disponible.</span>
  }

  const usesHistoricalDateFallback = assessment.reasonCodes.includes(
    'stale-current-price',
  )

  return (
    <span>
      {formatQuantity(assessment.summary.averageDailyVolume)} u./día ·{' '}
      {assessment.summary.activeVolumeDays}/28 días activos · aprox.{' '}
      {formatEstimatedDays(assessment.estimatedDaysToFill)} para completar{' '}
      {formatQuantity(assessment.requiredQuantity)} u.
      {usesHistoricalDateFallback && (
        <> · fecha actual no verificable; validado con historial reciente</>
      )}
    </span>
  )
}

function RejectedCandidateNotice({
  candidate,
  markets,
  label,
}: {
  readonly candidate: RejectedMarketCandidate | null
  readonly markets: readonly MarketDefinition[]
  readonly label: string
}) {
  if (!candidate) return null

  const reasons = candidate.liquidity?.reasonCodes
    .map(getMarketLiquidityReasonLabel)
    .slice(0, 2)
    .join(' y ')

  return (
    <div className="rounded-md border border-negative/30 bg-negative-muted px-2.5 py-2 text-[10px] leading-relaxed text-negative">
      <span className="font-semibold">{label}:</span>{' '}
      {getMarketName(markets, candidate.city)} ·{' '}
      {formatSilver(candidate.unitPrice)} plata/u.
      {reasons ? ` · ${reasons}` : ' · historial insuficiente'}
    </div>
  )
}

export function ProfitabilityOptimizerCard({
  recommendation,
  markets,
  marketStatus,
  liquidityStatus,
  liquidityError,
  liquidityProgress,
  currentTotalCost,
  optimizedTotalCost,
  purchaseSavings,
  currentEconomicResult,
  optimizedEconomicResult,
  resultImprovement,
  isManualSellPrice,
  manualMaterialPriceCount,
  onApply,
  onRefreshLiquidity,
}: ProfitabilityOptimizerCardProps) {
  const isLoading =
    marketStatus === 'loading' || liquidityStatus === 'loading'
  const hasChanges =
    recommendation.materialChangeCount > 0 || recommendation.saleCityChanged
  const canApply = recommendation.isComplete && hasChanges && !isLoading
  const missingRecommendationText = (() => {
    const missing: string[] = []

    if (recommendation.missingMaterialCount > 0) {
      missing.push(
        `${recommendation.missingMaterialCount} ${
          recommendation.missingMaterialCount === 1 ? 'material' : 'materiales'
        } sin mercado viable`,
      )
    }

    if (recommendation.saleUnitPrice === null) {
      missing.push('una ciudad de venta con liquidez suficiente')
    }

    return missing.join(' y ')
  })()
  const currentSaleRejectedCandidate: RejectedMarketCandidate | null =
    recommendation.currentSaleUnitPrice !== null &&
    recommendation.currentSaleLiquidity !== null &&
    recommendation.currentSaleLiquidity.isEligibleForRecommendation === false
      ? {
          city: recommendation.currentSaleLiquidity.city,
          unitPrice: recommendation.currentSaleUnitPrice,
          liquidity: recommendation.currentSaleLiquidity,
        }
      : null
  const sortedMaterials = [...recommendation.materials].sort((left, right) => {
    if (left.cityChanged !== right.cityChanged) {
      return left.cityChanged ? -1 : 1
    }

    return left.label.localeCompare(right.label, 'es')
  })

  return (
    <section className="mt-4 rounded-xl border border-accent-border bg-surface-raised p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-text">
              Optimizador de rentabilidad
            </h3>
            <span className="rounded-md border border-accent-border bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Liquidez 28 días
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-faint">
            Compara precios actuales con ventas históricas, descarta valores atípicos y solo recomienda mercados con confianza alta o media para la cantidad configurada.
          </p>
        </div>

        <button
          type="button"
          disabled={!canApply}
          onClick={onApply}
          className="shrink-0 rounded-lg border border-accent-border bg-accent-muted px-3.5 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading
            ? 'Validando liquidez…'
            : recommendation.isComplete === false
              ? 'Sin combinación viable'
              : hasChanges
                ? 'Aplicar ciudades recomendadas'
                : 'Configuración ya óptima'}
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs text-accent">
          {marketStatus === 'loading'
            ? 'Actualizando precios en todos los mercados…'
            : `Consultando historial por candidato${
                liquidityProgress
                  ? ` (${liquidityProgress.completed}/${liquidityProgress.total})`
                  : '…'
              }`}
        </div>
      )}

      {liquidityError && liquidityStatus !== 'loading' && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-negative/30 bg-negative-muted px-3 py-2 text-xs text-negative sm:flex-row sm:items-center sm:justify-between">
          <span>{liquidityError}</span>
          <button
            type="button"
            onClick={onRefreshLiquidity}
            className="shrink-0 rounded border border-negative/40 px-2 py-1 font-semibold"
          >
            Reintentar historial
          </button>
        </div>
      )}

      {!recommendation.isComplete && !isLoading && (
        <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-text-muted">
          No existe todavía una combinación completamente viable: falta{' '}
          {missingRecommendationText || 'información histórica suficiente'}.
          Los precios teóricos descartados se muestran en el detalle, pero no se aplican automáticamente.
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Costo neto actual
          </p>
          <p className="mt-1 text-base font-semibold tabular text-text">
            {formatSilver(currentTotalCost)}
            <span className="ml-1 text-xs font-normal text-text-faint">plata</span>
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            Con ciudades seleccionadas
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Compra viable optimizada
          </p>
          <p className="mt-1 text-base font-semibold tabular text-text">
            {recommendation.missingMaterialCount === 0
              ? formatSilver(optimizedTotalCost)
              : '—'}
            {recommendation.missingMaterialCount === 0 && (
              <span className="ml-1 text-xs font-normal text-text-faint">plata</span>
            )}
          </p>
          <p className="mt-1 text-[10px] text-positive">
            {purchaseSavings === null
              ? 'Pendiente de mercados viables'
              : `${formatSignedSilver(purchaseSavings)} frente a la actual`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Resultado económico viable
          </p>
          <p
            className={`mt-1 text-base font-semibold tabular ${
              optimizedEconomicResult === null
                ? 'text-text-faint'
                : optimizedEconomicResult >= 0
                  ? 'text-positive'
                  : 'text-negative'
            }`}
          >
            {optimizedEconomicResult === null
              ? '—'
              : `${formatSignedSilver(optimizedEconomicResult)} plata`}
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            Después de comisiones y RRR
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Mejora viable total
          </p>
          <p
            className={`mt-1 text-base font-semibold tabular ${
              resultImprovement === null
                ? 'text-text-faint'
                : resultImprovement >= 0
                  ? 'text-positive'
                  : 'text-negative'
            }`}
          >
            {resultImprovement === null
              ? '—'
              : `${formatSignedSilver(resultImprovement)} plata`}
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            Resultado viable menos actual
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Mejor ciudad viable para vender
          </p>

          {recommendation.saleCity && recommendation.saleUnitPrice !== null ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CityBadge city={recommendation.saleCity} markets={markets} />
                <span className="text-sm font-semibold tabular text-text">
                  {formatSilver(recommendation.saleUnitPrice)} plata/u.
                </span>
                <LiquidityBadge assessment={recommendation.saleLiquidity} />
              </div>

              <p className="text-[11px] leading-relaxed text-text-faint">
                <LiquiditySummary assessment={recommendation.saleLiquidity} />
              </p>

              <p className="text-[11px] leading-relaxed text-text-faint">
                Actual:{' '}
                <span className="text-text-muted">
                  {recommendation.currentSaleUnitPrice === null
                    ? 'sin precio'
                    : `${formatSilver(recommendation.currentSaleUnitPrice)} plata/u.`}
                </span>{' '}
                · Resultado económico actual:{' '}
                <span
                  className={
                    currentEconomicResult === null
                      ? 'text-text-faint'
                      : currentEconomicResult >= 0
                        ? 'text-positive'
                        : 'text-negative'
                  }
                >
                  {currentEconomicResult === null
                    ? 'pendiente'
                    : `${formatSignedSilver(currentEconomicResult)} plata`}
                </span>
              </p>

              <RejectedCandidateNotice
                candidate={currentSaleRejectedCandidate}
                markets={markets}
                label="Ciudad de venta actual no elegible"
              />
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-text-faint">
                Ninguna ciudad posee un precio respaldado por historial suficiente y liquidez para vender esta cantidad.
              </p>
              <RejectedCandidateNotice
                candidate={
                  currentSaleRejectedCandidate ??
                  recommendation.theoreticalBestSale
                }
                markets={markets}
                label={
                  currentSaleRejectedCandidate
                    ? 'Ciudad de venta actual no elegible'
                    : 'Mejor precio teórico descartado'
                }
              />
            </div>
          )}
        </div>

        <details className="rounded-lg border border-border bg-surface p-3">
          <summary className="cursor-pointer list-none text-xs font-semibold text-text">
            <span className="flex items-center justify-between gap-3">
              <span>
                Ciudad viable más barata por material
                <span className="ml-2 font-normal text-text-faint">
                  {recommendation.materialChangeCount} cambios ·{' '}
                  {recommendation.excludedCandidateCount} candidatos descartados
                </span>
              </span>
              <span className="text-[10px] font-normal text-text-faint">
                Ver detalle
              </span>
            </span>
          </summary>

          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {sortedMaterials.map((material) => (
              <div
                key={material.itemPriceKey}
                className="rounded-md border border-border bg-surface-raised px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-medium text-text">
                    {material.label}{' '}
                    <span className="font-normal text-text-faint">
                      · {formatQuantity(material.requiredQuantity)} u. netas
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <LiquidityBadge assessment={material.liquidity} />
                    {material.cityChanged ? (
                      <span className="rounded border border-positive/40 bg-positive-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-positive">
                        Más barato viable
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase tracking-wide text-text-faint">
                        Sin cambio
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <CityBadge city={material.currentCity} markets={markets} />
                  <span className="tabular text-text-faint">
                    {material.currentUnitPrice === null
                      ? 'sin precio'
                      : formatSilver(material.currentUnitPrice)}
                  </span>
                  <span className="text-text-faint">→</span>
                  {material.recommendedCity ? (
                    <CityBadge city={material.recommendedCity} markets={markets} />
                  ) : (
                    <span className="text-text-faint">sin recomendación viable</span>
                  )}
                  <span className="tabular text-text-muted">
                    {material.recommendedUnitPrice === null
                      ? 'sin precio'
                      : formatSilver(material.recommendedUnitPrice)}
                  </span>
                </div>

                <p className="mt-2 text-[10px] leading-relaxed text-text-faint">
                  <LiquiditySummary assessment={material.liquidity} />
                </p>

                <div className="mt-2">
                  <RejectedCandidateNotice
                    candidate={
                      material.currentUnitPrice !== null &&
                      material.currentLiquidity !== null &&
                      material.currentLiquidity.isEligibleForRecommendation === false
                        ? {
                            city: material.currentCity,
                            unitPrice: material.currentUnitPrice,
                            liquidity: material.currentLiquidity,
                          }
                        : material.recommendedCity === null
                          ? material.theoreticalBest
                          : null
                    }
                    markets={markets}
                    label={
                      material.currentUnitPrice !== null &&
                      material.currentLiquidity !== null &&
                      material.currentLiquidity.isEligibleForRecommendation === false
                        ? 'Ciudad seleccionada no elegible'
                        : 'Precio mínimo teórico descartado'
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {(isManualSellPrice || manualMaterialPriceCount > 0) && (
        <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] leading-relaxed text-text-faint">
          {manualMaterialPriceCount > 0 && (
            <span>
              Los {manualMaterialPriceCount} precios manuales de materiales conservan su prioridad en el cálculo.{' '}
            </span>
          )}
          {isManualSellPrice && (
            <span>
              La proyección compara precios automáticos de venta; aplicar ciudades no elimina tu precio manual.
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-text-faint">
        La liquidez usa 28 días de ventas, mediana histórica, días activos y tiempo estimado para la cantidad neta. Sigue sin conocer la profundidad exacta de órdenes ni costos de transporte, por lo que la confianza es una estimación y no una garantía de ejecución.
      </p>
    </section>
  )
}
