import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HIDEOUT_POWER_LEVEL,
  getHideoutPowerProfile,
  type NodeReturnRateConfig,
} from "@core/domain/entities";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import type { Item } from "@core/domain/entities/Item";
import {
  getRecipeOption,
  getRecipeOptions,
  getRecipeTier,
} from "@core/domain/entities/Recipe";
import type { CraftingSpecializationConfig } from "@core/domain/entities/ProductionEconomy";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import {
  calculateCraftCost,
  type CraftTreeConfig,
} from "@core/usecases/calculateCraftCost";
import { useCraftTreeStore } from "@features/craft-calculator/store/craftTreeStore";
import {
  applyRecommendedProductionCity,
  getProductionCityRecommendation,
} from "@features/craft-calculator/utils/productionRecommendation";
import { useCurrentMarketPrices } from "@features/market-data/hooks/useCurrentMarketPrices";
import type {
  AlbionServer as MarketAlbionServer,
  MarketPriceTarget,
} from "@features/market-data/types/MarketPrice";
import { buildItemPriceKey } from "@features/market-data/types/MarketPrice";
import { collectMarketPriceTargets } from "@features/market-data/utils/collectMarketPriceTargets";
import type {
  AlbionServer,
  BlackMarketOpportunitiesResponse,
  BlackMarketOpportunity,
  BlackMarketOpportunityFilters,
  BlackMarketSaleMode,
} from "../types";
import {
  calculateBlackMarketCraftingEconomics,
  calculateBlackMarketFocusValuation,
  recommendBlackMarketStrategy,
  type BlackMarketCraftingEconomics,
  type BlackMarketFocusValuation,
  type BlackMarketStrategyRecommendation,
} from "../utils/blackMarketCraftingComparison";
import {
  buildBlackMarketQualityPriceSchedule,
  type BlackMarketQualityPricePoint,
} from "../utils/blackMarketQuality";
import {
  calculateOpportunitySaleEconomics,
  selectedBlackMarketUnitPrice,
  type BlackMarketSaleEconomics,
} from "../utils/blackMarketSaleEconomics";
import { baseBlackMarketItemIdentifier } from "../components/blackMarketScannerConfig";

const EMPTY_PRICES: ReadonlyMap<string, number> = new Map();
const ROOT_EXPANDED: ReadonlySet<string> = new Set(["root"]);
const MARKET_SERVER_BY_BLACK_MARKET: Record<AlbionServer, MarketAlbionServer> = {
  west: "americas",
  east: "asia",
  europe: "europe",
};
const UNAVAILABLE_PROFIT = -1_000_000_000_000_000;

interface PreparedMassOpportunity {
  readonly opportunity: BlackMarketOpportunity;
  readonly item: Item;
  readonly enchantment: EnchantmentLevel;
  readonly productionConfig: NodeReturnRateConfig;
  readonly materialTargets: readonly MarketPriceTarget[];
  readonly recipeOptionIndex: number;
}

export type BlackMarketMassAnalysisStatus =
  | "ready"
  | "incomplete"
  | "not-craftable";

export interface BlackMarketMassAnalysisRow {
  readonly opportunity: BlackMarketOpportunity;
  readonly status: BlackMarketMassAnalysisStatus;
  readonly buyFinishedEconomics: BlackMarketSaleEconomics;
  readonly recommendation: BlackMarketStrategyRecommendation;
  readonly withoutFocus: BlackMarketCraftingEconomics | null;
  readonly withFocus: BlackMarketCraftingEconomics | null;
  readonly focusValuation: BlackMarketFocusValuation | null;
}

export interface BlackMarketMassCraftingAnalysis {
  readonly rows: readonly BlackMarketMassAnalysisRow[];
  readonly status: "idle" | "loading" | "success" | "error";
  readonly error: string | null;
  readonly warnings: readonly string[];
  readonly materialTargetCount: number;
}

function effectiveSpecialization(
  productionConfig: NodeReturnRateConfig,
  specializationConfig: CraftingSpecializationConfig,
): CraftingSpecializationConfig {
  const profile = getHideoutPowerProfile(
    productionConfig.hideoutPowerLevel ?? DEFAULT_HIDEOUT_POWER_LEVEL,
  );
  return {
    ...specializationConfig,
    hideoutSpecialistBonus:
      productionConfig.isHideout === true &&
      productionConfig.hideoutSpecialized === true
        ? profile.specialistCraftingBonus
        : 0,
  };
}

