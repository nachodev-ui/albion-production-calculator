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
  hideoutZoneQuality: 1,
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
      hideoutZoneQuality: 1,
      hideoutSpecialized: false,
      hasSpecialtyBonus: true,
      useFocus: true,
      hasDailyBonus: true,
      dailyBonusAmount: 0.2,
    })
  })

  it('mantiene el specialtyKind del objeto al aplicar un preset', () => {
    const applied = applyPresetProductionConfig(
      { ...craftingConfig, specialtyKind: 'refining' },
      toPresetProductionConfig(craftingConfig),
    )
    expect(applied.specialtyKind).toBe('refining')
    expect(applied.cityId).toBe('bridgewatch')
  })

  it('detecta cambios en producción o Premium', () => {
    const preset: CraftPreset = {
      id: 'preset-1',
      name: 'Bridgewatch con foco',
      productionConfig: toPresetProductionConfig(craftingConfig),
      isPremium: true,
    }
    expect(doesPresetMatchCurrentConfig(preset, craftingConfig, true)).toBe(true)
    expect(
      doesPresetMatchCurrentConfig(
        preset,
        { ...craftingConfig, useFocus: false },
        true,
      ),
    ).toBe(false)
    expect(doesPresetMatchCurrentConfig(preset, craftingConfig, false)).toBe(false)
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

  it('guarda calidad, nivel y especialización del Hideout', () => {
    const hideoutConfig: NodeReturnRateConfig = {
      ...craftingConfig,
      cityId: 'hideout',
      isIsland: false,
      isHideout: true,
      hideoutPowerLevel: 9,
      hideoutZoneQuality: 6,
      hideoutSpecialized: true,
      hasSpecialtyBonus: true,
    }
    const saved = toPresetProductionConfig(hideoutConfig)
    expect(saved.hideoutPowerLevel).toBe(9)
    expect(saved.hideoutZoneQuality).toBe(6)
    expect(saved.hideoutSpecialized).toBe(true)
    expect(saved.hasSpecialtyBonus).toBe(false)
  })

  it('considera la calidad de zona al comparar presets', () => {
    const hideoutConfig: NodeReturnRateConfig = {
      ...craftingConfig,
      cityId: 'hideout',
      isHideout: true,
      hideoutPowerLevel: 8,
      hideoutZoneQuality: 5,
      hideoutSpecialized: true,
      hasSpecialtyBonus: false,
    }
    const preset: CraftPreset = {
      id: 'preset-ho',
      name: 'HO calidad 5 nivel 8',
      productionConfig: toPresetProductionConfig(hideoutConfig),
      isPremium: true,
    }
    expect(
      doesPresetMatchCurrentConfig(preset, hideoutConfig, true),
    ).toBe(true)
    expect(
      doesPresetMatchCurrentConfig(
        preset,
        { ...hideoutConfig, hideoutZoneQuality: 6 },
        true,
      ),
    ).toBe(false)
  })
})
