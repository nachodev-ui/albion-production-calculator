import type {
  MarketRefreshItemReport,
  MarketRefreshProgress,
  MarketRefreshReport,
} from '../types/MarketRefresh'

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRefreshTime(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'hora no disponible'

  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

interface MarketRefreshSummaryProps {
  readonly progress: MarketRefreshProgress | null
  readonly report: MarketRefreshReport | null
  readonly onDismiss: () => void
}

export function MarketRefreshSummary({
  progress,
  report,
  onDismiss,
}: MarketRefreshSummaryProps) {
  if (progress) {
    const percentage =
      progress.totalCombinations > 0
        ? Math.round(
            (progress.completedCombinations /
              progress.totalCombinations) *
              100,
          )
        : 0

    return (
      <div
        className="mt-3 rounded-lg border border-accent-border bg-accent-muted/50 p-3"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-text">
              Actualizando precios
            </p>
            <p className="mt-0.5 text-[11px] text-text-faint">
              Consultando mercados y comparando los datos recibidos con el
              caché local.
            </p>
          </div>

          <span className="shrink-0 font-mono text-xs tabular text-accent">
            {percentage}%
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[10px] text-text-faint">
          <span>
            {progress.completedRequests} de {progress.totalRequests}{' '}
            solicitudes completadas
          </span>
          <span>
            {progress.completedCombinations} de{' '}
            {progress.totalCombinations} combinaciones procesadas
          </span>
        </div>
      </div>
    )
  }

  if (!report) return null

  return (
    <div
      className="mt-3 rounded-lg border border-positive/35 bg-positive-muted/35 p-3"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-text">
            Actualización completada
          </p>
          <p className="mt-0.5 text-[10px] text-text-faint">
            {report.requestedCombinations} combinaciones en{' '}
            {report.requestCount}{' '}
            {report.requestCount === 1 ? 'solicitud' : 'solicitudes'} ·{' '}
            {formatRefreshTime(report.completedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Ocultar resumen de actualización"
          className="shrink-0 rounded p-1 text-text-faint transition-colors hover:bg-surface hover:text-text"
        >
          ×
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SummaryBadge
          label={`${report.updated} automáticos actualizados`}
          className="border-positive/40 bg-positive-muted text-positive"
        />
        <SummaryBadge
          label={`${report.unchanged} automáticos sin cambios`}
          className="border-border bg-surface text-text-muted"
        />
        <SummaryBadge
          label={`${report.missing} combinaciones sin datos`}
          className="border-accent-border bg-accent-muted text-accent"
        />
        {report.manualPreserved > 0 && (
          <SummaryBadge
            label={`${report.manualPreserved} overrides conservados`}
            className="border-[#5f8f86]/40 bg-[#5f8f86]/10 text-[#7ca79f]"
          />
        )}
      </div>

      {report.items.length > 0 && (
        <details className="mt-3 border-t border-positive/20 pt-2">
          <summary className="cursor-pointer select-none text-[11px] font-medium text-text-muted hover:text-text">
            Ver detalle de la configuración activa
          </summary>

          <div className="mt-2 grid gap-1.5 lg:grid-cols-2">
            {report.items.map((item) => (
              <MarketRefreshDetailRow
                key={`${item.kind}:${item.targetKey}`}
                item={item}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function SummaryBadge({
  label,
  className,
}: {
  readonly label: string
  readonly className: string
}) {
  return (
    <span
      className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${className}`}
    >
      {label}
    </span>
  )
}

function MarketRefreshDetailRow({
  item,
}: {
  readonly item: MarketRefreshItemReport
}) {
  const detail = getItemFeedback(item, false)

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-surface px-2.5 py-2 text-[10px]">
      <div className="min-w-0">
        <p className="truncate font-medium text-text" title={item.label}>
          {item.label}
        </p>
        <p className="truncate text-text-faint">
          {item.cityName} · {item.kind === 'sale' ? 'producto' : 'material'}
        </p>
      </div>

      <span className={`shrink-0 font-medium tabular ${detail.textClass}`}>
        {detail.valueText}
      </span>
    </div>
  )
}

interface MarketRefreshItemFeedbackProps {
  readonly result: MarketRefreshItemReport | null | undefined
  readonly isManualOverride: boolean
}

export function MarketRefreshItemFeedback({
  result,
  isManualOverride,
}: MarketRefreshItemFeedbackProps) {
  if (!result) return null

  const feedback = getItemFeedback(result, isManualOverride)

  return (
    <div className="rounded-md border border-border bg-surface/70 px-2 py-1.5 text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-semibold ${feedback.badgeClass}`}
        >
          {feedback.label}
        </span>
        <span className={`truncate text-right tabular ${feedback.textClass}`}>
          {feedback.valueText}
        </span>
      </div>

      <p className="mt-1 truncate text-text-faint" title={result.cityName}>
        {result.cityName}
        {isManualOverride
          ? ' · el precio automático no reemplazó tu valor manual'
          : ' · resultado de la última actualización'}
      </p>
    </div>
  )
}

function getItemFeedback(
  item: MarketRefreshItemReport,
  isManualOverride: boolean,
): {
  readonly label: string
  readonly valueText: string
  readonly badgeClass: string
  readonly textClass: string
} {
  if (isManualOverride) {
    return {
      label: 'Manual conservado',
      valueText:
        item.currentValue === null
          ? 'Automático sin datos'
          : `Automático: ${formatSilver(item.currentValue)}`,
      badgeClass:
        'border-[#5f8f86]/40 bg-[#5f8f86]/10 text-[#7ca79f]',
      textClass: 'text-text-muted',
    }
  }

  if (item.outcome === 'missing') {
    return {
      label: 'Sin datos',
      valueText: 'No se encontró precio',
      badgeClass: 'border-accent-border bg-accent-muted text-accent',
      textClass: 'text-accent',
    }
  }

  if (item.outcome === 'unchanged') {
    return {
      label: 'Sin cambios',
      valueText:
        item.currentValue === null
          ? '—'
          : `${formatSilver(item.currentValue)} plata`,
      badgeClass: 'border-border bg-surface text-text-muted',
      textClass: 'text-text-muted',
    }
  }

  const previous =
    item.previousValue === null
      ? 'Sin precio'
      : formatSilver(item.previousValue)
  const current =
    item.currentValue === null ? '—' : formatSilver(item.currentValue)

  return {
    label: item.previousValue === null ? 'Precio encontrado' : 'Actualizado',
    valueText: `${previous} → ${current}`,
    badgeClass: 'border-positive/40 bg-positive-muted text-positive',
    textClass: 'text-positive',
  }
}
