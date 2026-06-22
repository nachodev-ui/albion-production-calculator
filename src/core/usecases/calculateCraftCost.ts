import type { BaseItemId } from '../domain/entities/Item'
import type { EnchantmentLevel } from '../domain/entities/Enchantment'
import { getRecipeOption, getRecipeTier } from '../domain/entities/Recipe'
import { isReturnEligibleIngredient } from '../domain/entities/ResourceReturnEligibility'
import type {
  CraftCalculation,
  CraftCostNode,
  MaterialReturnBreakdown,
  MissingPriceItem,
  NodeReturnRateConfig,
} from '../domain/entities/CraftCostNode'
import { calculateReturnRate } from '../domain/entities/ReturnRate'
import {
  DEFAULT_CRAFTING_SPECIALIZATION_CONFIG,
  DEFAULT_STATION_FEE_CONFIG,
  calculateFocusCostBreakdown,
  calculateStationUsageFee,
} from '../domain/entities/ProductionEconomy'
import type {
  CraftingSpecializationConfig,
  StationFeeConfig,
} from '../domain/entities/ProductionEconomy'
import type { ItemRepository } from '../domain/repositories/ItemRepository'
import { collectReturnedMaterials } from './collectReturnedMaterials'
import { resolveRecipeIngredient } from './resolveRecipeIngredient'

export type NodePath = string

export function buildItemPriceKey(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
): string {
  return `${itemId}@${enchantment}`
}

export function childPath(parent: NodePath, index: number): NodePath {
  return `${parent}-${index}`
}

/**
 * Mantiene las rutas históricas para la opción principal y separa los
 * precios/expansiones de las variantes alternativas.
 */
export function recipeChildPath(
  parent: NodePath,
  optionIndex: number,
  childIndex: number,
): NodePath {
  return optionIndex === 0
    ? childPath(parent, childIndex)
    : `${parent}-option${optionIndex}-${childIndex}`
}

export const DEFAULT_RETURN_RATE_CONFIG: NodeReturnRateConfig = {
  cityId: 'island',
  hasSpecialtyBonus: false,
  specialtyKind: 'crafting',
  useFocus: false,
  hasDailyBonus: false,
  dailyBonusAmount: 0.1,
  isIsland: true,
}

export interface CraftTreeConfig {
  readonly expandedPaths: ReadonlySet<NodePath>
  readonly manualPrices: ReadonlyMap<NodePath, number>
  /**
   * Precios automáticos compartidos por identidad de ítem. Los precios
   * manuales por path siempre tienen prioridad sobre este mapa.
   */
  readonly automaticPrices?: ReadonlyMap<string, number>
  readonly productionConfig: NodeReturnRateConfig
  readonly selectedRecipeOptions?: ReadonlyMap<NodePath, number>
  readonly stationFeeConfig?: StationFeeConfig
  readonly craftingSpecializationConfig?: CraftingSpecializationConfig
  /** Valor manual del objeto raíz; tiene prioridad sobre el dataset. */
  readonly itemValueOverride?: number | null
}

export function createEmptyTreeConfig(): CraftTreeConfig {
  return {
    expandedPaths: new Set(),
    manualPrices: new Map(),
    automaticPrices: new Map(),
    productionConfig: DEFAULT_RETURN_RATE_CONFIG,
    selectedRecipeOptions: new Map(),
    stationFeeConfig: DEFAULT_STATION_FEE_CONFIG,
    craftingSpecializationConfig: DEFAULT_CRAFTING_SPECIALIZATION_CONFIG,
    itemValueOverride: null,
  }
}

interface MissingPriceOccurrence {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly path: NodePath
}

interface BuiltNode {
  readonly node: CraftCostNode
  readonly stationFees: number
  readonly silverSavedByReturnRate: number
  readonly missingPriceOccurrences: readonly MissingPriceOccurrence[]
}

function getProductionConfigForItem(
  config: NodeReturnRateConfig,
  item: NonNullable<ReturnType<ItemRepository['getById']>>,
): NodeReturnRateConfig {
  return {
    ...config,
    specialtyKind: item.category === 'refined_resource' ? 'refining' : 'crafting',
  }
}

/**
 * Este desglose mantiene los nombres históricos del modelo, pero sus
 * cantidades representan valores económicos en plata para el nodo.
 */
function calculateMaterialReturn(
  grossCost: number,
  returnEligibleCost: number,
  config: NodeReturnRateConfig,
): MaterialReturnBreakdown {
  const returnRate = calculateReturnRate(config)
  const returnedQuantity = returnEligibleCost * returnRate
  const netQuantity = grossCost - returnedQuantity

  return {
    grossQuantity: grossCost,
    returnRate,
    returnedQuantity,
    netQuantity,
  }
}

