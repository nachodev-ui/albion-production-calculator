import type { ReactNode } from 'react'

interface ModuleHeaderProps {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly badge?: string
  readonly actions?: ReactNode
}

export function ModuleHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: ModuleHeaderProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-4 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              {eyebrow}
            </p>
            {badge && (
              <span className="rounded-full border border-accent-border bg-accent-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
                {badge}
              </span>
            )}
          </div>

          <h2 className="mt-2 text-balance font-display text-2xl tracking-tight text-text sm:text-3xl">
            {title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            {description}
          </p>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  )
}