function dedupeTargets(
  targets: readonly MarketPriceTarget[],
): readonly MarketPriceTarget[] {
  const byKey = new Map<string, MarketPriceTarget>();
  for (const target of targets) {
    byKey.set(buildItemPriceKey(target.itemId, target.enchantment), target);
  }
  return Array.from(byKey.values());
}

function qualityOrdersForOpportunity(
  response: BlackMarketOpportunitiesResponse,
  opportunity: BlackMarketOpportunity,
  saleMode: BlackMarketSaleMode,
): readonly BlackMarketQualityPricePoint[] {
  return response.data
    .filter((candidate) => candidate.itemIdentifier === opportunity.itemIdentifier)
    .flatMap((candidate) => {
      const unitPrice = selectedBlackMarketUnitPrice(candidate, saleMode);
      return unitPrice === null
        ? []
        : [
            {
              minimumQuality: Math.min(
                5,
                Math.max(1, candidate.blackMarketQuality),
              ) as 1 | 2 | 3 | 4 | 5,
              unitPrice,
            },
          ];
    });
}

export function useBlackMarketMassCraftingAnalysis(params: {
  readonly response: BlackMarketOpportunitiesResponse | null;
  readonly repository: ItemRepository;
  readonly filters: BlackMarketOpportunityFilters;
}): BlackMarketMassCraftingAnalysis {
  const { response, repository, filters } = params;
  const [initialStore] = useState(() => useCraftTreeStore.getState());

  const prepared = useMemo<readonly PreparedMassOpportunity[]>(() => {
    if (!response) return [];
    const entries: PreparedMassOpportunity[] = [];
    for (const opportunity of response.data) {
      const baseID = baseBlackMarketItemIdentifier(opportunity.itemIdentifier);
      const item = repository.getById(baseID as Item["id"]);
      if (!item?.recipe) continue;

      const enchantment = opportunity.enchantment as EnchantmentLevel;
      const tier = getRecipeTier(item.recipe, enchantment);
      const recipeOptions = tier ? getRecipeOptions(tier) : [];
      const recipeOptionIndex = recipeOptions.findIndex(
        (option) => option.ingredients.length > 0,
      );
      if (!tier || recipeOptionIndex < 0) continue;

      const productionConfig = applyRecommendedProductionCity(
        initialStore.productionConfig,
        getProductionCityRecommendation(item),
        "crafting",
      );
      const structureConfig: CraftTreeConfig = {
        expandedPaths: ROOT_EXPANDED,
        manualPrices: EMPTY_PRICES,
        automaticPrices: EMPTY_PRICES,
        productionConfig: { ...productionConfig, useFocus: false },
        selectedRecipeOptions: new Map([["root", recipeOptionIndex]]),
        stationFeeConfig: initialStore.stationFeeConfig,
        craftingSpecializationConfig: effectiveSpecialization(
          productionConfig,
          initialStore.craftingSpecializationConfig,
        ),
        itemValueOverride: null,
        stationUsageFeeOverride: null,
      };
      const structure = calculateCraftCost(
        item.id,
        enchantment,
        1,
        repository,
        structureConfig,
      );
      entries.push({
        opportunity,
        item,
        enchantment,
        productionConfig,
        materialTargets: collectMarketPriceTargets(structure.root, tier),
        recipeOptionIndex,
      });
    }
    return entries;
  }, [initialStore, repository, response]);

  const materialTargets = useMemo(
    () => dedupeTargets(prepared.flatMap((entry) => entry.materialTargets)),
    [prepared],
  );
  const targetLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const target of materialTargets) {
      labels.set(
        buildItemPriceKey(target.itemId, target.enchantment),
        repository.getById(target.itemId)?.name ?? String(target.itemId),
      );
    }
    return labels;
  }, [materialTargets, repository]);

  const market = useCurrentMarketPrices({
    rootKey: response
      ? `black-market-mass:${response.requestedAt}:${response.offset}`
      : "black-market-mass:idle",
    materialTargets,
    saleTarget: null,
    targetLabels,
  });
  const setMarketConfig = market.setConfig;

  useEffect(() => {
    if (!response) return;
    setMarketConfig({ server: MARKET_SERVER_BY_BLACK_MARKET[response.server] });
  }, [response, setMarketConfig]);

  const bestAutomaticPrices = useMemo(() => {
    const allowedMarkets = new Set(filters.purchaseMarketKeys);
    const prices = new Map<string, number>();
    for (const target of materialTargets) {
      const key = buildItemPriceKey(target.itemId, target.enchantment);
      const options = market.materialMarketPriceComparisons.get(key) ?? [];
      const best = options
        .filter(
          (option) =>
            allowedMarkets.has(option.city) &&
            option.value !== null &&
            option.value > 0,
        )
        .reduce<number | null>(
          (current, option) =>
            current === null || (option.value ?? Infinity) < current
              ? option.value
              : current,
          null,
        );
      if (best !== null) prices.set(key, best);
    }
    return prices;
  }, [filters.purchaseMarketKeys, market.materialMarketPriceComparisons, materialTargets]);

  const rows = useMemo<readonly BlackMarketMassAnalysisRow[]>(() => {
    if (!response) return [];
    const preparedByID = new Map(
      prepared.map((entry) => [entry.opportunity.id, entry]),
    );
    const effectiveSaleFeeRate =
      (filters.salesTaxPercent +
        (filters.saleMode === "sell-order" ? filters.setupFeePercent : 0)) /
      100;

    return response.data.map((opportunity) => {
      const buyFinishedEconomics = calculateOpportunitySaleEconomics(
        opportunity,
        {
          saleMode: filters.saleMode,
          salesTaxPercent: filters.salesTaxPercent,
          setupFeePercent: filters.setupFeePercent,
          transportCostPerUnit: filters.transportCostPerUnit,
        },
      );
      const selectedUnitPrice = selectedBlackMarketUnitPrice(
        opportunity,
        filters.saleMode,
      );
      const buyProfit =
        buyFinishedEconomics.profitPerUnit ?? UNAVAILABLE_PROFIT;
      const buyRoi =
        buyFinishedEconomics.returnOnCostPercent ?? UNAVAILABLE_PROFIT;
      const emptySchedule = buildBlackMarketQualityPriceSchedule({
        targetQuality: opportunity.blackMarketQuality,
        targetUnitPrice: selectedUnitPrice ?? 0,
        availableOrders: [],
        lowerQualityFallbackPercent: 0,
      });
      const incompleteEconomics = calculateBlackMarketCraftingEconomics({
        isComplete: false,
        quantity: 1,
        netMaterialCost: 0,
        recoveredMaterialValue: 0,
        stationFees: 0,
        effectiveCraftCost: 0,
        blackMarketBuyUnitPrice: selectedUnitPrice ?? 0,
        salesTaxRate: effectiveSaleFeeRate,
        targetQuality: opportunity.blackMarketQuality,
        qualityIncreasePercent: 0,
        qualityPriceSchedule: emptySchedule,
        materialTransportCostTotal: 0,
        finishedTransportCostTotal: 0,
        escortCostTotal: 0,
        deathProbabilityRate: 0,
        timeCostTotal: 0,
        focusRequired: 0,
        focusValuePerPoint: 0,
        buyFinishedProfitPerUnit: buyProfit,
      });
      const buyRecommendation = recommendBlackMarketStrategy(
        buyProfit,
        buyRoi,
        1,
        incompleteEconomics,
        incompleteEconomics,
      );
      const entry = preparedByID.get(opportunity.id);
      if (!entry) {
        return {
          opportunity,
          status: "not-craftable" as const,
          buyFinishedEconomics,
          recommendation: buyRecommendation,
          withoutFocus: null,
          withFocus: null,
          focusValuation: null,
        };
      }

      const tier = entry.item.recipe
        ? getRecipeTier(entry.item.recipe, entry.enchantment)
        : null;
      const recipeOption = tier
        ? getRecipeOption(tier, entry.recipeOptionIndex)
        : null;
      if (!tier || !recipeOption) {
        return {
          opportunity,
          status: "not-craftable" as const,
          buyFinishedEconomics,
          recommendation: buyRecommendation,
          withoutFocus: null,
          withFocus: null,
          focusValuation: null,
        };
      }

      const buildConfig = (useFocus: boolean): CraftTreeConfig => ({
        expandedPaths: ROOT_EXPANDED,
        manualPrices: EMPTY_PRICES,
        automaticPrices: bestAutomaticPrices,
        productionConfig: { ...entry.productionConfig, useFocus },
        selectedRecipeOptions: new Map([["root", entry.recipeOptionIndex]]),
        stationFeeConfig: initialStore.stationFeeConfig,
        craftingSpecializationConfig: effectiveSpecialization(
          entry.productionConfig,
          initialStore.craftingSpecializationConfig,
        ),
        itemValueOverride: null,
        stationUsageFeeOverride: null,
      });
      const withoutCalculation = calculateCraftCost(
        entry.item.id,
        entry.enchantment,
        1,
        repository,
        buildConfig(false),
      );
      const withCalculation = calculateCraftCost(
        entry.item.id,
        entry.enchantment,
        1,
        repository,
        buildConfig(true),
      );
      const qualityPriceSchedule = buildBlackMarketQualityPriceSchedule({
        targetQuality: opportunity.blackMarketQuality,
        targetUnitPrice: selectedUnitPrice ?? 0,
        availableOrders: qualityOrdersForOpportunity(
          response,
          opportunity,
          filters.saleMode,
        ),
        lowerQualityFallbackPercent: filters.lowerQualityFallbackPercent,
      });
      const buildEconomics = (
        calculation: typeof withoutCalculation,
        useFocus: boolean,
      ) =>
        calculateBlackMarketCraftingEconomics({
          isComplete: calculation.isComplete && selectedUnitPrice !== null,
          quantity: 1,
          netMaterialCost: calculation.totalMaterialCost,
          recoveredMaterialValue: calculation.totalSilverSavedByReturnRate,
          stationFees: calculation.totalStationFees,
          effectiveCraftCost: calculation.grandTotal,
          blackMarketBuyUnitPrice: selectedUnitPrice ?? 0,
          salesTaxRate: effectiveSaleFeeRate,
          targetQuality: opportunity.blackMarketQuality,
          qualityIncreasePercent:
            initialStore.craftingSpecializationConfig.qualityIncrease,
          qualityPriceSchedule,
          materialTransportCostTotal: filters.materialTransportCostPerBatch,
          finishedTransportCostTotal: filters.finishedTransportCostPerUnit,
          escortCostTotal: filters.escortCostPerBatch,
          deathProbabilityRate: filters.deathProbabilityPercent / 100,
          timeCostTotal: filters.timeCostPerBatch,
          focusRequired: useFocus
            ? calculation.focusCostBreakdown.totalFocusRequired
            : 0,
          focusValuePerPoint: filters.focusValuePerPoint,
          buyFinishedProfitPerUnit: buyProfit,
        });
      const withoutFocus = buildEconomics(withoutCalculation, false);
      const withFocus = buildEconomics(withCalculation, true);
      const recommendation = recommendBlackMarketStrategy(
        buyProfit,
        buyRoi,
        1,
        withoutFocus,
        withFocus,
      );

      return {
        opportunity,
        status:
          withoutFocus.isComplete || withFocus.isComplete
            ? ("ready" as const)
            : ("incomplete" as const),
        buyFinishedEconomics,
        recommendation,
        withoutFocus,
        withFocus,
        focusValuation: calculateBlackMarketFocusValuation(withoutFocus, withFocus),
      };
    });
  }, [
    bestAutomaticPrices,
    filters.deathProbabilityPercent,
    filters.escortCostPerBatch,
    filters.finishedTransportCostPerUnit,
    filters.focusValuePerPoint,
    filters.lowerQualityFallbackPercent,
    filters.materialTransportCostPerBatch,
    filters.saleMode,
    filters.salesTaxPercent,
    filters.setupFeePercent,
    filters.timeCostPerBatch,
    filters.transportCostPerUnit,
    initialStore,
    prepared,
    repository,
    response,
  ]);

  return {
    rows,
    status: market.status,
    error: market.error,
    warnings: market.refreshWarnings,
    materialTargetCount: materialTargets.length,
  };
}
