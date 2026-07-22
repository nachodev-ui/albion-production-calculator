import type { CraftCalculation } from "@core/domain/entities/CraftCostNode";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import type { BaseItemId, Item } from "@core/domain/entities/Item";
import { getRecipeOption, getRecipeTier } from "@core/domain/entities/Recipe";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import type { MarketCityId } from "@features/market-data/types/MarketPrice";
import { buildItemPriceKey } from "@features/market-data/types/MarketPrice";
import type { BlackMarketOpportunity } from "../types";
import type {
  BlackMarketCraftingEconomics,
  BlackMarketStrategyKind,
  BlackMarketStrategyRecommendation,
} from "./blackMarketCraftingComparison";
import {
  buildBlackMarketDataConfidence,
  type BlackMarketDataConfidenceLevel,
} from "./blackMarketDataConfidence";

export interface BatchPlannerSelection {
  readonly itemId: BaseItemId;
  readonly enchantment: EnchantmentLevel;
  readonly quality: 1 | 2 | 3 | 4 | 5;
  readonly quantity: number;
}

export interface BatchPlannerResolvedLine {
  readonly selection: BatchPlannerSelection;
  readonly opportunity: BlackMarketOpportunity;
  readonly strategy: BlackMarketStrategyKind;
  readonly strategyLabel: string;
  readonly profit: number;
  readonly returnOnCostPercent: number | null;
  readonly capitalRequired: number;
  readonly confidence: BlackMarketDataConfidenceLevel;
  readonly confidenceReasons: readonly string[];
  readonly calculation: CraftCalculation | null;
}

export interface CheapestMaterialPrice {
  readonly city: MarketCityId;
  readonly unitPrice: number;
}

export interface ConsolidatedBatchMaterial {
  readonly key: string;
  readonly itemId: BaseItemId;
  readonly enchantment: EnchantmentLevel;
  readonly name: string;
  readonly grossQuantity: number;
  readonly recoveredQuantity: number;
  readonly effectiveQuantity: number;
  readonly unitPrice: number | null;
  readonly city: MarketCityId | null;
  readonly estimatedWeight: number;
}

export interface BatchShoppingCityGroup {
  readonly city: MarketCityId;
  readonly materials: readonly ConsolidatedBatchMaterial[];
}

export interface BatchManufacturingStep {
  readonly itemId: BaseItemId;
  readonly enchantment: EnchantmentLevel;
  readonly name: string;
  readonly quantity: number;
}

const CONFIDENCE_RANK: Record<BlackMarketDataConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

function selectEconomics(
  strategy: BlackMarketStrategyKind,
  withoutFocus: BlackMarketCraftingEconomics,
  withFocus: BlackMarketCraftingEconomics,
): BlackMarketCraftingEconomics | null {
  if (strategy === "craft-with-focus") return withFocus;
  if (strategy === "craft-without-focus") return withoutFocus;
  return null;
}

export function buildBatchOpportunityConfidence(
  opportunity: BlackMarketOpportunity,
): {
  readonly level: BlackMarketDataConfidenceLevel;
  readonly reasons: readonly string[];
} {
  const purchase = buildBlackMarketDataConfidence({
    ageMinutes: opportunity.purchaseAgeMinutes,
    unitPrice: opportunity.purchaseUnitPrice,
    observations7d: opportunity.purchaseHistoryObservations7d,
    volume7d: opportunity.purchaseHistoryVolume7d,
    medianPrice7d: opportunity.purchaseMedianPrice7d,
    buyPrice: opportunity.purchaseBuyUnitPrice,
    sellPrice: opportunity.purchaseUnitPrice,
  });
  const blackMarket = buildBlackMarketDataConfidence({
    ageMinutes: opportunity.blackMarketAgeMinutes,
    unitPrice: opportunity.blackMarketBuyUnitPrice,
    observations7d: opportunity.blackMarketHistoryObservations7d,
    volume7d: opportunity.blackMarketHistoryVolume7d,
    medianPrice7d: opportunity.blackMarketMedianPrice7d,
    buyPrice: opportunity.blackMarketBuyUnitPrice,
    sellPrice: opportunity.blackMarketSellUnitPrice,
  });
  const level =
    CONFIDENCE_RANK[purchase.level] <= CONFIDENCE_RANK[blackMarket.level]
      ? purchase.level
      : blackMarket.level;

  return {
    level,
    reasons: [
      ...purchase.reasons.map((reason) => `Compra: ${reason}`),
      ...blackMarket.reasons.map((reason) => `Black Market: ${reason}`),
    ],
  };
}

