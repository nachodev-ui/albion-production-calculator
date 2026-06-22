import { CITIES } from '@core/domain/entities/City'
import type { CityId } from '@core/domain/entities/City'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'

export const CRAFT_PRESET_STORAGE_KEY =
  'albion-craft-calculator:craft-presets:v1'

const STORAGE_VERSION = 1
const VALID_CITY_IDS = new Set<CityId>(CITIES.map((city) => city.id))

export interface CraftPresetProductionConfig {
  readonly cityId: CityId
  readonly isIsland: boolean
  readonly hasSpecialtyBonus: boolean
  readonly useFocus: boolean
  readonly hasDailyBonus: boolean
  readonly dailyBonusAmount: 0.1 | 0.2
}

export interface CraftPreset {
  readonly id: string
  readonly name: string
  readonly productionConfig: CraftPresetProductionConfig
  readonly isPremium: boolean
}

export interface CraftPresetStorageState {
  readonly presets: readonly CraftPreset[]
  readonly defaultPresetId: string | null
}

interface SerializedCraftPresetState {
  readonly version: number
  readonly presets: readonly CraftPreset[]
  readonly defaultPresetId: string | null
}

const EMPTY_STATE: CraftPresetStorageState = {
  presets: [],
  defaultPresetId: null,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCityId(value: unknown): value is CityId {
  return typeof value === 'string' && VALID_CITY_IDS.has(value as CityId)
}

function isDailyBonusAmount(value: unknown): value is 0.1 | 0.2 {
  return value === 0.1 || value === 0.2
}

function parseProductionConfig(
  value: unknown,
): CraftPresetProductionConfig | null {
  if (!isRecord(value) || !isCityId(value['cityId'])) return null

  if (
    typeof value['isIsland'] !== 'boolean' ||
    typeof value['hasSpecialtyBonus'] !== 'boolean' ||
    typeof value['useFocus'] !== 'boolean' ||
    typeof value['hasDailyBonus'] !== 'boolean' ||
    !isDailyBonusAmount(value['dailyBonusAmount'])
  ) {
    return null
  }

  const isIsland = value['cityId'] === 'island'

  return {
    cityId: value['cityId'],
    isIsland,
    hasSpecialtyBonus: isIsland ? false : value['hasSpecialtyBonus'],
    useFocus: value['useFocus'],
    hasDailyBonus: value['hasDailyBonus'],
    dailyBonusAmount: value['dailyBonusAmount'],
  }
}

function parsePreset(value: unknown): CraftPreset | null {
  if (!isRecord(value)) return null

  if (
    typeof value['id'] !== 'string' ||
    value['id'].trim().length === 0 ||
    typeof value['name'] !== 'string' ||
    value['name'].trim().length === 0 ||
    typeof value['isPremium'] !== 'boolean'
  ) {
    return null
  }

  const productionConfig = parseProductionConfig(value['productionConfig'])

  if (!productionConfig) return null

  return {
    id: value['id'],
    name: value['name'].trim(),
    productionConfig,
    isPremium: value['isPremium'],
  }
}

export function toPresetProductionConfig(
  config: NodeReturnRateConfig,
): CraftPresetProductionConfig {
  const cityId = isCityId(config.cityId) ? config.cityId : 'island'
  const isIsland = cityId === 'island'

  return {
    cityId,
    isIsland,
    hasSpecialtyBonus: isIsland ? false : config.hasSpecialtyBonus,
    useFocus: config.useFocus,
    hasDailyBonus: config.hasDailyBonus,
    dailyBonusAmount: config.dailyBonusAmount,
  }
}

export function applyPresetProductionConfig(
  currentConfig: NodeReturnRateConfig,
  presetConfig: CraftPresetProductionConfig,
): NodeReturnRateConfig {
  return {
    ...currentConfig,
    ...presetConfig,
    specialtyKind: currentConfig.specialtyKind,
  }
}

export function doesPresetMatchCurrentConfig(
  preset: CraftPreset,
  currentConfig: NodeReturnRateConfig,
  isPremium: boolean,
): boolean {
  const normalized = toPresetProductionConfig(currentConfig)
  const saved = preset.productionConfig

  return (
    normalized.cityId === saved.cityId &&
    normalized.isIsland === saved.isIsland &&
    normalized.hasSpecialtyBonus === saved.hasSpecialtyBonus &&
    normalized.useFocus === saved.useFocus &&
    normalized.hasDailyBonus === saved.hasDailyBonus &&
    normalized.dailyBonusAmount === saved.dailyBonusAmount &&
    isPremium === preset.isPremium
  )
}

export function createCraftPresetId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function loadCraftPresetStorage(): CraftPresetStorageState {
  if (typeof window === 'undefined') return EMPTY_STATE

  try {
    const raw = window.localStorage.getItem(CRAFT_PRESET_STORAGE_KEY)

    if (!raw) return EMPTY_STATE

    const parsed: unknown = JSON.parse(raw)

    if (!isRecord(parsed) || parsed['version'] !== STORAGE_VERSION) {
      return EMPTY_STATE
    }

    const rawPresets = Array.isArray(parsed['presets']) ? parsed['presets'] : []
    const presets = rawPresets
      .map(parsePreset)
      .filter((preset): preset is CraftPreset => preset !== null)

    const uniquePresets = Array.from(
      new Map(presets.map((preset) => [preset.id, preset])).values(),
    )

    const requestedDefaultId =
      typeof parsed['defaultPresetId'] === 'string'
        ? parsed['defaultPresetId']
        : null

    const defaultPresetId = uniquePresets.some(
      (preset) => preset.id === requestedDefaultId,
    )
      ? requestedDefaultId
      : null

    return {
      presets: uniquePresets,
      defaultPresetId,
    }
  } catch {
    return EMPTY_STATE
  }
}

export function saveCraftPresetStorage(
  state: CraftPresetStorageState,
): void {
  if (typeof window === 'undefined') return

  const payload: SerializedCraftPresetState = {
    version: STORAGE_VERSION,
    presets: state.presets,
    defaultPresetId: state.defaultPresetId,
  }

  try {
    window.localStorage.setItem(
      CRAFT_PRESET_STORAGE_KEY,
      JSON.stringify(payload),
    )
  } catch {
    // La aplicación sigue funcionando aunque el navegador bloquee storage.
  }
}
