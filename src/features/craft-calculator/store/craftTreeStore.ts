import { create } from 'zustand'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'
import {
  DEFAULT_CRAFTING_SPECIALIZATION_CONFIG,
  DEFAULT_STATION_FEE_CONFIG,
} from '@core/domain/entities/ProductionEconomy'
import type {
  CraftingSpecializationConfig,
  StationFeeConfig,
  StationUsageFeeOverride,
} from '@core/domain/entities/ProductionEconomy'
import type { NodePath } from '@core/usecases/calculateCraftCost'
import { DEFAULT_RETURN_RATE_CONFIG } from '@core/usecases/calculateCraftCost'
import {
  applyPresetProductionConfig,
  loadCraftPresetStorage,
} from './craftPresetStorage'
import { loadManualPrices, saveManualPrices } from './manualPriceStorage'
import type { ManualPricesByRoot } from './manualPriceStorage'

/**
 * Estado interactivo del árbol de cálculo para UN ítem raíz a la vez.
 *
 * Los precios manuales se mantienen por `rootKey` (ítem raíz +
 * encantamiento) y por path dentro de la receta. El caché completo se
 * guarda en localStorage, mientras que `manualPrices` representa solo
 * los precios de la receta actualmente abierta.
 *
 * IMPORTANTE: los Map/Set siempre se clonan antes de asignarlos para que
 * Zustand y React detecten correctamente el cambio de referencia.
 */
interface CraftTreeState {
  readonly rootKey: string | null
  readonly expandedPaths: ReadonlySet<NodePath>
  readonly manualPrices: ReadonlyMap<NodePath, number>
  readonly manualPricesByRoot: ManualPricesByRoot
  readonly selectedRecipeOptions: ReadonlyMap<NodePath, number>
  readonly selectedRecipeOptionsByRoot: ReadonlyMap<
    string,
    ReadonlyMap<NodePath, number>
  >
  readonly productionConfig: NodeReturnRateConfig
  readonly stationFeeConfig: StationFeeConfig
  readonly craftingSpecializationConfig: CraftingSpecializationConfig
  readonly itemValueOverride: number | null
  readonly itemValueOverridesByRoot: ReadonlyMap<string, number>
  readonly stationUsageFeeOverride: StationUsageFeeOverride | null
  readonly stationUsageFeeOverridesByRoot: ReadonlyMap<
    string,
    StationUsageFeeOverride
  >
  readonly isPremium: boolean

  /** Cambia de receta y restaura los precios guardados para esa raíz. */
  resetForItem: (
    itemId: BaseItemId,
    enchantment: EnchantmentLevel,
    expandRoot: boolean,
  ) => void
  toggleExpanded: (path: NodePath) => void
  setManualPrice: (path: NodePath, unitPrice: number) => void
  clearManualPrice: (path: NodePath) => void
  clearCurrentManualPrices: () => void
  clearAllManualPrices: () => void
  setRecipeOption: (path: NodePath, optionIndex: number) => void
  setProductionConfig: (config: NodeReturnRateConfig) => void
  setStationFeeConfig: (config: StationFeeConfig) => void
  setCraftingSpecializationConfig: (
    config: CraftingSpecializationConfig,
  ) => void
  setItemValueOverride: (value: number | null) => void
  setStationUsageFeeOverride: (value: StationUsageFeeOverride | null) => void
  setIsPremium: (isPremium: boolean) => void
}

function buildRootKey(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
): string {
  return `${itemId}@${enchantment}`
}

function persistAndSetPriceCache(
  set: (
    partial:
      | Partial<CraftTreeState>
      | ((state: CraftTreeState) => Partial<CraftTreeState>),
  ) => void,
  pricesByRoot: Map<string, ReadonlyMap<NodePath, number>>,
  manualPrices: ReadonlyMap<NodePath, number>,
): void {
  saveManualPrices(pricesByRoot)
  set({
    manualPricesByRoot: pricesByRoot,
    manualPrices,
  })
}

const initialManualPricesByRoot = loadManualPrices()
const initialPresetStorage = loadCraftPresetStorage()
const initialDefaultPreset = initialPresetStorage.presets.find(
  (preset) => preset.id === initialPresetStorage.defaultPresetId,
)
const initialProductionConfig = initialDefaultPreset
  ? applyPresetProductionConfig(
      DEFAULT_RETURN_RATE_CONFIG,
      initialDefaultPreset.productionConfig,
    )
  : DEFAULT_RETURN_RATE_CONFIG
const initialStationFeeConfig =
  initialDefaultPreset?.stationFeeConfig ?? DEFAULT_STATION_FEE_CONFIG
const initialCraftingSpecializationConfig =
  initialDefaultPreset?.craftingSpecializationConfig ??
  DEFAULT_CRAFTING_SPECIALIZATION_CONFIG
const initialIsPremium = initialDefaultPreset?.isPremium ?? true

