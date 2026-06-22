interface TierBadgeProps {
  readonly tier: number
  readonly className?: string
}

/**
 * Sello de tier (T4, T8...), tratado como una marca/troquel en vez
 * de texto plano — refuerza el concepto de "registro de gremio"
 * del buscador sin depender de íconos extra.
 */
export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-full border border-accent-border bg-accent-muted text-accent font-mono text-[11px] font-medium tabular ${className}`}
    >
      T{tier}
    </span>
  )
}
