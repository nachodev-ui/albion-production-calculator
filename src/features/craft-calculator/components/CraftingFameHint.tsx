import type { CraftingFameBreakdown } from '@core/usecases/calculateCraftingFame'
import { InfoHint } from '@shared/components/InfoHint'

interface CraftingFameHintProps {
  readonly fame: CraftingFameBreakdown
}

interface FameDetailRowProps {
  readonly label: string
  readonly value: string
  readonly iconSrc?: string
  readonly iconMuted?: boolean
  readonly emphasized?: boolean
}

const fameFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
})

function formatFame(value: number): string {
  return fameFormatter.format(value)
}

function FameDetailRow({
  label,
  value,
  iconSrc,
  iconMuted = false,
  emphasized = false,
}: FameDetailRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-3 py-2.5 ${
        emphasized ? 'bg-accent-muted/55' : 'bg-surface'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {iconSrc && (
          <img
            src={iconSrc}
            alt=""
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 object-contain ${
              iconMuted ? 'grayscale opacity-35' : ''
            }`}
          />
        )}

        <span
          className={`text-[11px] ${
            emphasized ? 'font-semibold text-text' : 'text-text-muted'
          }`}
        >
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 font-mono text-xs tabular-nums ${
          emphasized ? 'font-semibold text-accent' : 'text-text'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export function CraftingFameHint({ fame }: CraftingFameHintProps) {
  const quantityLabel =
    fame.requestedQuantity === 1
      ? '1 objeto final'
      : `${fame.requestedQuantity} objetos finales`

  return (
    <InfoHint
      label="Fama de fabricación"
      align="right"
      width={336}
      openOnHover
      triggerClassName="group flex min-w-[10.5rem] items-center justify-end gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-accent-border hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      trigger={
        <>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-lg border border-accent-border/60 bg-accent-muted shadow-inner">
            <img
              src="/assets/ui/crafting-fame.png"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 rounded-md object-cover"
            />

            {fame.isPremium && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-accent-border bg-surface-raised shadow-md">
                <img
                  src="/assets/ui/premium-crown.png"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 object-contain"
                />
              </span>
            )}
          </span>

          <span className="text-right">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-text-faint transition-colors group-hover:text-text-muted">
              Fama total
            </span>
            <span className="block font-mono text-sm font-semibold tabular-nums text-text">
              {formatFame(fame.totalFame)}
            </span>
          </span>
        </>
      }
      tooltipClassName="overflow-hidden p-0"
      content={
        <div>
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-br from-accent-muted/80 to-surface-raised px-3.5 py-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-surface shadow-inner">
              <img
                src="/assets/ui/crafting-fame.png"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 rounded-lg object-cover"
              />
            </span>

            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-text">
                Fama de fabricación
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Estimación para {quantityLabel}
              </p>
            </div>

            {fame.isPremium && (
              <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-accent-border bg-surface/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                <img
                  src="/assets/ui/premium-crown.png"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 object-contain"
                />
                Premium
              </span>
            )}
          </div>

          <div className="divide-y divide-border">
            <FameDetailRow
              label="Fama del objeto final"
              value={`${formatFame(fame.famePerFinalItem)} / u.`}
              iconSrc="/assets/ui/crafting-fame.png"
            />
            <FameDetailRow
              label="Fama base"
              value={formatFame(fame.baseFame)}
            />
            <FameDetailRow
              label={
                fame.isPremium
                  ? 'Bonificación Premium (+50%)'
                  : 'Bonificación Premium desactivada'
              }
              value={`+${formatFame(fame.premiumBonus)}`}
              iconSrc="/assets/ui/premium-crown.png"
              iconMuted={!fame.isPremium}
            />
            <FameDetailRow
              label="Total obtenido"
              value={formatFame(fame.totalFame)}
              emphasized
            />
            <FameDetailRow
              label="Fama válida para diarios"
              value={formatFame(fame.journalFame)}
            />
          </div>

          {fame.producedQuantity !== fame.requestedQuantity && (
            <p className="border-t border-border bg-surface px-3 py-2 text-[10px] text-text-faint">
              La receta producirá {fame.producedQuantity} unidades en{' '}
              {fame.craftsNeeded} tiradas.
            </p>
          )}

          <p className="border-t border-border bg-surface-raised px-3 py-2.5 text-[10px] leading-relaxed text-text-faint">
            Solo considera la fabricación del objeto final. No suma refinamiento,
            ingredientes intermedios ni estudio.
          </p>
        </div>
      }
    />
  )
}
