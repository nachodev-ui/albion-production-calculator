import type { CraftingStation } from '@core/domain/entities/Recipe'
import { CRAFTING_STATION_LABELS } from '@core/domain/entities/ProductionEconomy'
import type {
  StationAccessType,
  StationFeeBreakdown,
  StationFeeConfig,
  StationUsageFeeOverride,
} from '@core/domain/entities/ProductionEconomy'
import { InfoHint } from '@shared/components/InfoHint'

interface StationFeeConfigPanelProps {
  readonly station: CraftingStation
  readonly quantity: number
  readonly config: StationFeeConfig
  readonly detectedItemValue: number | null
  readonly itemValueOverride: number | null
  readonly manualTotalCost: StationUsageFeeOverride | null
  readonly breakdown: StationFeeBreakdown
  readonly onChange: (config: StationFeeConfig) => void
  readonly onItemValueOverrideChange: (value: number | null) => void
  readonly onManualTotalCostChange: (
    value: StationUsageFeeOverride | null,
  ) => void
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
  quantity,
  config,
  detectedItemValue,
  itemValueOverride,
  manualTotalCost,
  breakdown,
  onChange,
  onItemValueOverrideChange,
  onManualTotalCostChange,
}: StationFeeConfigPanelProps) {
  const effectiveItemValue = itemValueOverride ?? detectedItemValue
  const hasDirectCost = breakdown.source === 'manual_total'
  const hasScaledDirectCost =
    hasDirectCost &&
    breakdown.manualTotalFee !== null &&
    breakdown.appliedManualTotalFee !== null &&
    Math.abs(breakdown.appliedManualTotalFee - breakdown.manualTotalFee) > 0.01

  function update(patch: Partial<StationFeeConfig>) {
    onChange({ ...config, ...patch })
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-text">
              Puesto y costo de fabricación
            </h4>

            <InfoHint
              label="Costo del puesto"
              text="Ingresa el Total Cost que Albion muestra justo antes de confirmar el crafteo. Ese monto se suma directamente al costo del lote actual."
              align="left"
            />
          </div>

          <p className="mt-1 text-xs text-text-faint">
            {CRAFTING_STATION_LABELS[station]}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium ${
            hasDirectCost
              ? 'border-positive/35 bg-positive-muted text-positive'
              : 'border-border bg-surface text-text-muted'
          }`}
        >
          {hasDirectCost ? 'Costo directo' : 'Estimación avanzada'}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.65fr)]">
        <label>
          <span className="flex items-center gap-1.5 text-xs text-text-faint">
            Costo total mostrado por Albion
            <span className="rounded-md border border-positive/30 bg-positive-muted px-1.5 py-0.5 text-[10px] font-medium text-positive">
              Recomendado
            </span>
          </span>

          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="1"
              value={manualTotalCost?.totalFee ?? ''}
              placeholder="Ej.: 1.015"
              disabled={breakdown.craftsNeeded <= 0}
              onChange={(event) => {
                if (event.target.value.trim() === '') {
                  onManualTotalCostChange(null)
                  return
                }

                onManualTotalCostChange({
                  totalFee: parseNonNegative(event.target.value),
                  quantity: Math.max(1, quantity),
                  craftsNeeded: breakdown.craftsNeeded,
                })
              }}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm tabular text-text outline-none placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-accent-border disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="text-xs text-text-faint">plata</span>

            {manualTotalCost !== null && (
              <button
                type="button"
                onClick={() => onManualTotalCostChange(null)}
                className="rounded-md border border-border bg-surface px-2.5 py-2 text-[11px] text-text-muted hover:text-text"
              >
                Quitar
              </button>
            )}
          </div>

          <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
            Copia el{' '}
            <span className="font-medium text-text-muted">Total Cost</span> que
            aparece antes de pagar. Debe corresponder a las{' '}
            {formatNumber(quantity, 0)}{' '}
            {quantity === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}.
          </p>
        </label>

        <div className="rounded-md border border-border bg-surface p-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-faint">Costo aplicado al cálculo</span>
            <span className="font-semibold tabular text-accent">
              {formatNumber(breakdown.totalFee, 0)} plata
            </span>
          </div>

          <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-text-faint">
            {hasDirectCost
              ? hasScaledDirectCost
                ? `Escalado proporcionalmente desde ${formatNumber(
                    breakdown.manualTotalFee ?? 0,
                    0,
                  )} plata para ${formatNumber(
                    breakdown.manualQuantity ?? 0,
                    0,
                  )} unidades.`
                : 'Se usa directamente el monto que copiaste desde Albion.'
              : 'No hay un Total Cost directo; se usa la estimación avanzada de abajo.'}
          </p>
        </div>
      </div>

      <details className="mt-3 rounded-md border border-border bg-surface">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-text-muted hover:text-text">
          Estimar desde tarifa y nutrición (avanzado)
        </summary>

        <div className="border-t border-border p-3">
          <p className="text-[11px] leading-relaxed text-text-faint">
            Esta opción reconstruye el costo desde Item Value, nutrición y
            tarifa del puesto. Úsala solo cuando no puedas copiar el Total Cost
            directamente desde Albion.
          </p>

          {hasDirectCost && (
            <p className="mt-2 rounded-md border border-accent/25 bg-accent-muted px-2.5 py-2 text-[11px] text-accent">
              La estimación se muestra como referencia, pero no reemplaza el
              costo directo ingresado arriba.
            </p>
          )}

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div>
              <span className="text-xs text-text-faint">Acceso al puesto</span>
              <div className="mt-1 inline-flex w-full overflow-hidden rounded-md border border-border">
                {(
                  [
                    ['user', 'Usuario'],
                    ['associate', 'Asociado'],
                    ['free', 'Gratis / isla'],
                  ] as const satisfies readonly (readonly [
                    StationAccessType,
                    string,
                  ])[]
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
                    userFeePer100Nutrition: parseNonNegative(
                      event.target.value,
                    ),
                  })
                }
                className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
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
                className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 border-t border-border pt-3 md:grid-cols-2">
            <label>
              <span className="flex items-center gap-1.5 text-xs text-text-faint">
                Item Value del objeto
                <InfoHint
                  label="Item Value"
                  text="Valor interno que Albion usa para obtener la nutrición. No es el precio de mercado ni el Total Cost mostrado al fabricar."
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
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular text-text outline-none placeholder:text-[11px] focus-visible:ring-2 focus-visible:ring-accent-border"
                />

                {itemValueOverride !== null && detectedItemValue !== null && (
                  <button
                    type="button"
                    onClick={() => onItemValueOverrideChange(null)}
                    className="rounded-md border border-border bg-surface-raised px-2 text-[11px] text-text-muted hover:text-text"
                  >
                    Usar detectado
                  </button>
                )}
              </div>

              <p className="mt-1 text-[11px] text-text-faint">
                {itemValueOverride !== null
                  ? 'Valor manual usado solo por la estimación avanzada.'
                  : detectedItemValue !== null
                    ? 'Valor detectado desde el dataset.'
                    : 'El dataset no incluye este dato; puedes dejarlo vacío si usas el Total Cost directo.'}
              </p>
            </label>

            <div className="rounded-md border border-border bg-surface-raised p-3 text-xs">
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
                <span className="font-medium text-text">Costo estimado</span>
                <span className="font-semibold tabular text-accent">
                  {formatNumber(breakdown.estimatedTotalFee, 0)} plata
                </span>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}
