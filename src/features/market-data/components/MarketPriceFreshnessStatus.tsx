import type {
  MarketDataSource,
  MarketPriceFreshness,
} from '../types/MarketPrice'
import {
  MARKET_DATA_SOURCE_LABELS,
  classifyMarketPriceFreshness,
  formatMarketPriceExactDate,
  formatMarketPriceRelativeAge,
} from '../types/MarketPrice'

interface MarketPriceFreshnessStatusProps {
  readonly updatedAt: string | null
  readonly source: MarketDataSource | null
  readonly isActive: boolean
  readonly compact?: boolean
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

export function MarketPriceFreshnessStatus({
  updatedAt,
  source,
  isActive,
  compact = false,
}: MarketPriceFreshnessStatusProps) {
  const freshness = classifyMarketPriceFreshness(updatedAt)
  const presentation = PRESENTATION[freshness]
  const isStaleAndActive = freshness === 'stale' && isActive
  const sourceLabel = source ? MARKET_DATA_SOURCE_LABELS[source] : 'Sin origen'

  return (
    <div
      className={`rounded-md border border-border bg-surface/60 ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${presentation.className}`}
          >
            {presentation.label}
          </span>
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

        {isStaleAndActive && (
          <span className="shrink-0 font-medium text-negative">⚠ En uso</span>
        )}
      </div>

      {!compact && isStaleAndActive && (
        <p className="mt-2 text-[11px] leading-relaxed text-negative">
          Este precio automático está desactualizado y puede distorsionar el
          cálculo. Actualízalo o utiliza un valor manual.
        </p>
      )}
    </div>
  )
}
