import { asBaseItemId } from '@core/domain/entities/Item'
import type { BaseItemId } from '@core/domain/entities/Item'
import { isValidEnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'
import type {
  CraftingSpecializationConfig,
  StationAccessType,
  StationFeeConfig,
  StationUsageFeeOverride,
} from '@core/domain/entities/ProductionEconomy'
import type { NodePath } from '@core/usecases/calculateCraftCost'

export const CRAFT_WORKSPACE_STORAGE_KEY =
  'albion-production-calculator:craft-workspace:v1'

const STORAGE_VERSION = 1
const VALID_ACCESS_TYPES = new Set<StationAccessType>([
  'user',
  'associate',
  'free',
])

export interface CraftWorkspaceState {
  readonly selectedItemId: BaseItemId | null
  readonly enchantmentsByItem: ReadonlyMap<BaseItemId, EnchantmentLevel>
  readonly quantitiesByRoot: ReadonlyMap<string, number>
  readonly expandedPathsByRoot: ReadonlyMap<string, ReadonlySet<NodePath>>
  readonly selectedRecipeOptionsByRoot: ReadonlyMap<
    string,
    ReadonlyMap<NodePath, number>
  >
  readonly productionConfig: NodeReturnRateConfig | null
  readonly stationFeeConfig: StationFeeConfig | null
  readonly craftingSpecializationConfig: CraftingSpecializationConfig | null
  readonly itemValueOverridesByRoot: ReadonlyMap<string, number>
  readonly stationUsageFeeOverridesByRoot: ReadonlyMap<
    string,
    StationUsageFeeOverride
  >
  readonly isPremium: boolean | null
}

interface SerializedCraftWorkspace {
  readonly version: number
  readonly selectedItemId: string | null
  readonly enchantmentsByItem: readonly (readonly [string, number])[]
  readonly quantitiesByRoot: readonly (readonly [string, number])[]
  readonly expandedPathsByRoot: readonly (readonly [string, readonly string[]])[]
  readonly selectedRecipeOptionsByRoot: readonly (
    readonly [string, readonly (readonly [string, number])[]]
  )[]
  readonly productionConfig: NodeReturnRateConfig | null
  readonly stationFeeConfig: StationFeeConfig | null
  readonly craftingSpecializationConfig: CraftingSpecializationConfig | null
  readonly itemValueOverridesByRoot: readonly (readonly [string, number])[]
  readonly stationUsageFeeOverridesByRoot: readonly (
    readonly [string, StationUsageFeeOverride]
  )[]
  readonly isPremium: boolean | null
}

export const EMPTY_CRAFT_WORKSPACE: CraftWorkspaceState = {
  selectedItemId: null,
  enchantmentsByItem: new Map(),
  quantitiesByRoot: new Map(),
  expandedPathsByRoot: new Map(),
  selectedRecipeOptionsByRoot: new Map(),
  productionConfig: null,
  stationFeeConfig: null,
  craftingSpecializationConfig: null,
  itemValueOverridesByRoot: new Map(),
  stationUsageFeeOverridesByRoot: new Map(),
  isPremium: null,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value > 0
}

function parseStringNumberMap(
  value: unknown,
  validateValue: (entry: unknown) => entry is number,
): Map<string, number> {
  const result = new Map<string, number>()
  if (!Array.isArray(value)) return result

  for (const entry of value) {
    if (
      Array.isArray(entry) &&
      entry.length === 2 &&
      isNonEmptyString(entry[0]) &&
      validateValue(entry[1])
    ) {
      result.set(entry[0], entry[1])
    }
  }

  return result
}

function parseEnchantments(value: unknown): Map<BaseItemId, EnchantmentLevel> {
  const result = new Map<BaseItemId, EnchantmentLevel>()
  if (!Array.isArray(value)) return result

  for (const entry of value) {
    if (
      Array.isArray(entry) &&
      entry.length === 2 &&
      isNonEmptyString(entry[0]) &&
      typeof entry[1] === 'number' &&
      isValidEnchantmentLevel(entry[1])
    ) {
      result.set(asBaseItemId(entry[0]), entry[1])
    }
  }

  return result
}

function parseExpandedPaths(
  value: unknown,
): Map<string, ReadonlySet<NodePath>> {
  const result = new Map<string, ReadonlySet<NodePath>>()
  if (!Array.isArray(value)) return result

  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !isNonEmptyString(entry[0]) ||
      !Array.isArray(entry[1])
    ) {
      continue
    }

    const paths = entry[1].filter(isNonEmptyString)
    if (paths.length > 0) result.set(entry[0], new Set(paths))
  }

  return result
}

