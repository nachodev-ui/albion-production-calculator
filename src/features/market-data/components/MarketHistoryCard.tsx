import { useMemo, useState } from 'react'
import type {
  MarketHistoryPeriodDays,
  MarketHistorySnapshot,
} from '../types/MarketHistory'
import type {
  MarketConfig,
  MarketCityId,
  MarketDataSource,
  MarketDefinition,
  MarketQuality,
  MarketRequestStatus,
} from '../types/MarketPrice'
import {
  MARKET_DATA_SOURCE_LABELS,
  MARKET_QUALITIES,
  MARKET_QUALITY_LABELS,
  MARKET_SERVER_LABELS,
  formatMarketQuality,
  getMarketName,
} from '../types/MarketPrice'
import { buildMarketHistoryView } from '../utils/marketHistoryAnalytics'
import { MarketHistoryChart } from './MarketHistoryChart'

interface MarketHistoryCardProps {
  readonly itemName: string
  readonly historyConfig: MarketConfig
  readonly saleConfig: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly snapshot: MarketHistorySnapshot | null
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly warnings: readonly string[]
  readonly hasCachedHistory: boolean
  readonly isComparing: boolean
  readonly onComparisonChange: (patch: Partial<MarketConfig>) => void
  readonly onStartComparison: () => void
  readonly onFollowSale: () => void
  readonly onApplyToSale: () => void
  readonly onRefresh: () => void
}

function formatSilver(value: number | null): string {
  if (value === null) return 'Sin datos'

  return `${new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(value)} plata`
}

function formatVolume(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits,
  }).format(value)
}

function formatFetchedAt(value: string | null): string {
  if (!value) return 'No consultado'

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'Fecha de consulta no disponible'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function formatLastBucket(value: string | null): string {
  if (!value) return 'Sin buckets disponibles'

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'Fecha no disponible'

  const date = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(timestamp))
  const ageDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
  const relative = new Intl.RelativeTimeFormat('es-CL', {
    numeric: 'auto',
  }).format(-ageDays, 'day')

  return `${date} (${relative})`
}

function getSourceClassName(source: MarketDataSource): string {
  if (source === 'central-api') {
    return 'border-positive bg-positive-muted text-positive'
  }
  if (source === 'local-receiver') {
    return 'border-border-strong bg-surface text-text-muted'
  }
  return 'border-accent-border bg-accent-muted text-accent'
}

function getStatusLabel(
  status: MarketRequestStatus,
  hasCachedHistory: boolean,
  source: MarketDataSource | null,
): { readonly label: string; readonly className: string } {
  if (status === 'loading') {
    return {
      label: 'Consultando historial…',
      className: 'border-border bg-surface text-text-muted',
    }
  }

  if (source === 'browser-cache') {
    return {
      label: 'Usando historial guardado',
      className: 'border-accent-border bg-accent-muted text-accent',
    }
  }

  if (status === 'error') {
    return hasCachedHistory
      ? {
          label: 'Usando historial guardado',
          className: 'border-accent-border bg-accent-muted text-accent',
        }
      : {
          label: 'Historial no disponible',
          className: 'border-border bg-surface text-negative',
        }
  }

  if (status === 'success') {
    return {
      label: 'Historial actualizado',
      className: 'border-positive bg-positive-muted text-positive',
    }
  }

  return {
    label: 'Esperando consulta',
    className: 'border-border bg-surface text-text-faint',
  }
}

