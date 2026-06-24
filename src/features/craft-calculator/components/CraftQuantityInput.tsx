import type { CraftingFameBreakdown } from '@core/usecases/calculateCraftingFame'
import { CraftingFameHint } from './CraftingFameHint'

interface CraftQuantityInputProps {
  readonly value: number
  readonly onChange: (quantity: number) => void
  readonly fame: CraftingFameBreakdown | null
}

export function CraftQuantityInput({
  value,
  onChange,
  fame,
}: CraftQuantityInputProps) {
  function handleChange(rawValue: string) {
    const next = Number(rawValue)

    if (!Number.isFinite(next)) return

    onChange(Math.max(1, Math.floor(next)))
  }

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Cantidad a craftear
          </h3>
          <p className="mt-1 text-xs text-text-faint">
            Define cuántas unidades quieres producir.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {fame && <CraftingFameHint fame={fame} />}

          <input
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            aria-label="Cantidad a craftear"
            className="w-28 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          />
        </div>
      </div>
    </section>
  )
}
