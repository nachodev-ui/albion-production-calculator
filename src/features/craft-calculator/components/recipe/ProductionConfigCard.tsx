import { CITIES } from '@core/domain/entities'
import type { CityId, NodeReturnRateConfig } from '@core/domain/entities'
import { calculateReturnRate } from '@core/domain/entities'
import type { CraftingStation } from '@core/domain/entities/Recipe'
import type {
  CraftingSpecializationConfig,
  FocusCostBreakdown,
  StationFeeBreakdown,
  StationFeeConfig,
} from '@core/domain/entities/ProductionEconomy'
import { CraftPresetManager } from './CraftPresetManager'
import { CraftingSpecializationPanel } from './CraftingSpecializationPanel'
import { StationFeeConfigPanel } from './StationFeeConfigPanel'

interface ProductionConfigCardProps {
  readonly config: NodeReturnRateConfig
  readonly isPremium: boolean
  readonly station: CraftingStation
  readonly stationFeeConfig: StationFeeConfig
  readonly craftingSpecializationConfig: CraftingSpecializationConfig
  readonly detectedItemValue: number | null
  readonly itemValueOverride: number | null
  readonly stationFeeBreakdown: StationFeeBreakdown
  readonly focusCostBreakdown: FocusCostBreakdown
  readonly onChange: (config: NodeReturnRateConfig) => void
  readonly onPremiumChange: (isPremium: boolean) => void
  readonly onStationFeeConfigChange: (config: StationFeeConfig) => void
  readonly onCraftingSpecializationConfigChange: (
    config: CraftingSpecializationConfig,
  ) => void
  readonly onItemValueOverrideChange: (value: number | null) => void
}

export function ProductionConfigCard({
  config,
  isPremium,
  station,
  stationFeeConfig,
  craftingSpecializationConfig,
  detectedItemValue,
  itemValueOverride,
  stationFeeBreakdown,
  focusCostBreakdown,
  onChange,
  onPremiumChange,
  onStationFeeConfigChange,
  onCraftingSpecializationConfigChange,
  onItemValueOverrideChange,
}: ProductionConfigCardProps) {
  const rrr = calculateReturnRate(config)

  function update(patch: Partial<NodeReturnRateConfig>) {
    onChange({ ...config, ...patch })
  }

  function handleCityChange(cityId: CityId) {
    const isIsland = cityId === 'island'

    update({
      cityId,
      isIsland,
      hasSpecialtyBonus: isIsland ? false : config.hasSpecialtyBonus,
    })
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">
          Configuración de producción
        </h3>

        <p className="mt-1 text-xs text-text-faint">
          Ajusta retorno, tarifa del puesto y bonos pasivos de especialización.
        </p>
      </div>

      <CraftPresetManager
        config={config}
        isPremium={isPremium}
        stationFeeConfig={stationFeeConfig}
        craftingSpecializationConfig={craftingSpecializationConfig}
        onConfigChange={onChange}
        onPremiumChange={onPremiumChange}
        onStationFeeConfigChange={onStationFeeConfigChange}
        onCraftingSpecializationConfigChange={
          onCraftingSpecializationConfigChange
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <label className="text-sm text-text-muted">Ciudad</label>

          <select
            value={config.cityId}
            onChange={(event) =>
              handleCityChange(event.target.value as CityId)
            }
            className="min-w-44 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <label
          className={`flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 ${
            config.isIsland ? 'opacity-45' : ''
          }`}
        >
          <span className="text-sm text-text-muted">
            Bono de especialidad
          </span>

          <input
            type="checkbox"
            disabled={config.isIsland}
            checked={config.hasSpecialtyBonus}
            onChange={(event) =>
              update({ hasSpecialtyBonus: event.target.checked })
            }
            className="accent-accent"
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3">
          <span className="text-sm text-text-muted">Usar foco</span>

          <input
            type="checkbox"
            checked={config.useFocus}
            onChange={(event) => update({ useFocus: event.target.checked })}
            className="accent-accent"
          />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3">
          <span className="text-sm text-text-muted">Bono diario</span>

          <input
            type="checkbox"
            checked={config.hasDailyBonus}
            onChange={(event) =>
              update({ hasDailyBonus: event.target.checked })
            }
            className="accent-accent"
          />
        </label>
      </div>

      {config.hasDailyBonus && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3">
          <span className="text-sm text-text-muted">
            Magnitud del bono diario
          </span>

          <div className="inline-flex overflow-hidden rounded-md border border-border">
            {([0.1, 0.2] as const).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => update({ dailyBonusAmount: amount })}
                className={`px-3 py-1 text-xs font-mono transition-colors ${
                  config.dailyBonusAmount === amount
                    ? 'bg-accent text-bg'
                    : 'bg-surface text-text-muted hover:text-text'
                }`}
              >
                +{amount * 100}%
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-faint">
            Return Rate resultante
          </span>

          <span className="font-mono text-lg font-semibold text-positive">
            {Math.round(rrr * 100)}%
          </span>
        </div>
      </div>

      <StationFeeConfigPanel
        station={station}
        config={stationFeeConfig}
        detectedItemValue={detectedItemValue}
        itemValueOverride={itemValueOverride}
        breakdown={stationFeeBreakdown}
        onChange={onStationFeeConfigChange}
        onItemValueOverrideChange={onItemValueOverrideChange}
      />

      <CraftingSpecializationPanel
        config={craftingSpecializationConfig}
        breakdown={focusCostBreakdown}
        onChange={onCraftingSpecializationConfigChange}
      />
    </section>
  )
}
