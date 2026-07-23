import { DataConfidenceHint } from '@features/data-trust/components/DataConfidenceHint'
import type {
  MarketDataSource,
  MarketPriceFreshness,
  MarketPriceSnapshot,
} from '../types/MarketPrice'
import {
  MARKET_DATA_SOURCE_LABELS,
  classifyMarketPriceFreshness,
  formatMarketPriceExactDate,
  formatMarketPriceRelativeAge,
} from '../types/MarketPrice'
import {
  buildMarketDataConfidence,
  type MarketDataConfidenceLevel,
} from '../utils/marketDataConfidence'

interface MarketPriceFreshnessStatusProps {
  readonly updatedAt: string | null
  readonly source: MarketDataSource | null
  readonly isActive: boolean
  readonly compact?: boolean
  readonly priceValue?: number | null
  readonly snapshot?: MarketPriceSnapshot | null
}

const PRESENTATION: Record<
  MarketPriceFreshness,
  { label: string; className: string }
> = {
  recent: {
    label: 'Reciente',
    className: 'border-positive bg-positive-muted text-positive',
  },
  acceptable: {
    label: 'Aceptable',
    className: 'border-accent-border bg-accent-muted text-accent',
  },
  stale: {
    label: 'Antiguo',
    className: 'border-border bg-surface text-negative',
  },
  missing: {
    label: 'Sin datos',
    className: 'border-border bg-surface text-text-faint',
  },
}

const CONFIDENCE_PRESENTATION: Record<
  MarketDataConfidenceLevel,
  { label: string; className: string }
> = {
  high: {
    label: 'Confianza alta',
    className:
      'border-positive/50 bg-positive-muted px-1.5 py-0.5 text-[10px] text-positive',
  },
  medium: {
    label: 'Confianza media',
    className:
      'border-accent-border bg-accent-muted px-1.5 py-0.5 text-[10px] text-accent',
  },
  low: {
    label: 'Confianza baja',
    className:
      'border-negative/40 bg-negative-muted px-1.5 py-0.5 text-[10px] text-negative',
  },
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 1,
  }).format(value)}%`
}

export function MarketPriceFreshnessStatus({
  updatedAt,
  source,
  isActive,
  compact = false,
  priceValue = null,
  snapshot,
}: MarketPriceFreshnessStatusProps) {
  const freshness = classifyMarketPriceFreshness(updatedAt)
  const presentation = PRESENTATION[freshness]
  const isStaleAndActive = freshness === 'stale' && isActive
  const sourceLabel = source ? MARKET_DATA_SOURCE_LABELS[source] : 'Sin origen'
  const hasTrustEvidence = snapshot !== undefined
  const confidence = hasTrustEvidence
    ? buildMarketDataConfidence({
        priceValue,
        updatedAt,
        snapshot: snapshot ?? null,
      })
    : null
  const confidencePresentation = confidence
    ? CONFIDENCE_PRESENTATION[confidence.level]
    : null
  const showFreshnessBadge = confidence === null

  return (
    <div
      className={`rounded-md border border-border bg-surface/60 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {showFreshnessBadge && (
            <span
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${presentation.className}`}
            >
              {presentation.label}
            </span>
          )}
          {confidence && confidencePresentation && (
            <DataConfidenceHint
              level={confidence.level}
              label={confidencePresentation.label}
              className={confidencePresentation.className}
            />
          )}
          <span
            className="truncate rounded border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] text-text-muted"
            title={`Origen del precio: ${sourceLabel}`}
          >
            {sourceLabel}
          </span>
        </div>

        <span className="truncate text-right text-[10px] text-text-muted">
          {formatMarketPriceRelativeAge(updatedAt)}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
        <time
          dateTime={updatedAt ?? undefined}
          className="truncate text-text-faint"
          title={formatMarketPriceExactDate(updatedAt)}
        >
          {formatMarketPriceExactDate(updatedAt)}
        </time>

        {showFreshnessBadge && isStaleAndActive && (
          <span className="shrink-0 font-medium text-negative">⚠ En uso</span>
        )}
      </div>

      {confidence && (
        <div className={`${compact ? 'mt-1' : 'mt-2'} text-[10px] text-text-muted`}>
          <p className="leading-relaxed">
            {formatInteger(confidence.observations7d)} precios guardados ·{' '}
            {formatInteger(confidence.volume7d)} unidades registradas
            {confidence.deviationFromMedianPercent !== null && (
              <>
                {' '}· {formatSignedPercent(confidence.deviationFromMedianPercent)} frente al
                precio habitual de 7 días
              </>
            )}
            {confidence.spreadPercent !== null && (
              <>
                {' '}· diferencia compra/venta{' '}
                {formatSignedPercent(confidence.spreadPercent)}
              </>
            )}
          </p>
          {!compact && confidence.reasons.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-text-faint">
              {confidence.reasons.slice(0, 3).map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showFreshnessBadge && !compact && isStaleAndActive && (
        <p className="mt-2 text-[11px] leading-relaxed text-negative">
          Este precio automático está desactualizado y puede cambiar el resultado.
          Actualízalo o utiliza un valor manual.
        </p>
      )}
    </div>
  )
}