function parseRecipeOptions(
  value: unknown,
): Map<string, ReadonlyMap<NodePath, number>> {
  const result = new Map<string, ReadonlyMap<NodePath, number>>()
  if (!Array.isArray(value)) return result

  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !isNonEmptyString(entry[0])
    ) {
      continue
    }

    const options = parseStringNumberMap(entry[1], (option): option is number =>
      Number.isInteger(option) && typeof option === 'number' && option >= 0,
    )
    if (options.size > 0) result.set(entry[0], options)
  }

  return result
}

function parseProductionConfig(value: unknown): NodeReturnRateConfig | null {
  if (!isRecord(value) || !isNonEmptyString(value['cityId'])) return null

  if (
    typeof value['hasSpecialtyBonus'] !== 'boolean' ||
    (value['specialtyKind'] !== 'crafting' &&
      value['specialtyKind'] !== 'refining') ||
    typeof value['useFocus'] !== 'boolean' ||
    typeof value['hasDailyBonus'] !== 'boolean' ||
    (value['dailyBonusAmount'] !== 0.1 && value['dailyBonusAmount'] !== 0.2) ||
    typeof value['isIsland'] !== 'boolean'
  ) {
    return null
  }

  return {
    cityId: value['cityId'],
    hasSpecialtyBonus: value['hasSpecialtyBonus'],
    specialtyKind: value['specialtyKind'],
    useFocus: value['useFocus'],
    hasDailyBonus: value['hasDailyBonus'],
    dailyBonusAmount: value['dailyBonusAmount'],
    isIsland: value['isIsland'],
    isHideout: value['isHideout'] === true,
    hideoutPowerLevel:
      typeof value['hideoutPowerLevel'] === 'number'
        ? (value['hideoutPowerLevel'] as NodeReturnRateConfig['hideoutPowerLevel'])
        : undefined,
    hideoutZoneQuality:
      typeof value['hideoutZoneQuality'] === 'number'
        ? (value['hideoutZoneQuality'] as NodeReturnRateConfig['hideoutZoneQuality'])
        : undefined,
    hideoutSpecialized: value['hideoutSpecialized'] === true,
  }
}

function parseStationFeeConfig(value: unknown): StationFeeConfig | null {
  if (!isRecord(value) || !VALID_ACCESS_TYPES.has(value['accessType'] as StationAccessType)) {
    return null
  }

  if (
    !isNonNegativeNumber(value['userFeePer100Nutrition']) ||
    !isNonNegativeNumber(value['associateFeePer100Nutrition'])
  ) {
    return null
  }

  return {
    accessType: value['accessType'] as StationAccessType,
    userFeePer100Nutrition: value['userFeePer100Nutrition'],
    associateFeePer100Nutrition: value['associateFeePer100Nutrition'],
  }
}

function parseSpecializationConfig(
  value: unknown,
): CraftingSpecializationConfig | null {
  if (!isRecord(value)) return null

  if (
    !isNonNegativeNumber(value['focusCostEfficiency']) ||
    !isNonNegativeNumber(value['availableFocus']) ||
    !isNonNegativeNumber(value['qualityIncrease'])
  ) {
    return null
  }

  return {
    focusCostEfficiency: value['focusCostEfficiency'],
    availableFocus: value['availableFocus'],
    qualityIncrease: value['qualityIncrease'],
    hideoutSpecialistBonus: isNonNegativeNumber(value['hideoutSpecialistBonus'])
      ? value['hideoutSpecialistBonus']
      : 0,
  }
}