export const useCraftTreeStore = create<CraftTreeState>((set, get) => ({
  rootKey: null,
  expandedPaths: new Set(),
  manualPrices: new Map(),
  manualPricesByRoot: initialManualPricesByRoot,
  selectedRecipeOptions: new Map(),
  selectedRecipeOptionsByRoot: new Map(),
  productionConfig: initialProductionConfig,
  stationFeeConfig: initialStationFeeConfig,
  craftingSpecializationConfig: initialCraftingSpecializationConfig,
  itemValueOverride: null,
  itemValueOverridesByRoot: new Map(),
  stationUsageFeeOverride: null,
  stationUsageFeeOverridesByRoot: new Map(),
  isPremium: initialIsPremium,

  resetForItem: (itemId, enchantment, expandRoot) => {
    const key = buildRootKey(itemId, enchantment)
    if (get().rootKey === key) return

    const savedPrices = get().manualPricesByRoot.get(key)
    const savedRecipeOptions = get().selectedRecipeOptionsByRoot.get(key)
    const savedItemValue = get().itemValueOverridesByRoot.get(key)
    const savedStationUsageFee = get().stationUsageFeeOverridesByRoot.get(key)

    set({
      rootKey: key,
      expandedPaths: expandRoot ? new Set(['root']) : new Set(),
      manualPrices: savedPrices ? new Map(savedPrices) : new Map(),
      selectedRecipeOptions: savedRecipeOptions
        ? new Map(savedRecipeOptions)
        : new Map(),
      itemValueOverride: savedItemValue ?? null,
      stationUsageFeeOverride: savedStationUsageFee ?? null,
    })
  },

  toggleExpanded: (path) => {
    const next = new Set(get().expandedPaths)

    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }

    set({ expandedPaths: next })
  },

  setManualPrice: (path, unitPrice) => {
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return

    const currentPrices = new Map(get().manualPrices)
    currentPrices.set(path, unitPrice)

    const rootKey = get().rootKey

    if (!rootKey) {
      set({ manualPrices: currentPrices })
      return
    }

    const pricesByRoot = new Map(get().manualPricesByRoot)
    pricesByRoot.set(rootKey, currentPrices)

    persistAndSetPriceCache(set, pricesByRoot, currentPrices)
  },

  clearManualPrice: (path) => {
    const currentPrices = new Map(get().manualPrices)
    currentPrices.delete(path)

    const rootKey = get().rootKey

    if (!rootKey) {
      set({ manualPrices: currentPrices })
      return
    }

    const pricesByRoot = new Map(get().manualPricesByRoot)

    if (currentPrices.size === 0) {
      pricesByRoot.delete(rootKey)
    } else {
      pricesByRoot.set(rootKey, currentPrices)
    }

    persistAndSetPriceCache(set, pricesByRoot, currentPrices)
  },

  clearCurrentManualPrices: () => {
    const rootKey = get().rootKey
    const pricesByRoot = new Map(get().manualPricesByRoot)

    if (rootKey) {
      pricesByRoot.delete(rootKey)
    }

    persistAndSetPriceCache(set, pricesByRoot, new Map())
  },

  clearAllManualPrices: () => {
    persistAndSetPriceCache(set, new Map(), new Map())
  },

  setRecipeOption: (path, optionIndex) => {
    if (!Number.isInteger(optionIndex) || optionIndex < 0) return

    const selectedRecipeOptions = new Map(get().selectedRecipeOptions)
    selectedRecipeOptions.set(path, optionIndex)

    const selectedRecipeOptionsByRoot = new Map(
      get().selectedRecipeOptionsByRoot,
    )
    const rootKey = get().rootKey

    if (rootKey) {
      selectedRecipeOptionsByRoot.set(rootKey, selectedRecipeOptions)
    }

    set({
      selectedRecipeOptions,
      selectedRecipeOptionsByRoot,
    })
  },

  setProductionConfig: (config) => {
    set({ productionConfig: config })
  },

  setStationFeeConfig: (config) => {
    set({ stationFeeConfig: config })
  },

  setCraftingSpecializationConfig: (config) => {
    set({ craftingSpecializationConfig: config })
  },

  setItemValueOverride: (value) => {
    const normalized =
      value !== null && Number.isFinite(value) && value >= 0 ? value : null
    const itemValueOverridesByRoot = new Map(get().itemValueOverridesByRoot)
    const rootKey = get().rootKey

    if (rootKey) {
      if (normalized === null) itemValueOverridesByRoot.delete(rootKey)
      else itemValueOverridesByRoot.set(rootKey, normalized)
    }

    set({
      itemValueOverride: normalized,
      itemValueOverridesByRoot,
    })
  },

  setStationUsageFeeOverride: (value) => {
    const normalized =
      value !== null &&
      Number.isFinite(value.totalFee) &&
      value.totalFee >= 0 &&
      Number.isFinite(value.quantity) &&
      value.quantity > 0 &&
      Number.isFinite(value.craftsNeeded) &&
      value.craftsNeeded > 0
        ? value
        : null
    const stationUsageFeeOverridesByRoot = new Map(
      get().stationUsageFeeOverridesByRoot,
    )
    const rootKey = get().rootKey

    if (rootKey) {
      if (normalized === null) stationUsageFeeOverridesByRoot.delete(rootKey)
      else stationUsageFeeOverridesByRoot.set(rootKey, normalized)
    }

    set({
      stationUsageFeeOverride: normalized,
      stationUsageFeeOverridesByRoot,
    })
  },

  setIsPremium: (isPremium) => {
    set({ isPremium })
  },
}))