function buildLeaf(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
  quantity: number,
  path: NodePath,
  config: CraftTreeConfig,
): BuiltNode {
  // La presencia de la clave importa: un precio manual 0 es válido.
  // Cuando no existe override manual, se usa el precio automático del
  // mercado para la misma identidad de ítem y encantamiento.
  const hasManualPrice = config.manualPrices.has(path)
  const manualUnitPrice = config.manualPrices.get(path)
  const automaticUnitPrice = config.automaticPrices?.get(
    buildItemPriceKey(itemId, enchantment),
  )
  const hasAutomaticPrice =
    automaticUnitPrice !== undefined &&
    Number.isFinite(automaticUnitPrice) &&
    automaticUnitPrice >= 0
  const hasValidPrice = hasManualPrice || hasAutomaticPrice
  const unitPrice = hasManualPrice
    ? manualUnitPrice ?? 0
    : hasAutomaticPrice
      ? automaticUnitPrice
      : 0

  return {
    node: {
      itemId,
      enchantment,
      quantity,
      totalCost: unitPrice * quantity,
      unitCost: unitPrice,
      isManualPrice: true,
      priceSource: hasManualPrice
        ? 'manual'
        : hasAutomaticPrice
          ? 'automatic'
          : null,
      hasValidPrice,
      returnRate: null,
      recipeOptionIndex: null,
      children: [],
    },
    stationFees: 0,
    silverSavedByReturnRate: 0,
    missingPriceOccurrences: hasValidPrice
      ? []
      : [{ itemId, enchantment, path }],
  }
}

function buildNode(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
  quantity: number,
  path: NodePath,
  repository: ItemRepository,
  config: CraftTreeConfig,
): BuiltNode {
  const isExpanded = config.expandedPaths.has(path)
  const item = repository.getById(itemId)
  const tier = item?.recipe ? getRecipeTier(item.recipe, enchantment) : null

  if (!isExpanded || !tier || !item) {
    return buildLeaf(itemId, enchantment, quantity, path, config)
  }

  const rrrConfig = getProductionConfigForItem(config.productionConfig, item)
  const requestedOptionIndex = config.selectedRecipeOptions?.get(path) ?? 0
  const recipeOption = getRecipeOption(tier, requestedOptionIndex)
  const recipeOptionIndex = requestedOptionIndex >= 0 && requestedOptionIndex <= (tier.alternatives?.length ?? 0)
    ? requestedOptionIndex
    : 0

  const builtChildren: BuiltNode[] = recipeOption.ingredients.map((ingredient, index) => {
    const resolved = resolveRecipeIngredient(ingredient, repository)
    const childPathValue = recipeChildPath(path, recipeOptionIndex, index)

    if (resolved.status === 'unresolved') {
      return buildLeaf(
        resolved.itemId,
        enchantment,
        resolved.quantity,
        childPathValue,
        config,
      )
    }

    return buildNode(
      resolved.item.id,
      resolved.enchantment,
      resolved.quantity,
      childPathValue,
      repository,
      config,
    )
  })

  const craftsNeeded = quantity / recipeOption.outputQuantity

  const grossMaterialCostPerCraft = builtChildren.reduce(
    (sum, child) => sum + child.node.totalCost,
    0,
  )

  const returnEligibleMaterialCostPerCraft = builtChildren.reduce(
    (sum, child) => {
      const ingredientItem = repository.getById(child.node.itemId)

      if (!ingredientItem || !isReturnEligibleIngredient(item, ingredientItem)) {
        return sum
      }

      return sum + child.node.totalCost
    },
    0,
  )

  const returnBreakdown = calculateMaterialReturn(
    grossMaterialCostPerCraft,
    returnEligibleMaterialCostPerCraft,
    rrrConfig,
  )

  const netMaterialCostPerCraft = returnBreakdown.netQuantity
  const totalCostPerCraft = netMaterialCostPerCraft + recipeOption.silverFee
  const unitCost = totalCostPerCraft / recipeOption.outputQuantity

  /*
   * Los hijos describen una sola tirada del padre. Sus tarifas y ahorros
   * deben repetirse por la cantidad real de crafteos del nodo actual.
   */
  const childStationFeesPerCraft = builtChildren.reduce(
    (sum, child) => sum + child.stationFees,
    0,
  )

  const childSavingsPerCraft = builtChildren.reduce(
    (sum, child) => sum + child.silverSavedByReturnRate,
    0,
  )

  const stationFees =
    childStationFeesPerCraft * craftsNeeded +
    recipeOption.silverFee * craftsNeeded

  const silverSavedByReturnRate =
    childSavingsPerCraft * craftsNeeded +
    returnBreakdown.returnedQuantity * craftsNeeded

  const missingPriceOccurrences = builtChildren.flatMap(
    (child) => child.missingPriceOccurrences,
  )

  return {
    node: {
      itemId,
      enchantment,
      quantity,
      totalCost: unitCost * quantity,
      unitCost,
      isManualPrice: false,
      priceSource: null,
      hasValidPrice: missingPriceOccurrences.length === 0,
      returnRate: returnBreakdown,
      recipeOptionIndex,
      children: builtChildren.map((child) => child.node),
    },
    stationFees,
    silverSavedByReturnRate,
    missingPriceOccurrences,
  }
}

