import { describe, expect, it } from 'vitest'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'
import {
  applyPresetProductionConfig,
  doesPresetMatchCurrentConfig,
  toPresetProductionConfig,
} from './craftPresetStorage'
import type { CraftPreset } from './craftPresetStorage'

const craftingConfig: NodeReturnRateConfig = {
  cityId: 'bridgewatch',
  isIsland: false,
  isHideout: false,
  hideoutPowerLevel: 1,
  hideoutSpecialized: false,
  hasSpecialtyBonus: true,
  specialtyKind: 'crafting',
  useFocus: true,
  hasDailyBonus: true,
  dailyBonusAmount: 0.2,
}

describe('craftPresetStorage', () => {
  it('no guarda specialtyKind dentro del preset', () => {
    expect(toPresetProductionConfig(craftingConfig)).toEqual({
      cityId: 'bridgewatch',
      isIsland: false,
      isHideout: false,
      hideoutPowerLevel: 1,
      hideoutSpecialized: false,
      hasSpecialtyBonus: true,
      useFocus: true,
      hasDailyBonus: true,
      dailyBonusAmount: 0.2,
    })
  })

  it('mantiene el specialtyKind del objeto al aplicar un preset', () => {
    const refiningConfig: NodeReturnRateConfig = {
      ...craftingConfig,
      specialtyKind: 'refining',
    }

    const applied = applyPresetProductionConfig(
      refiningConfig,
      toPresetProductionConfig(craftingConfig),
    )

    expect(applied.specialtyKind).toBe('refining')
    expect(applied.cityId).toBe('bridgewatch')
    expect(applied.useFocus).toBe(true)
  })

  it('detecta cambios en producción o Premium', () => {
    const preset: CraftPreset = {
      id: 'preset-1',
      name: 'Bridgewatch con foco',
      productionConfig: toPresetProductionConfig(craftingConfig),
      isPremium: true,
    }

    expect(
      doesPresetMatchCurrentConfig(preset, craftingConfig, true),
    ).toBe(true)

    expect(
      doesPresetMatchCurrentConfig(
        preset,
        { ...craftingConfig, useFocus: false },
        true,
      ),
    ).toBe(false)

    expect(
      doesPresetMatchCurrentConfig(preset, craftingConfig, false),
    ).toBe(false)
  })

  it('desactiva la especialidad al guardar una configuración de isla', () => {
    const preset = toPresetProductionConfig({
      ...craftingConfig,
      cityId: 'island',
      isIsland: true,
      hasSpecialtyBonus: true,
    })

    expect(preset.hasSpecialtyBonus).toBe(false)
    expect(preset.isHideout).toBe(false)
  })

  it('guarda nivel y especialización del Hideout', () => {
    const hideoutConfig: NodeReturnRateConfig = {
      ...craftingConfig,
      cityId: 'hideout',
      isIsland: false,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutSpecialized: true,
      hasSpecialtyBonus: true,
    }

    expect(toPresetProductionConfig(hideoutConfig)).toEqual({
      cityId: 'hideout',
      isIsland: false,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutSpecialized: true,
      hasSpecialtyBonus: false,
      useFocus: true,
      hasDailyBonus: true,
      dailyBonusAmount: 0.2,
    })
  })

  it('considera nivel y especialización al comparar presets', () => {
    const hideoutConfig: NodeReturnRateConfig = {
      ...craftingConfig,
      cityId: 'hideout',
      isHideout: true,
      hideoutPowerLevel: 8,
      hideoutSpecialized: true,
      hasSpecialtyBonus: false,
    }
    const preset: CraftPreset = {
      id: 'preset-ho',
      name: 'HO nivel 8',
      productionConfig: toPresetProductionConfig(hideoutConfig),
      craftingSpecializationConfig: {
        focusCostEfficiency: 0,
        availableFocus: 0,
        qualityIncrease: 0,
        hideoutSpecialistBonus: 0.2625,
      },
      isPremium: true,
    }

    expect(
      doesPresetMatchCurrentConfig(
        preset,
        hideoutConfig,
        true,
        undefined,
        preset.craftingSpecializationConfig,
      ),
    ).toBe(true)
    expect(
      doesPresetMatchCurrentConfig(
        preset,
        { ...hideoutConfig, hideoutPowerLevel: 9 },
        true,
        undefined,
        preset.craftingSpecializationConfig,
      ),
    ).toBe(false)
  })
})
