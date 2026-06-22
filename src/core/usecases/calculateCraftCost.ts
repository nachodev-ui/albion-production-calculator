import type { BaseItemId } from '../domain/entities/Item'
import type { EnchantmentLevel } from '../domain/entities/Enchantment'
import { getRecipeTier } from '../domain/entities/Recipe'
import { isReturnEligibleIngredient } from '../domain/entities/ResourceReturnEligibility'
import type {
  CraftCalculation,
  CraftCostNode,
  MaterialReturnBreakdown,
  MissingPriceItem,
  NodeReturnRateConfig,
} from '../domain/entities/CraftCostNode'
import { calculateReturnRate } from '../domain/entities/ReturnRate'
import type { ItemRepository } from '../domain/repositories/ItemRepository'
import { collectReturnedMaterials } from './collectReturnedMaterials'
import { resolveRecipeIngredient } from './resolveRecipeIngredient'

export type NodePath = string

export function childPath(parent: NodePath, index: number): NodePath {
  return `${parent}-${index}`
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
  readonly productionConfig: NodeReturnRateConfig
}

export function createEmptyTreeConfig(): CraftTreeConfig {
  return {
    expandedPaths: new Set(),
    manualPrices: new Map(),
    productionConfig: DEFAULT_RETURN_RATE_CONFIG,
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
  // La presencia de la clave importa: un precio 0 ingresado por el usuario
  // es válido y no debe confundirse con un precio todavía pendiente.
  const hasValidPrice = config.manualPrices.has(path)
  const manualUnitPrice = config.manualPrices.get(path) ?? 0

  return {
    node: {
      itemId,
      enchantment,
      quantity,
      totalCost: manualUnitPrice * quantity,
      unitCost: manualUnitPrice,
      isManualPrice: true,
      hasValidPrice,
      returnRate: null,
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

  const builtChildren: BuiltNode[] = tier.ingredients.map((ingredient, index) => {
    const resolved = resolveRecipeIngredient(ingredient, repository)
    const childPathValue = childPath(path, index)

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

  const craftsNeeded = quantity / tier.outputQuantity

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
  const totalCostPerCraft = netMaterialCostPerCraft + tier.silverFee
  const unitCost = totalCostPerCraft / tier.outputQuantity

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
    tier.silverFee * craftsNeeded

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
      hasValidPrice: missingPriceOccurrences.length === 0,
      returnRate: returnBreakdown,
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

  return {
    root: built.node,
    totalStationFees: built.stationFees,
    totalMaterialCost: built.node.totalCost - built.stationFees,
    grandTotal: built.node.totalCost,
    totalSilverSavedByReturnRate,
    returnedMaterials,
    missingPriceItems,
    missingPriceCount: missingPriceItems.length,
    isComplete: missingPriceItems.length === 0,
  }
}
