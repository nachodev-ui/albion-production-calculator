import type { CraftingStation } from '@core/domain/entities/Recipe'
import {
  CRAFTING_STATION_LABELS,
} from '@core/domain/entities/ProductionEconomy'
import type {
  StationAccessType,
  StationFeeBreakdown,
  StationFeeConfig,
} from '@core/domain/entities/ProductionEconomy'
import { InfoHint } from '@shared/components/InfoHint'

interface StationFeeConfigPanelProps {
  readonly station: CraftingStation
  readonly config: StationFeeConfig
  readonly detectedItemValue: number | null
  readonly itemValueOverride: number | null
  readonly breakdown: StationFeeBreakdown
  readonly onChange: (config: StationFeeConfig) => void
  readonly onItemValueOverrideChange: (value: number | null) => void
}

function formatNumber(amount: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits,
  }).format(amount)
}

function parseNonNegative(value: string): number {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function StationFeeConfigPanel({
  station,
  config,
  detectedItemValue,
  itemValueOverride,
  breakdown,
  onChange,
  onItemValueOverrideChange,
}: StationFeeConfigPanelProps) {
  const effectiveItemValue = itemValueOverride ?? detectedItemValue

  function update(patch: Partial<StationFeeConfig>) {
    onChange({ ...config, ...patch })
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-text">
              Puesto y tarifa de uso
            </h4>

            <InfoHint
              label="Tarifa de uso por nutrición"
              text="La tarifa visible en el puesto se cobra por cada 100 puntos de nutrición consumida. La nutrición depende del Item Value del objeto y de la cantidad de tiradas necesarias."
              align="left"
            />
          </div>

          <p className="mt-1 text-xs text-text-faint">
            {CRAFTING_STATION_LABELS[station]}
          </p>
        </div>

        <span className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-muted">
          {config.accessType === 'free'
            ? 'Sin tarifa'
            : config.accessType === 'associate'
              ? 'Asociado'
              : 'Usuario'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div>
          <span className="text-xs text-text-faint">Acceso al puesto</span>
          <div className="mt-1 inline-flex w-full overflow-hidden rounded-md border border-border">
            {(
              [
                ['user', 'Usuario'],
                ['associate', 'Asociado'],
                ['free', 'Gratis / isla'],
              ] as const satisfies readonly (readonly [StationAccessType, string])[]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => update({ accessType: value })}
                className={`flex-1 px-2 py-2 text-xs transition-colors ${
                  config.accessType === value
                    ? 'bg-accent text-bg'
                    : 'bg-surface text-text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label>
          <span className="text-xs text-text-faint">
            Users / 100 Nutrition
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={config.userFeePer100Nutrition}
            onChange={(event) =>
              update({
                userFeePer100Nutrition: parseNonNegative(event.target.value),
              })
            }
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          />
        </label>

        <label>
          <span className="text-xs text-text-faint">
            Associates / 100 Nutrition
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={config.associateFeePer100Nutrition}
            onChange={(event) =>
              update({
                associateFeePer100Nutrition: parseNonNegative(
                  event.target.value,
                ),
              })
            }
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-2">
        <label>
          <span className="flex items-center gap-1.5 text-xs text-text-faint">
            Item Value del objeto
            <InfoHint
              label="Item Value"
              text="Se usa solamente para calcular nutrición y tarifa del puesto. Puedes copiarlo desde la información del objeto en el juego."
              align="left"
            />
          </span>

          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={effectiveItemValue ?? ''}
              placeholder="Ingresar Item Value"
              onChange={(event) => {
                if (event.target.value.trim() === '') {
                  onItemValueOverrideChange(null)
                  return
                }
                onItemValueOverrideChange(
                  parseNonNegative(event.target.value),
                )
              }}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none placeholder:text-[11px] focus-visible:ring-2 focus-visible:ring-accent-border"
            />

            {itemValueOverride !== null && detectedItemValue !== null && (
              <button
                type="button"
                onClick={() => onItemValueOverrideChange(null)}
                className="rounded-md border border-border bg-surface px-2 text-[11px] text-text-muted hover:text-text"
              >
                Usar detectado
              </button>
            )}
          </div>

          <p className="mt-1 text-[11px] text-text-faint">
            {itemValueOverride !== null
              ? 'Valor manual para este objeto.'
              : detectedItemValue !== null
                ? 'Valor detectado desde el dataset.'
                : 'El dataset actual no incluye este valor; ingrésalo manualmente.'}
          </p>
        </label>

        <div className="rounded-md border border-border bg-surface p-3 text-xs">
          <div className="flex justify-between gap-4 text-text-faint">
            <span>Nutrición por tirada</span>
            <span className="tabular text-text">
              {formatNumber(breakdown.nutritionPerCraft)}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-4 text-text-faint">
            <span>Nutrición total</span>
            <span className="tabular text-text">
              {formatNumber(breakdown.nutritionTotal)}
            </span>
          </div>
          <div className="mt-2 flex justify-between gap-4 border-t border-border pt-2">
            <span className="font-medium text-text">Costo del puesto</span>
            <span className="font-semibold tabular text-accent">
              {formatNumber(breakdown.totalFee, 0)} plata
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
