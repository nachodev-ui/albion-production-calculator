import type {
  CraftingSpecializationConfig,
  FocusCostBreakdown,
} from '@core/domain/entities/ProductionEconomy'
import { InfoHint } from '@shared/components/InfoHint'

interface CraftingSpecializationPanelProps {
  readonly config: CraftingSpecializationConfig
  readonly breakdown: FocusCostBreakdown
  readonly onChange: (config: CraftingSpecializationConfig) => void
}

function parseNonNegative(value: string): number {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function formatNumber(amount: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits,
  }).format(amount)
}

export function CraftingSpecializationPanel({
  config,
  breakdown,
  onChange,
}: CraftingSpecializationPanelProps) {
  function update(patch: Partial<CraftingSpecializationConfig>) {
    onChange({ ...config, ...patch })
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex items-center gap-1.5">
        <h4 className="text-sm font-medium text-text">
          Especialización y foco
        </h4>

        <InfoHint
          label="Passive Bonus del Destiny Board"
          text="Ingresa el total de Bonus to Focus Cost Efficiency mostrado para el objeto. Cada 10.000 puntos reducen a la mitad el costo de foco. Increase in Quality se guarda como referencia, pero todavía no modifica el precio esperado."
          align="left"
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label>
          <span className="text-xs text-text-faint">
            Focus Cost Efficiency
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={config.focusCostEfficiency}
            onChange={(event) =>
              update({
                focusCostEfficiency: parseNonNegative(event.target.value),
              })
            }
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          />
        </label>

        <label>
          <span className="text-xs text-text-faint">Foco disponible</span>
          <input
            type="number"
            min="0"
            step="1"
            value={config.availableFocus}
            onChange={(event) =>
              update({ availableFocus: parseNonNegative(event.target.value) })
            }
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          />
        </label>

        <label>
          <span className="text-xs text-text-faint">
            Increase in Quality
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={config.qualityIncrease}
            onChange={(event) =>
              update({ qualityIncrease: parseNonNegative(event.target.value) })
            }
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-surface p-2.5">
          <span className="text-text-faint">Foco base / tirada</span>
          <p className="mt-1 font-medium tabular text-text">
            {formatNumber(breakdown.baseFocusPerCraft)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-2.5">
          <span className="text-text-faint">Foco efectivo / tirada</span>
          <p className="mt-1 font-medium tabular text-text">
            {formatNumber(breakdown.effectiveFocusPerCraft)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-2.5">
          <span className="text-text-faint">Foco para este lote</span>
          <p className={`mt-1 font-medium tabular ${
            breakdown.useFocus ? 'text-accent' : 'text-text-faint'
          }`}>
            {breakdown.useFocus
              ? formatNumber(breakdown.totalFocusRequired)
              : 'Foco desactivado'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface p-2.5">
          <span className="text-text-faint">Objetos posibles</span>
          <p className="mt-1 font-medium tabular text-text">
            {breakdown.effectiveFocusPerCraft > 0
              ? formatNumber(breakdown.maxItemsWithAvailableFocus)
              : '—'}
          </p>
        </div>
      </div>

      {breakdown.useFocus &&
        breakdown.availableFocus > 0 &&
        breakdown.totalFocusRequired > breakdown.availableFocus && (
          <p className="mt-3 text-xs text-negative">
            El lote requiere {formatNumber(breakdown.totalFocusRequired)} de
            foco, pero indicaste {formatNumber(breakdown.availableFocus)} disponible.
          </p>
        )}

      <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
        El bono de calidad se muestra y se guarda en presets, pero aún no se
        usa para estimar probabilidades ni precio de venta por calidad.
      </p>
    </div>
  )
}
