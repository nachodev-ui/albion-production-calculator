import { create } from 'zustand'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'
import {
  createCraftPresetId,
  loadCraftPresetStorage,
  saveCraftPresetStorage,
  toPresetProductionConfig,
} from './craftPresetStorage'
import type { CraftPreset } from './craftPresetStorage'

interface CraftPresetState {
  readonly presets: readonly CraftPreset[]
  readonly defaultPresetId: string | null
  readonly activePresetId: string | null

  createPreset: (
    name: string,
    config: NodeReturnRateConfig,
    isPremium: boolean,
  ) => string | null
  updatePreset: (
    presetId: string,
    config: NodeReturnRateConfig,
    isPremium: boolean,
  ) => void
  renamePreset: (presetId: string, name: string) => void
  deletePreset: (presetId: string) => void
  setDefaultPreset: (presetId: string | null) => void
  setActivePreset: (presetId: string | null) => void
}

const initialStorage = loadCraftPresetStorage()

function persist(
  presets: readonly CraftPreset[],
  defaultPresetId: string | null,
): void {
  saveCraftPresetStorage({ presets, defaultPresetId })
}

export const useCraftPresetStore = create<CraftPresetState>((set, get) => ({
  presets: initialStorage.presets,
  defaultPresetId: initialStorage.defaultPresetId,
  activePresetId: initialStorage.defaultPresetId,

  createPreset: (name, config, isPremium) => {
    const normalizedName = name.trim()

    if (normalizedName.length === 0) return null

    const duplicate = get().presets.some(
      (preset) =>
        preset.name.localeCompare(normalizedName, 'es', {
          sensitivity: 'base',
        }) === 0,
    )

    if (duplicate) return null

    const id = createCraftPresetId()
    const preset: CraftPreset = {
      id,
      name: normalizedName,
      productionConfig: toPresetProductionConfig(config),
      isPremium,
    }

    const presets = [...get().presets, preset]
    const defaultPresetId = get().defaultPresetId

    persist(presets, defaultPresetId)
    set({ presets, activePresetId: id })

    return id
  },

  updatePreset: (presetId, config, isPremium) => {
    const presets = get().presets.map((preset) =>
      preset.id === presetId
        ? {
            ...preset,
            productionConfig: toPresetProductionConfig(config),
            isPremium,
          }
        : preset,
    )

    persist(presets, get().defaultPresetId)
    set({ presets })
  },

  renamePreset: (presetId, name) => {
    const normalizedName = name.trim()

    if (normalizedName.length === 0) return

    const duplicate = get().presets.some(
      (preset) =>
        preset.id !== presetId &&
        preset.name.localeCompare(normalizedName, 'es', {
          sensitivity: 'base',
        }) === 0,
    )

    if (duplicate) return

    const presets = get().presets.map((preset) =>
      preset.id === presetId
        ? { ...preset, name: normalizedName }
        : preset,
    )

    persist(presets, get().defaultPresetId)
    set({ presets })
  },

  deletePreset: (presetId) => {
    const presets = get().presets.filter((preset) => preset.id !== presetId)
    const defaultPresetId =
      get().defaultPresetId === presetId
        ? null
        : get().defaultPresetId
    const activePresetId =
      get().activePresetId === presetId
        ? null
        : get().activePresetId

    persist(presets, defaultPresetId)
    set({ presets, defaultPresetId, activePresetId })
  },

  setDefaultPreset: (presetId) => {
    const validPresetId =
      presetId && get().presets.some((preset) => preset.id === presetId)
        ? presetId
        : null

    persist(get().presets, validPresetId)
    set({ defaultPresetId: validPresetId })
  },

  setActivePreset: (presetId) => {
    const validPresetId =
      presetId && get().presets.some((preset) => preset.id === presetId)
        ? presetId
        : null

    set({ activePresetId: validPresetId })
  },
}))
