import type { MarketLastAttempt } from '../types/MarketPrice'

interface MarketLastAttemptBadgeProps {
  readonly attempt: MarketLastAttempt | null
  readonly label: string
}

function formatAttemptTime(value: string | null): string {
  if (!value) return 'en curso'

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'fecha no disponible'

  return new Intl.DateTimeFormat('es-CL', {
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function getAttemptClassName(attempt: MarketLastAttempt | null): string {
  if (!attempt) return 'border-border bg-surface-raised text-text-faint'

  if (attempt.status === 'running') {
    return 'border-border bg-surface text-text-muted'
  }

  if (attempt.status === 'success') {
    return 'border-positive bg-positive-muted text-positive'
  }

  return 'border-accent-border bg-accent-muted text-accent'
}

function getAttemptStatusLabel(attempt: MarketLastAttempt | null): string {
  if (!attempt) return 'sin intentos'
  if (attempt.status === 'running') return 'en curso'
  if (attempt.status === 'success') return 'recuperado'
  return 'falló'
}

export function MarketLastAttemptBadge({
  attempt,
  label,
}: MarketLastAttemptBadgeProps) {
  const finishedAt = attempt?.finishedAt ?? null
  const timeLabel = attempt
    ? formatAttemptTime(finishedAt ?? attempt.startedAt)
    : 'no consultado'

  return (
    <span
      title={attempt?.message ?? `${label}: todavía no hay intentos registrados.`}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${getAttemptClassName(attempt)}`}
    >
      {label}: {getAttemptStatusLabel(attempt)} · {timeLabel}
    </span>
  )
}
