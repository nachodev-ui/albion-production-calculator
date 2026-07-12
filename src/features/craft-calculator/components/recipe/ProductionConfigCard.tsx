import {
  HIDEOUT_POWER_LEVELS,
  HIDEOUT_ZONE_QUALITIES,
  PRODUCTION_LOCATIONS,
  calculateReturnRate,
  getHideoutBaseReturnRate,
  returnRateToProductionBonus,
} from '@core/domain/entities'
import type {
  CityId,
  HideoutPowerLevel,
  HideoutZoneQuality,
  NodeReturnRateConfig,
} from '@core/domain/entities'
import type { CraftingStation } from '@core/domain/entities/Recipe'
import type {
  CraftingSpecializationConfig,
  FocusCostBreakdown,
  StationFeeBreakdown,
  StationFeeConfig,
  StationUsageFeeOverride,
} from '@core/domain/entities/ProductionEconomy'
import type { ProductionCityRecommendation } from '../../utils/productionRecommendation'
import { normalizeProductionConfigForRecommendation } from '../../utils/productionRecommendation'
import { CraftPresetManager } from './CraftPresetManager'
import { CraftingSpecializationPanel } from './CraftingSpecializationPanel'
import { StationFeeConfigPanel } from './StationFeeConfigPanel'

interface ProductionConfigCardProps {
  readonly config: NodeReturnRateConfig
  readonly recommendation: ProductionCityRecommendation | null
  readonly isPremium: boolean
  readonly station: CraftingStation
  readonly quantity: number
  readonly stationFeeConfig: StationFeeConfig
  readonly craftingSpecializationConfig: CraftingSpecializationConfig
  readonly detectedItemValue: number | null
  readonly itemValueOverride: number | null
  readonly stationUsageFeeOverride: StationUsageFeeOverride | null
  readonly stationFeeBreakdown: StationFeeBreakdown
  readonly focusCostBreakdown: FocusCostBreakdown
  readonly onChange: (config: NodeReturnRateConfig) => void
  readonly onPremiumChange: (isPremium: boolean) => void
  readonly onStationFeeConfigChange: (config: StationFeeConfig) => void
  readonly onCraftingSpecializationConfigChange: (
    config: CraftingSpecializationConfig,
  ) => void
  readonly onItemValueOverrideChange: (value: number | null) => void
  readonly onStationUsageFeeOverrideChange: (
    value: StationUsageFeeOverride | null,
  ) => void
}

