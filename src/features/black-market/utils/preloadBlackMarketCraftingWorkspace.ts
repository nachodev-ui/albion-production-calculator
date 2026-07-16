import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import type { Item } from "@core/domain/entities/Item";
import type { NodeReturnRateConfig } from "@core/domain/entities/CraftCostNode";
import type {
  CraftingSpecializationConfig,
  StationFeeConfig,
  StationUsageFeeOverride,
} from "@core/domain/entities/ProductionEconomy";
import { useCraftTreeStore } from "@features/craft-calculator/store/craftTreeStore";
import { updateCraftWorkspace } from "@features/craft-calculator/store/craftWorkspaceStorage";
import { useMarketDataStore } from "@features/market-data/store/marketDataStore";
import type { MarketCityId } from "@features/market-data/types/MarketPrice";

interface PreloadBlackMarketCraftingWorkspaceParams {
  readonly item: Item;
  readonly enchantment: EnchantmentLevel;
  readonly quantity: number;
  readonly recipeOptionIndex: number;
  readonly productionConfig: NodeReturnRateConfig;
  readonly stationFeeConfig: StationFeeConfig;
  readonly craftingSpecializationConfig: CraftingSpecializationConfig;
  readonly itemValueOverride: number | null;
  readonly stationUsageFeeOverride: StationUsageFeeOverride | null;
  readonly isPremium: boolean;
  readonly materialCities: ReadonlyMap<string, MarketCityId>;
}

export function preloadBlackMarketCraftingWorkspace({
  item,
  enchantment,
  quantity,
  recipeOptionIndex,
  productionConfig,
  stationFeeConfig,
  craftingSpecializationConfig,
  itemValueOverride,
  stationUsageFeeOverride,
  isPremium,
  materialCities,
}: PreloadBlackMarketCraftingWorkspaceParams): void {
  const rootKey = `${item.id}@${enchantment}`;
  const craftStore = useCraftTreeStore.getState();
  craftStore.resetForItem(item.id, enchantment, true);

  const activeCraftStore = useCraftTreeStore.getState();
  if (!activeCraftStore.expandedPaths.has("root")) {
    activeCraftStore.toggleExpanded("root");
  }

  const configuredCraftStore = useCraftTreeStore.getState();
  configuredCraftStore.setRecipeOption("root", recipeOptionIndex);
  configuredCraftStore.setProductionConfig(productionConfig);
  configuredCraftStore.setStationFeeConfig(stationFeeConfig);
  configuredCraftStore.setCraftingSpecializationConfig(
    craftingSpecializationConfig,
  );
  configuredCraftStore.setItemValueOverride(itemValueOverride);
  configuredCraftStore.setStationUsageFeeOverride(stationUsageFeeOverride);
  configuredCraftStore.setIsPremium(isPremium);

  useMarketDataStore
    .getState()
    .applyMarketRecommendation(rootKey, materialCities, null);

  updateCraftWorkspace((current) => {
    const enchantmentsByItem = new Map(current.enchantmentsByItem);
    const quantitiesByRoot = new Map(current.quantitiesByRoot);
    const expandedPathsByRoot = new Map(current.expandedPathsByRoot);
    const selectedRecipeOptionsByRoot = new Map(
      current.selectedRecipeOptionsByRoot,
    );
    const itemValueOverridesByRoot = new Map(
      current.itemValueOverridesByRoot,
    );
    const stationUsageFeeOverridesByRoot = new Map(
      current.stationUsageFeeOverridesByRoot,
    );

    enchantmentsByItem.set(item.id, enchantment);
    quantitiesByRoot.set(rootKey, quantity);
    expandedPathsByRoot.set(rootKey, new Set(["root"]));
    selectedRecipeOptionsByRoot.set(
      rootKey,
      new Map([["root", recipeOptionIndex]]),
    );

    if (itemValueOverride === null) {
      itemValueOverridesByRoot.delete(rootKey);
    } else {
      itemValueOverridesByRoot.set(rootKey, itemValueOverride);
    }

    if (stationUsageFeeOverride === null) {
      stationUsageFeeOverridesByRoot.delete(rootKey);
    } else {
      stationUsageFeeOverridesByRoot.set(rootKey, stationUsageFeeOverride);
    }

    return {
      ...current,
      selectedItemId: item.id,
      enchantmentsByItem,
      quantitiesByRoot,
      expandedPathsByRoot,
      selectedRecipeOptionsByRoot,
      productionConfig,
      stationFeeConfig,
      craftingSpecializationConfig,
      itemValueOverridesByRoot,
      stationUsageFeeOverridesByRoot,
      isPremium,
    };
  });
}
