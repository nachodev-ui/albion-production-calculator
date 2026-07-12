import { useEffect } from 'react'
import {
  CITIES,
  HIDEOUT_BASE_PRODUCTION_BONUS,
  HIDEOUT_POWER_PROFILES,
  calculateReturnRateBreakdown,
  getHideoutPowerProfile,
} from '@core/domain/entities'
import type {
  CityId,
  HideoutPowerLevel,
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

function formatPercent(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(value)
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
  const isHideout = config.cityId === 'hideout' || config.isHideout === true
  const isIsland = config.cityId === 'island'
  const hideoutProfile = getHideoutPowerProfile(config.hideoutPowerLevel)
  const rrrBreakdown = calculateReturnRateBreakdown(config)
  const isRecommendedCity =
    !isHideout &&
    !isIsland &&
    recommendation !== null &&
    config.cityId === recommendation.cityId
  const activeHideoutSpecialistBonus =
    isHideout && config.hideoutSpecialized === true
      ? hideoutProfile.specialistCraftingBonus
      : 0

  function syncHideoutFocusBonus(nextConfig: NodeReturnRateConfig) {
    const nextIsHideout =
      nextConfig.cityId === 'hideout' || nextConfig.isHideout === true
    const nextProfile = getHideoutPowerProfile(nextConfig.hideoutPowerLevel)
    const nextBonus =
      nextIsHideout && nextConfig.hideoutSpecialized === true
        ? nextProfile.specialistCraftingBonus
        : 0

    if (
      (craftingSpecializationConfig.hideoutSpecialistBonus ?? 0) === nextBonus
    ) {
      return
    }

    onCraftingSpecializationConfigChange({
      ...craftingSpecializationConfig,
      hideoutSpecialistBonus: nextBonus,
    })
  }

  useEffect(() => {
    syncHideoutFocusBonus(config)
    // La sincronización solo depende del estado efectivo del HO y del bono guardado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.cityId,
    config.isHideout,
    config.hideoutPowerLevel,
    config.hideoutSpecialized,
    craftingSpecializationConfig.hideoutSpecialistBonus,
  ])

  function commit(nextConfig: NodeReturnRateConfig) {
    const normalized = normalizeProductionConfigForRecommendation(
      nextConfig,
      recommendation,
    )
    syncHideoutFocusBonus(normalized)
    onChange(normalized)
  }

  function update(patch: Partial<NodeReturnRateConfig>) {
    commit({ ...config, ...patch })
  }

  function handleCityChange(cityId: CityId) {
    update({ cityId })
  }

  function handleHideoutLevelChange(level: HideoutPowerLevel) {
    update({ hideoutPowerLevel: level })
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">
          Configuración de producción
        </h3>

        <p className="mt-1 text-xs text-text-faint">
          Ajusta el lugar de producción, retorno, tarifa del puesto y bonos de
          especialización.
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
                Lugar de producción
              </label>
              {isRecommendedCity && (
                <span className="rounded-md border border-positive/35 bg-positive-muted px-2 py-0.5 text-[11px] font-medium text-positive">
                  Recomendada
                </span>
              )}
            </div>
            {recommendation && (
              <p className="mt-1 text-[11px] text-text-faint">
                Bono urbano para {recommendation.specialtyLabel}:{' '}
                {recommendation.cityName}.
              </p>
            )}
          </div>

          <select
            aria-label="Lugar de producción"
            value={config.cityId}
            onChange={(event) => handleCityChange(event.target.value as CityId)}
            className="min-w-48 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {CITIES.map((city) => (
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
              Bono de especialidad
            </span>
            <p className="mt-1 text-[11px] text-text-faint">
              {isHideout
                ? 'El HO usa sus bonos de energía y especialización propios.'
                : isIsland
                  ? 'Las islas no tienen bono local ni especialidad de ciudad.'
                  : recommendation
                    ? isRecommendedCity
                      ? `Activo automáticamente para ${recommendation.specialtyLabel}.`
                      : `No aplica aquí. La ciudad recomendada es ${recommendation.cityName}.`
                    : 'No se detectó una ciudad con bono para esta categoría.'}
            </p>
          </div>

          <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${
              isRecommendedCity
                ? 'border-positive/35 bg-positive-muted text-positive'
                : isHideout
                  ? 'border-accent-border bg-accent-muted text-accent'
                  : 'border-border bg-surface text-text-faint'
            }`}
          >
            {isRecommendedCity ? 'Activo' : isHideout ? 'Bonos HO' : 'No aplica'}
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
        <div className="mt-3 rounded-lg border border-accent-border/60 bg-accent-muted/30 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h4 className="text-sm font-medium text-text">
                Calidad y energía del Hideout
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
                El nivel de poder del HO determina el bono general de producción
                y el bono especialista. El bono general entra al RRR; el
                especialista reduce el foco cuando el HO está especializado para
                este objeto.
              </p>
            </div>

            <label className="min-w-64">
              <span className="text-xs text-text-faint">Nivel de energía</span>
              <select
                aria-label="Nivel de energía del Hideout"
                value={hideoutProfile.level}
                onChange={(event) =>
                  handleHideoutLevelChange(
                    Number(event.target.value) as HideoutPowerLevel,
                  )
                }
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
              >
                {HIDEOUT_POWER_PROFILES.map((profile) => (
                  <option key={profile.level} value={profile.level}>
                    Nivel {profile.level} · {formatNumber(profile.powerPointsPool)} energía · +
                    {formatPercent(profile.generalistCraftingBonus)} general
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-border bg-surface p-2.5">
              <span className="text-[11px] text-text-faint">Bono base del HO</span>
              <p className="mt-1 font-mono text-sm font-medium text-text">
                +{formatPercent(HIDEOUT_BASE_PRODUCTION_BONUS)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface p-2.5">
              <span className="text-[11px] text-text-faint">
                Bono general por energía
              </span>
              <p className="mt-1 font-mono text-sm font-medium text-positive">
                +{formatPercent(hideoutProfile.generalistCraftingBonus)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface p-2.5">
              <span className="text-[11px] text-text-faint">
                Bono especialista disponible
              </span>
              <p className="mt-1 font-mono text-sm font-medium text-accent">
                +{formatPercent(hideoutProfile.specialistCraftingBonus)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface p-2.5">
              <span className="text-[11px] text-text-faint">
                Bono local para RRR
              </span>
              <p className="mt-1 font-mono text-sm font-medium text-text">
                +
                {formatPercent(
                  HIDEOUT_BASE_PRODUCTION_BONUS +
                    hideoutProfile.generalistCraftingBonus,
                )}
              </p>
            </div>
          </div>

          <label className="mt-3 flex items-start justify-between gap-4 rounded-md border border-border bg-surface p-3">
            <span>
              <span className="block text-sm text-text-muted">
                HO especializado para este objeto
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-text-faint">
                Aplica +{formatPercent(hideoutProfile.specialistCraftingBonus)}
                {' '}como eficiencia adicional de foco. No se suma nuevamente al
                RRR.
              </span>
            </span>
            <input
              type="checkbox"
              checked={config.hideoutSpecialized === true}
              onChange={(event) =>
                update({ hideoutSpecialized: event.target.checked })
              }
              className="mt-0.5 accent-accent"
            />
          </label>

          {activeHideoutSpecialistBonus > 0 && (
            <p className="mt-2 text-xs text-accent">
              Especialización activa: +
              {formatPercent(activeHideoutSpecialistBonus)} de eficiencia del HO
              y ahorro estimado de {formatNumber(
                focusCostBreakdown.focusSavedByHideoutPerCraft,
              )} de foco por tirada.
            </p>
          )}
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm text-text-faint">
              Return Rate resultante
            </span>
            <p className="mt-1 text-[11px] text-text-faint">
              Bono de producción total: +
              {formatPercent(rrrBreakdown.totalProductionBonus)}
            </p>
          </div>

          <span className="font-mono text-lg font-semibold text-positive">
            {formatPercent(rrrBreakdown.returnRate, 1)}
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