export function resolveBatchPlannerLine(params: {
  readonly selection: BatchPlannerSelection;
  readonly opportunity: BlackMarketOpportunity;
  readonly recommendation: BlackMarketStrategyRecommendation;
  readonly withoutFocus: BlackMarketCraftingEconomics;
  readonly withFocus: BlackMarketCraftingEconomics;
  readonly withoutFocusCalculation: CraftCalculation;
  readonly withFocusCalculation: CraftCalculation;
}): BatchPlannerResolvedLine {
  const quantity = normalizeQuantity(params.selection.quantity);
  const selection = { ...params.selection, quantity };
  const confidence = buildBatchOpportunityConfidence(params.opportunity);
  const economics = selectEconomics(
    params.recommendation.kind,
    params.withoutFocus,
    params.withFocus,
  );

  if (economics) {
    return {
      selection,
      opportunity: params.opportunity,
      strategy: params.recommendation.kind,
      strategyLabel: params.recommendation.label,
      profit:
        economics.adjustedProfit ?? economics.accountingProfit ?? params.recommendation.profit,
      returnOnCostPercent:
        economics.adjustedReturnOnCostPercent ?? economics.returnOnCostPercent,
      capitalRequired: economics.accountingInvestment,
      confidence: confidence.level,
      confidenceReasons: confidence.reasons,
      calculation:
        params.recommendation.kind === "craft-with-focus"
          ? params.withFocusCalculation
          : params.withoutFocusCalculation,
    };
  }

  return {
    selection,
    opportunity: params.opportunity,
    strategy: "buy-finished",
    strategyLabel: params.recommendation.label,
    profit: params.opportunity.profit * quantity,
    returnOnCostPercent: params.opportunity.returnOnCostPercent,
    capitalRequired:
      (params.opportunity.purchaseUnitPrice +
        params.opportunity.transportCostPerUnit) *
      quantity,
    confidence: confidence.level,
    confidenceReasons: confidence.reasons,
    calculation: null,
  };
}

export function estimateMaterialUnitWeight(item: Item | null): number {
  if (!item) return 1;
  if (item.category === "resource" || item.category === "refined_resource") {
    return 0.1;
  }
  if (item.category === "food" || item.category === "potion") return 0.2;
  if (item.category === "accessory") return 0.5;
  return 1;
}