function aggregateMissingPriceItems(
  occurrences: readonly MissingPriceOccurrence[],
): readonly MissingPriceItem[] {
  const grouped = new Map<
    string,
    {
      itemId: BaseItemId
      enchantment: EnchantmentLevel
      paths: string[]
    }
  >()

  for (const occurrence of occurrences) {
    const key = `${occurrence.itemId}@${occurrence.enchantment}`
    const current = grouped.get(key)

    if (current) {
      if (!current.paths.includes(occurrence.path)) {
        current.paths.push(occurrence.path)
      }
      continue
    }

    grouped.set(key, {
      itemId: occurrence.itemId,
      enchantment: occurrence.enchantment,
      paths: [occurrence.path],
    })
  }

  return Array.from(grouped.values()).map((item) => ({
    itemId: item.itemId,
    enchantment: item.enchantment,
    paths: item.paths,
  }))
}

export function calculateCraftCost(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
  quantity: number,
  repository: ItemRepository,
  config: CraftTreeConfig,
): CraftCalculation {
  const built = buildNode(
    itemId,
    enchantment,
    quantity,
    'root',
    repository,
    config,
  )

  const returnedMaterials = collectReturnedMaterials(built.node, repository)
  const totalSilverSavedByReturnRate = returnedMaterials.reduce(
    (sum, material) => sum + material.silverValue,
    0,
  )

  const missingPriceItems = aggregateMissingPriceItems(
    built.missingPriceOccurrences,
  )

  const rootItem = repository.getById(itemId)
  const rootTier = rootItem?.recipe
    ? getRecipeTier(rootItem.recipe, enchantment)
    : null
  const requestedRootOption = config.selectedRecipeOptions?.get('root') ?? 0
  const rootOption = rootTier
    ? getRecipeOption(rootTier, requestedRootOption)
    : null
  const craftsNeeded = rootOption
    ? quantity / rootOption.outputQuantity
    : 0
  const hasManualItemValue =
    config.itemValueOverride !== null &&
    config.itemValueOverride !== undefined &&
    Number.isFinite(config.itemValueOverride) &&
    config.itemValueOverride >= 0
  const datasetItemValue = rootItem?.itemValue ?? null
  const itemValue = hasManualItemValue
    ? config.itemValueOverride ?? 0
    : datasetItemValue ?? 0
  const itemValueSource = hasManualItemValue
    ? 'manual' as const
    : datasetItemValue !== null
      ? 'dataset' as const
      : 'missing' as const

  const stationFeeBreakdown = calculateStationUsageFee({
    station: rootTier?.station ?? 'unknown',
    itemValue,
    itemValueSource,
    craftsNeeded,
    config: config.stationFeeConfig ?? DEFAULT_STATION_FEE_CONFIG,
  })

  const focusCostBreakdown = calculateFocusCostBreakdown({
    baseFocusPerCraft: rootOption?.craftingFocus ?? 0,
    craftsNeeded,
    outputQuantity: rootOption?.outputQuantity ?? 1,
    useFocus: config.productionConfig.useFocus,
    config:
      config.craftingSpecializationConfig ??
      DEFAULT_CRAFTING_SPECIALIZATION_CONFIG,
  })

  const totalStationFees = built.stationFees + stationFeeBreakdown.totalFee
  const totalMaterialCost = built.node.totalCost - built.stationFees
  const grandTotal = built.node.totalCost + stationFeeBreakdown.totalFee

  return {
    root: built.node,
    totalStationFees,
    stationUsageFee: stationFeeBreakdown.totalFee,
    stationFeeBreakdown,
    focusCostBreakdown,
    totalMaterialCost,
    grandTotal,
    totalSilverSavedByReturnRate,
    returnedMaterials,
    missingPriceItems,
    missingPriceCount: missingPriceItems.length,
    isComplete: missingPriceItems.length === 0,
  }
}
