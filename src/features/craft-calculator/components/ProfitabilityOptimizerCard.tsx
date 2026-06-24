import type { MarketDefinition, MarketRequestStatus } from '@features/market-data/types/MarketPrice'
import { getMarketName } from '@features/market-data/types/MarketPrice'
import { getMarketCityTone } from '@features/market-data/presentation/marketCityPresentation'
import type { ProfitabilityMarketRecommendation } from '@features/market-data/utils/profitabilityOptimizer'

interface ProfitabilityOptimizerCardProps {
  readonly recommendation: ProfitabilityMarketRecommendation
  readonly markets: readonly MarketDefinition[]
  readonly marketStatus: MarketRequestStatus
  readonly currentTotalCost: number
  readonly optimizedTotalCost: number
  readonly purchaseSavings: number | null
  readonly currentEconomicResult: number | null
  readonly optimizedEconomicResult: number | null
  readonly resultImprovement: number | null
  readonly isManualSellPrice: boolean
  readonly manualMaterialPriceCount: number
  readonly onApply: () => void
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatSignedSilver(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${formatSilver(Math.abs(amount))}`
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

export function ProfitabilityOptimizerCard({
  recommendation,
  markets,
  marketStatus,
  currentTotalCost,
  optimizedTotalCost,
  purchaseSavings,
  currentEconomicResult,
  optimizedEconomicResult,
  resultImprovement,
  isManualSellPrice,
  manualMaterialPriceCount,
  onApply,
}: ProfitabilityOptimizerCardProps) {
  const hasChanges =
    recommendation.materialChangeCount > 0 || recommendation.saleCityChanged
  const canApply = recommendation.isComplete && hasChanges
  const missingRecommendationText = (() => {
    const missing: string[] = []

    if (recommendation.missingMaterialCount > 0) {
      missing.push(
        `${recommendation.missingMaterialCount} ${
          recommendation.missingMaterialCount === 1 ? 'material' : 'materiales'
        }`,
      )
    }

    if (recommendation.saleUnitPrice === null) {
      missing.push('un precio de venta válido')
    }

    return missing.join(' y ')
  })()
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
              Mercados
            </span>
          </div>

          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-faint">
            Compara todos los mercados disponibles, conserva tu receta y configuración de producción actuales y combina la compra más barata de cada material con la mejor ciudad de venta.
          </p>
        </div>

        <button
          type="button"
          disabled={!canApply || marketStatus === 'loading'}
          onClick={onApply}
          className="shrink-0 rounded-lg border border-accent-border bg-accent-muted px-3.5 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {marketStatus === 'loading'
            ? 'Actualizando mercados…'
            : recommendation.isComplete === false
              ? 'Faltan datos de mercado'
              : hasChanges
                ? 'Aplicar ciudades recomendadas'
                : 'Configuración ya óptima'}
        </button>
      </div>

      {marketStatus === 'loading' && (
        <div className="mt-4 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs text-accent">
          Actualizando precios de compra y venta en todos los mercados…
        </div>
      )}

      {!recommendation.isComplete && marketStatus !== 'loading' && (
        <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-text-muted">
          La recomendación está incompleta: falta {missingRecommendationText || 'información de mercado suficiente'}. Recorre esos mercados en Albion y vuelve a actualizar.
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
            Compra optimizada
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
              ? 'Pendiente de precios'
              : `${formatSignedSilver(purchaseSavings)} frente a la actual`}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Resultado económico óptimo
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
            Mejora total
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
            Resultado óptimo menos actual
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
            Mejor ciudad para vender
          </p>

          {recommendation.saleCity && recommendation.saleUnitPrice !== null ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CityBadge city={recommendation.saleCity} markets={markets} />
                <span className="text-sm font-semibold tabular text-text">
                  {formatSilver(recommendation.saleUnitPrice)} plata/u.
                </span>
              </div>

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
            </div>
          ) : (
            <p className="mt-2 text-xs text-text-faint">
              No existe un precio de venta comparable para la calidad y método seleccionados.
            </p>
          )}
        </div>

        <details className="rounded-lg border border-border bg-surface p-3">
          <summary className="cursor-pointer list-none text-xs font-semibold text-text">
            <span className="flex items-center justify-between gap-3">
              <span>
                Ciudad más barata por material
                <span className="ml-2 font-normal text-text-faint">
                  {recommendation.materialChangeCount} cambios
                </span>
              </span>
              <span className="text-[10px] font-normal text-text-faint">
                Ver detalle
              </span>
            </span>
          </summary>

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {sortedMaterials.map((material) => (
              <div
                key={material.itemPriceKey}
                className="rounded-md border border-border bg-surface-raised px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-medium text-text">
                    {material.label}
                  </p>
                  {material.cityChanged ? (
                    <span className="rounded border border-positive/40 bg-positive-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-positive">
                      Más barato
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wide text-text-faint">
                      Sin cambio
                    </span>
                  )}
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
                    <span className="text-text-faint">sin recomendación</span>
                  )}
                  <span className="tabular text-text-muted">
                    {material.recommendedUnitPrice === null
                      ? 'sin precio'
                      : formatSilver(material.recommendedUnitPrice)}
                  </span>
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
              La proyección del optimizador compara precios automáticos de venta; aplicar ciudades no elimina tu precio manual.
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-text-faint">
        Este primer alcance optimiza mercados con la receta, cantidad, ciudad de producción, RRR, foco, tarifa de estación, Premium, método de compra y método de venta actuales. No agrega costos de transporte ni valida volumen disponible.
      </p>
    </section>
  )
}
