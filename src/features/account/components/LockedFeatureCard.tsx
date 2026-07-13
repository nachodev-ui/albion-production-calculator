import { LockIcon, SparklesIcon } from "./AccountIcons";

interface LockedFeatureCardProps {
  readonly title: string;
  readonly description: string;
  readonly onViewPlans: () => void;
  readonly compact?: boolean;
}

export function LockedFeatureCard({
  title,
  description,
  onViewPlans,
  compact = false,
}: LockedFeatureCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-accent-border bg-accent-muted/55 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-surface text-accent">
            <LockIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-text">{title}</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                <SparklesIcon className="h-3 w-3" />
                Pro
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-muted">
              {description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewPlans}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          Ver planes
        </button>
      </div>
    </section>
  );
}