export function consolidateBatchMaterials(
  lines: readonly BatchPlannerResolvedLine[],
  repository: ItemRepository,
  cheapestPrices: ReadonlyMap<string, CheapestMaterialPrice>,
): readonly ConsolidatedBatchMaterial[] {
  const grouped = new Map<
    string,
    {
      itemId: BaseItemId;
      enchantment: EnchantmentLevel;
      name: string;
      grossQuantity: number;
      recoveredQuantity: number;
      unitPrice: number | null;
      city: MarketCityId | null;
      estimatedWeight: number;
    }
  >();

  for (const line of lines) {
    const calculation = line.calculation;
    if (!calculation) continue;

    const rootItem = repository.getById(line.selection.itemId);
    const tier = rootItem?.recipe
      ? getRecipeTier(rootItem.recipe, line.selection.enchantment)
      : null;
    if (!tier) continue;

    const option = getRecipeOption(tier, calculation.root.recipeOptionIndex ?? 0);
    if (option.outputQuantity <= 0) continue;
    const craftsNeeded = line.selection.quantity / option.outputQuantity;
    const recoveredByKey = new Map(
      calculation.returnedMaterials.map((material) => [
        buildItemPriceKey(material.itemId, material.enchantment),
        material.returnedQuantity,
      ]),
    );

    for (const child of calculation.root.children) {
      const key = buildItemPriceKey(child.itemId, child.enchantment);
      const item = repository.getById(child.itemId);
      const grossQuantity = child.quantity * craftsNeeded;
      const recoveredQuantity = recoveredByKey.get(key) ?? 0;
      const price = cheapestPrices.get(key) ?? null;
      const unitWeight = estimateMaterialUnitWeight(item);
      const current = grouped.get(key);

      if (current) {
        current.grossQuantity += grossQuantity;
        current.recoveredQuantity += recoveredQuantity;
        current.estimatedWeight += Math.max(0, grossQuantity - recoveredQuantity) * unitWeight;
      } else {
        grouped.set(key, {
          itemId: child.itemId,
          enchantment: child.enchantment,
          name: item?.name ?? String(child.itemId),
          grossQuantity,
          recoveredQuantity,
          unitPrice: price?.unitPrice ?? null,
          city: price?.city ?? null,
          estimatedWeight: Math.max(0, grossQuantity - recoveredQuantity) * unitWeight,
        });
      }
    }
  }

  return Array.from(grouped.entries())
    .map(([key, material]) => ({
      key,
      itemId: material.itemId,
      enchantment: material.enchantment,
      name: material.name,
      grossQuantity: material.grossQuantity,
      recoveredQuantity: material.recoveredQuantity,
      effectiveQuantity: Math.max(
        0,
        material.grossQuantity - material.recoveredQuantity,
      ),
      unitPrice: material.unitPrice,
      city: material.city,
      estimatedWeight: material.estimatedWeight,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export function groupBatchMaterialsByCity(
  materials: readonly ConsolidatedBatchMaterial[],
): readonly BatchShoppingCityGroup[] {
  const grouped = new Map<MarketCityId, ConsolidatedBatchMaterial[]>();

  for (const material of materials) {
    if (!material.city || material.effectiveQuantity <= 0) continue;
    const cityMaterials = grouped.get(material.city) ?? [];
    cityMaterials.push(material);
    grouped.set(material.city, cityMaterials);
  }

  return Array.from(grouped.entries())
    .map(([city, cityMaterials]) => ({
      city,
      materials: cityMaterials.sort((left, right) =>
        left.name.localeCompare(right.name, "es"),
      ),
    }))
    .sort((left, right) => left.city.localeCompare(right.city));
}

export function buildSuggestedManufacturingOrder(
  selections: readonly BatchPlannerSelection[],
  repository: ItemRepository,
): readonly BatchManufacturingStep[] {
  const selectionByKey = new Map(
    selections.map((selection) => [
      buildItemPriceKey(selection.itemId, selection.enchantment),
      { ...selection, quantity: normalizeQuantity(selection.quantity) },
    ]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: BatchManufacturingStep[] = [];

  function visit(key: string): void {
    if (visited.has(key) || visiting.has(key)) return;
    const selection = selectionByKey.get(key);
    if (!selection) return;

    visiting.add(key);
    const item = repository.getById(selection.itemId);
    const tier = item?.recipe
      ? getRecipeTier(item.recipe, selection.enchantment)
      : null;
    if (tier) {
      const option = getRecipeOption(tier, 0);
      for (const ingredient of option.ingredients) {
        visit(buildItemPriceKey(ingredient.itemId, ingredient.enchantment));
      }
    }
    visiting.delete(key);
    visited.add(key);
    ordered.push({
      itemId: selection.itemId,
      enchantment: selection.enchantment,
      name: item?.name ?? String(selection.itemId),
      quantity: selection.quantity,
    });
  }

  const stableKeys = Array.from(selectionByKey.keys()).sort((left, right) => {
    const leftSelection = selectionByKey.get(left);
    const rightSelection = selectionByKey.get(right);
    const leftItem = leftSelection
      ? repository.getById(leftSelection.itemId)
      : null;
    const rightItem = rightSelection
      ? repository.getById(rightSelection.itemId)
      : null;
    return (
      (leftItem?.tier ?? 0) - (rightItem?.tier ?? 0) ||
      (leftItem?.name ?? left).localeCompare(rightItem?.name ?? right, "es")
    );
  });
  for (const key of stableKeys) visit(key);
  return ordered;
}