function parseStationUsageFeeOverrides(
  value: unknown,
): Map<string, StationUsageFeeOverride> {
  const result = new Map<string, StationUsageFeeOverride>()
  if (!Array.isArray(value)) return result

  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !isNonEmptyString(entry[0]) ||
      !isRecord(entry[1]) ||
      !isNonNegativeNumber(entry[1]['totalFee']) ||
      !isPositiveInteger(entry[1]['quantity']) ||
      !isPositiveInteger(entry[1]['craftsNeeded'])
    ) {
      continue
    }

    result.set(entry[0], {
      totalFee: entry[1]['totalFee'],
      quantity: entry[1]['quantity'],
      craftsNeeded: entry[1]['craftsNeeded'],
    })
  }

  return result
}

export function deserializeCraftWorkspace(value: unknown): CraftWorkspaceState {
  if (!isRecord(value) || value['version'] !== STORAGE_VERSION) {
    return EMPTY_CRAFT_WORKSPACE
  }

  return {
    selectedItemId: isNonEmptyString(value['selectedItemId'])
      ? asBaseItemId(value['selectedItemId'])
      : null,
    enchantmentsByItem: parseEnchantments(value['enchantmentsByItem']),
    quantitiesByRoot: parseStringNumberMap(
      value['quantitiesByRoot'],
      isPositiveInteger,
    ),
    expandedPathsByRoot: parseExpandedPaths(value['expandedPathsByRoot']),
    selectedRecipeOptionsByRoot: parseRecipeOptions(
      value['selectedRecipeOptionsByRoot'],
    ),
    productionConfig: parseProductionConfig(value['productionConfig']),
    stationFeeConfig: parseStationFeeConfig(value['stationFeeConfig']),
    craftingSpecializationConfig: parseSpecializationConfig(
      value['craftingSpecializationConfig'],
    ),
    itemValueOverridesByRoot: parseStringNumberMap(
      value['itemValueOverridesByRoot'],
      isNonNegativeNumber,
    ),
    stationUsageFeeOverridesByRoot: parseStationUsageFeeOverrides(
      value['stationUsageFeeOverridesByRoot'],
    ),
    isPremium:
      typeof value['isPremium'] === 'boolean' ? value['isPremium'] : null,
  }
}

export function serializeCraftWorkspace(
  state: CraftWorkspaceState,
): SerializedCraftWorkspace {
  return {
    version: STORAGE_VERSION,
    selectedItemId: state.selectedItemId,
    enchantmentsByItem: Array.from(state.enchantmentsByItem.entries()),
    quantitiesByRoot: Array.from(state.quantitiesByRoot.entries()),
    expandedPathsByRoot: Array.from(state.expandedPathsByRoot.entries()).map(
      ([rootKey, paths]) => [rootKey, Array.from(paths)],
    ),
    selectedRecipeOptionsByRoot: Array.from(
      state.selectedRecipeOptionsByRoot.entries(),
    ).map(([rootKey, options]) => [rootKey, Array.from(options.entries())]),
    productionConfig: state.productionConfig,
    stationFeeConfig: state.stationFeeConfig,
    craftingSpecializationConfig: state.craftingSpecializationConfig,
    itemValueOverridesByRoot: Array.from(
      state.itemValueOverridesByRoot.entries(),
    ),
    stationUsageFeeOverridesByRoot: Array.from(
      state.stationUsageFeeOverridesByRoot.entries(),
    ),
    isPremium: state.isPremium,
  }
}

export function loadCraftWorkspace(): CraftWorkspaceState {
  if (typeof window === 'undefined') return EMPTY_CRAFT_WORKSPACE

  try {
    const raw = window.localStorage.getItem(CRAFT_WORKSPACE_STORAGE_KEY)
    return raw ? deserializeCraftWorkspace(JSON.parse(raw) as unknown) : EMPTY_CRAFT_WORKSPACE
  } catch {
    return EMPTY_CRAFT_WORKSPACE
  }
}

export function saveCraftWorkspace(state: CraftWorkspaceState): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      CRAFT_WORKSPACE_STORAGE_KEY,
      JSON.stringify(serializeCraftWorkspace(state)),
    )
  } catch {
    // La calculadora continúa operativa aunque el navegador bloquee storage.
  }
}

export function updateCraftWorkspace(
  update: (current: CraftWorkspaceState) => CraftWorkspaceState,
): CraftWorkspaceState {
  const next = update(loadCraftWorkspace())
  saveCraftWorkspace(next)
  return next
}

export function buildCraftWorkspaceRootKey(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
): string {
  return `${itemId}@${enchantment}`
}