function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function ProductionConfigCard({
  config,
  recommendation,
  isPremium,
  station,
  quantity,
  stationFeeConfig,
  craftingSpecializationConfig,
  detectedItemValue,
  itemValueOverride,
  stationUsageFeeOverride,
  stationFeeBreakdown,
  focusCostBreakdown,
  onChange,
  onPremiumChange,
  onStationFeeConfigChange,
  onCraftingSpecializationConfigChange,
  onItemValueOverrideChange,
  onStationUsageFeeOverrideChange,
}: ProductionConfigCardProps) {
  const rrr = calculateReturnRate(config)
  const isHideout = config.cityId === 'hideout'
  const hideoutZoneQuality = config.hideoutZoneQuality ?? 1
  const hideoutPowerLevel = config.hideoutPowerLevel ?? 1
  const hideoutWithoutFocus = getHideoutBaseReturnRate(
    hideoutZoneQuality,
    hideoutPowerLevel,
    false,
  )
  const hideoutWithFocus = getHideoutBaseReturnRate(
    hideoutZoneQuality,
    hideoutPowerLevel,
    true,
  )
  const hideoutProductionBonus = returnRateToProductionBonus(hideoutWithoutFocus)

  function commit(nextConfig: NodeReturnRateConfig) {
    onChange(
      normalizeProductionConfigForRecommendation(nextConfig, recommendation),
    )
  }

  function update(patch: Partial<NodeReturnRateConfig>) {
    commit({ ...config, ...patch })
  }

  function handleCityChange(cityId: CityId) {
    update({
      cityId,
      isHideout: cityId === 'hideout',
      hideoutZoneQuality: config.hideoutZoneQuality ?? 1,
      hideoutPowerLevel: config.hideoutPowerLevel ?? 1,
    })
  }

  const isRecommendedCity =
    recommendation !== null && config.cityId === recommendation.cityId

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">
          Configuración de producción
        </h3>
        <p className="mt-1 text-xs text-text-faint">
          Ajusta retorno, ubicación, tarifa del puesto y bonos pasivos.
        </p>
      </div>

      <CraftPresetManager
        config={config}
        isPremium={isPremium}
        stationFeeConfig={stationFeeConfig}
        craftingSpecializationConfig={craftingSpecializationConfig}
        onConfigChange={commit}
        onPremiumChange={onPremiumChange}
        onStationFeeConfigChange={onStationFeeConfigChange}
        onCraftingSpecializationConfigChange={
          onCraftingSpecializationConfigChange
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-text-muted">
                Ubicación de producción
              </label>
              {isRecommendedCity && (
                <span className="rounded-md border border-positive/35 bg-positive-muted px-2 py-0.5 text-[11px] font-medium text-positive">
                  Recomendada
                </span>
              )}
            </div>
            {recommendation && !isHideout && (
              <p className="mt-1 text-[11px] text-text-faint">
                Bono para {recommendation.specialtyLabel}:{' '}
                {recommendation.cityName}.
              </p>
            )}
          </div>

          <select
            value={config.cityId}
            onChange={(event) => handleCityChange(event.target.value as CityId)}
            className="min-w-48 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {PRODUCTION_LOCATIONS.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
                {recommendation?.cityId === city.id ? ' · Recomendada' : ''}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
            isRecommendedCity
              ? 'border-positive/30 bg-positive-muted/60'
              : 'border-border bg-surface-raised'
          }`}
        >
          <div>
            <span className="text-sm text-text-muted">
              {isHideout ? 'Bono de Hideout' : 'Bono de especialidad'}
            </span>
            <p className="mt-1 text-[11px] text-text-faint">
              {isHideout
                ? 'Calculado por calidad de zona y nivel de poder del HO.'
                : recommendation
                  ? isRecommendedCity
                    ? `Activo automáticamente para ${recommendation.specialtyLabel}.`
                    : `No aplica aquí. La ciudad recomendada es ${recommendation.cityName}.`
                  : 'No se detectó una ciudad con bono para esta categoría.'}
            </p>
          </div>
          <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              isHideout || isRecommendedCity
                ? 'border-positive/35 bg-positive-muted text-positive'
                : 'border-border bg-surface text-text-faint'
            }`}
          >
            {isHideout
              ? 'Configurable'
              : isRecommendedCity
                ? 'Activo'
                : 'No aplica'}
          </span>
        </div>

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

      {isHideout && (
        <div className="mt-3 rounded-xl border border-accent-border/40 bg-accent-muted/20 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-text">
              Configuración del Hideout
            </h4>
            <p className="mt-1 text-xs text-text-faint">
              Selecciona la calidad de la zona y el nivel de poder/energía que
              muestra el HO.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm text-text-muted">
              <span>Calidad de zona</span>
              <select
                value={hideoutZoneQuality}
                onChange={(event) =>
                  update({
                    hideoutZoneQuality: Number(
                      event.target.value,
                    ) as HideoutZoneQuality,
                  })
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                {HIDEOUT_ZONE_QUALITIES.map((quality) => (
                  <option key={quality} value={quality}>
                    Calidad {quality}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm text-text-muted">
              <span>Nivel de poder/energía</span>
              <select
                value={hideoutPowerLevel}
                onChange={(event) =>
                  update({
                    hideoutPowerLevel: Number(
                      event.target.value,
                    ) as HideoutPowerLevel,
                  })
                }
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                {HIDEOUT_POWER_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    Nivel {level}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface-raised p-3">
              <span className="text-text-faint">Bono equivalente</span>
              <strong className="mt-1 block font-mono text-text">
                +{formatPercent(hideoutProductionBonus)}
              </strong>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised p-3">
              <span className="text-text-faint">RRR sin foco</span>
              <strong className="mt-1 block font-mono text-text">
                {formatPercent(hideoutWithoutFocus)}
              </strong>
            </div>
            <div className="rounded-lg border border-border bg-surface-raised p-3">
              <span className="text-text-faint">RRR con foco</span>
              <strong className="mt-1 block font-mono text-positive">
                {formatPercent(hideoutWithFocus)}
              </strong>
            </div>
          </div>
        </div>
      )}

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
            {formatPercent(rrr)}
          </span>
        </div>
      </div>

      <StationFeeConfigPanel
        station={station}
        quantity={quantity}
        config={stationFeeConfig}
        detectedItemValue={detectedItemValue}
        itemValueOverride={itemValueOverride}
        manualTotalCost={stationUsageFeeOverride}
        breakdown={stationFeeBreakdown}
        onChange={onStationFeeConfigChange}
        onItemValueOverrideChange={onItemValueOverrideChange}
        onManualTotalCostChange={onStationUsageFeeOverrideChange}
      />

      <CraftingSpecializationPanel
        config={craftingSpecializationConfig}
        breakdown={focusCostBreakdown}
        onChange={onCraftingSpecializationConfigChange}
      />
    </section>
  )
}