export function MarketHistoryCard({
  itemName,
  historyConfig,
  saleConfig,
  markets,
  snapshot,
  status,
  error,
  warnings,
  hasCachedHistory,
  isComparing,
  onComparisonChange,
  onStartComparison,
  onFollowSale,
  onApplyToSale,
  onRefresh,
}: MarketHistoryCardProps) {
  const [periodDays, setPeriodDays] = useState<MarketHistoryPeriodDays>(7)
  const view = useMemo(
    () => buildMarketHistoryView(snapshot, periodDays),
    [periodDays, snapshot],
  )
  const statusLabel = getStatusLabel(
    status,
    hasCachedHistory,
    snapshot?.source ?? null,
  )
  const summary = view.summary
  const lastBucketAt = snapshot?.points.at(-1)?.timestamp ?? null
  const comparisonMatchesSale =
    historyConfig.saleCity === saleConfig.saleCity &&
    historyConfig.quality === saleConfig.quality

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Historial de precio y volumen
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-text-faint">
            {itemName} · {getMarketName(markets, historyConfig.saleCity)} ·{' '}
            {MARKET_SERVER_LABELS[historyConfig.server]} · calidad{' '}
            {formatMarketQuality(historyConfig.quality)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${statusLabel.className}`}
          >
            {statusLabel.label}
          </span>

          {snapshot && (
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${getSourceClassName(snapshot.source)}`}
            >
              Origen: {MARKET_DATA_SOURCE_LABELS[snapshot.source]}
            </span>
          )}

          <button
            type="button"
            disabled={status === 'loading'}
            onClick={onRefresh}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong disabled:cursor-wait disabled:opacity-60"
          >
            Actualizar historial
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-3">
        {!isComparing ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-text">
                Siguiendo la configuración de venta
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
                {getMarketName(markets, saleConfig.saleCity)} ·{' '}
                {MARKET_QUALITY_LABELS[saleConfig.quality]}. El gráfico cambia
                automáticamente cuando modificas la venta en el resumen económico.
              </p>
            </div>

            <button
              type="button"
              onClick={onStartComparison}
              className="shrink-0 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong"
            >
              Comparar otro mercado
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[11px] font-medium text-text-faint">
                  Ciudad para comparar
                </span>
                <select
                  value={historyConfig.saleCity}
                  onChange={(event) =>
                    onComparisonChange({
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
                  Calidad para comparar
                </span>
                <select
                  value={historyConfig.quality}
                  onChange={(event) =>
                    onComparisonChange({
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

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={onFollowSale}
                  className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
                >
                  Volver a seguir venta
                </button>
                <button
                  type="button"
                  disabled={comparisonMatchesSale}
                  onClick={onApplyToSale}
                  className="rounded-md border border-accent-border bg-accent-muted px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {comparisonMatchesSale
                    ? 'Ya coincide con la venta'
                    : 'Aplicar como configuración de venta'}
                </button>
              </div>
            </div>

            <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-text-faint">
              Esta comparación solo modifica el gráfico. El precio de venta y
              la rentabilidad no cambian hasta que pulses “Aplicar como configuración de venta”.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-1">
          {([7, 28] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                periodDays === days
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-faint hover:text-text'
              }`}
            >
              {days} días
            </button>
          ))}
        </div>

        <div className="text-right text-[11px] leading-relaxed text-text-faint">
          <p>Último bucket: {formatLastBucket(lastBucketAt)}</p>
          <p>Última consulta: {formatFetchedAt(snapshot?.fetchedAt ?? null)}</p>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
          <p className="font-medium text-text">Degradación de fuentes</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
          No se pudo actualizar el historial: {error}.{' '}
          {hasCachedHistory
            ? 'Se mantiene el último historial guardado en este navegador.'
            : 'La calculadora puede seguir funcionando con precios actuales o manuales.'}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] text-text-faint">Precio promedio</p>
          <p className="mt-1 text-sm font-semibold tabular text-text">
            {formatSilver(summary.averagePrice)}
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            Ponderado por volumen
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] text-text-faint">Mínimo / máximo</p>
          <p className="mt-1 text-sm font-semibold tabular text-text">
            {summary.minimumPrice === null
              ? 'Sin datos'
              : `${formatVolume(summary.minimumPrice)} / ${formatVolume(summary.maximumPrice ?? 0)} plata`}
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            Promedios diarios
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] text-text-faint">Volumen diario</p>
          <p className="mt-1 text-sm font-semibold tabular text-text">
            {formatVolume(summary.averageDailyVolume, 1)} unidades
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            Incluye días sin registros
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] text-text-faint">Volumen total</p>
          <p className="mt-1 text-sm font-semibold tabular text-text">
            {formatVolume(summary.totalVolume)} unidades
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            {summary.activeVolumeDays} de {summary.periodDays} días activos
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] text-text-faint">Volatilidad</p>
          <p className="mt-1 text-sm font-semibold tabular text-text">
            {summary.volatilityPercent === null
              ? 'Sin datos'
              : `${formatVolume(summary.volatilityPercent, 1)} %`}
          </p>
          <p className="mt-1 text-[10px] text-text-faint">
            {summary.observedPriceDays} días con precio
          </p>
        </div>
      </div>

      <div className="mt-4">
        <MarketHistoryChart points={view.points} />
      </div>

      <div className="mt-4 space-y-1 border-t border-border pt-3 text-[11px] leading-relaxed text-text-faint">
        <p>
          El precio promedio está ponderado por las unidades registradas. La
          volatilidad corresponde a la desviación estándar de los promedios
          diarios dividida por su media.
        </p>
        <p>
          El cliente de Albion entrega este historial como datos agregados de
          ventas. Por eso cambiar entre “Vender mediante orden” y “Vender inmediatamente” no
          modifica el gráfico; sí lo hacen la ciudad y la calidad del producto.
        </p>
        <p>
          El volumen no representa todas las órdenes de compra ni garantiza
          que esa cantidad se venda nuevamente en el mismo plazo.
        </p>
        <p>
          Se muestran días UTC completos para evitar que el día actual,
          todavía incompleto, reduzca artificialmente el volumen promedio.
        </p>
      </div>
    </section>
  )
}
