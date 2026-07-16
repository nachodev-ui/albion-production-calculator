import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_HIDEOUT_POWER_LEVEL,
  getHideoutPowerProfile,
  type NodeReturnRateConfig,
} from "@core/domain/entities";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import type { Item } from "@core/domain/entities/Item";
import { isReturnEligibleIngredient } from "@core/domain/entities/ResourceReturnEligibility";
import {
  getRecipeOption,
  getRecipeOptions,
  getRecipeTier,
} from "@core/domain/entities/Recipe";
import type {
  CraftingSpecializationConfig,
  StationFeeConfig,
  StationUsageFeeOverride,
} from "@core/domain/entities/ProductionEconomy";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import {
  calculateCraftCost,
  DEFAULT_RETURN_RATE_CONFIG,
  type CraftTreeConfig,
} from "@core/usecases/calculateCraftCost";
import { CalculationReadinessBanner } from "@features/craft-calculator/components/CalculationReadinessBanner";
import { ReturnedMaterialsCard } from "@features/craft-calculator/components/ReturnedMaterialsCard";
import { ProductionConfigCard } from "@features/craft-calculator/components/recipe/ProductionConfigCard";
import { RecipeOptionSelector } from "@features/craft-calculator/components/recipe/RecipeOptionSelector";
import { useCraftTreeStore } from "@features/craft-calculator/store/craftTreeStore";
import { updateCraftWorkspace } from "@features/craft-calculator/store/craftWorkspaceStorage";
import {
  applyRecommendedProductionCity,
  getProductionCityRecommendation,
} from "@features/craft-calculator/utils/productionRecommendation";
import { MaterialMarketCitySelect } from "@features/market-data/components/MaterialMarketCitySelect";
import { MaterialPurchaseConfigBar } from "@features/market-data/components/MaterialPurchaseConfigBar";
import { useCurrentMarketPrices } from "@features/market-data/hooks/useCurrentMarketPrices";
import type {
  AlbionServer as MarketAlbionServer,
  MarketCityId,
  MarketPriceFreshness,
} from "@features/market-data/types/MarketPrice";
import {
  buildItemPriceKey,
  getMarketName,
} from "@features/market-data/types/MarketPrice";
import { collectMarketPriceTargets } from "@features/market-data/utils/collectMarketPriceTargets";
import { InfoHint } from "@shared/components/InfoHint";
import { ItemIcon } from "@shared/components/ItemIcon";
import type { AlbionServer, BlackMarketOpportunity } from "../types";
import {
  calculateBlackMarketCraftingEconomics,
  recommendBlackMarketStrategy,
} from "../utils/blackMarketCraftingComparison";
import {
  BLACK_MARKET_QUALITY_LABELS,
  formatBlackMarketPercent,
  formatBlackMarketSilver,
} from "./blackMarketScannerConfig";

interface BlackMarketStrategyComparisonProps {
  readonly item: Item | null;
  readonly enchantment: EnchantmentLevel;
  readonly server: AlbionServer;
  readonly opportunity: BlackMarketOpportunity;
  readonly repository: ItemRepository;
  readonly buyContent: ReactNode;
  readonly onOpenCrafting: (item: Item) => void;
}

type StrategyTab = "buy" | "craft";
type TransportMode = "per-unit" | "batch";

const EMPTY_PRICES = new Map<string, number>();
const EMPTY_OPTIONS = new Map<string, number>();
const ROOT_EXPANDED = new Set(["root"]);

const MARKET_SERVER_BY_BLACK_MARKET: Record<AlbionServer, MarketAlbionServer> = {
  west: "americas",
  east: "asia",
  europe: "europe",
};

const FRESHNESS_LABELS: Record<MarketPriceFreshness, string> = {
  recent: "Reciente",
  acceptable: "Aceptable",
  stale: "Antiguo",
  missing: "Sin datos",
};

function formatDate(value: string | null): string {
  if (!value) return "Sin captura";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha desconocida";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatSignedSilver(value: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatBlackMarketSilver(value)}`;
}

function buildEffectiveSpecialization(
  productionConfig: NodeReturnRateConfig,
  specializationConfig: CraftingSpecializationConfig,
): CraftingSpecializationConfig {
  const hideoutProfile = getHideoutPowerProfile(
    productionConfig.hideoutPowerLevel ?? DEFAULT_HIDEOUT_POWER_LEVEL,
  );
  return {
    ...specializationConfig,
    hideoutSpecialistBonus:
      productionConfig.isHideout === true &&
      productionConfig.hideoutSpecialized === true
        ? hideoutProfile.specialistCraftingBonus
        : 0,
  };
}

function StrategyMetric({
  label,
  value,
  tone = "default",
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: "default" | "positive" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-text-faint">
        {label}
      </p>
      <p className={`mt-1.5 text-lg font-semibold tabular ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function EconomicRow({
  label,
  value,
  strong = false,
  positive = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
  readonly positive?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2.5 text-sm ${
        strong ? "border-t border-border pt-3 font-semibold" : ""
      }`}
    >
      <span className={strong ? "text-text" : "text-text-muted"}>{label}</span>
      <span
        className={`tabular ${
          positive ? "text-positive" : strong ? "text-text" : "text-text-muted"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function BlackMarketStrategyComparison({
  item,
  enchantment,
  server,
  opportunity,
  repository,
  buyContent,
  onOpenCrafting,
}: BlackMarketStrategyComparisonProps) {
  const [activeTab, setActiveTab] = useState<StrategyTab>("buy");
  const [quantity, setQuantity] = useState(1);
  const [transportMode, setTransportMode] =
    useState<TransportMode>("per-unit");
  const [transportValue, setTransportValue] = useState(
    opportunity.transportCostPerUnit,
  );
  const storeSnapshot = useMemo(() => useCraftTreeStore.getState(), []);
  const productionRecommendation = useMemo(
    () => (item ? getProductionCityRecommendation(item) : null),
    [item],
  );
  const [productionConfig, setProductionConfig] =
    useState<NodeReturnRateConfig>(() =>
      item
        ? applyRecommendedProductionCity(
            storeSnapshot.productionConfig,
            getProductionCityRecommendation(item),
            "crafting",
          )
        : DEFAULT_RETURN_RATE_CONFIG,
    );
  const [stationFeeConfig, setStationFeeConfig] = useState<StationFeeConfig>(
    storeSnapshot.stationFeeConfig,
  );
  const [specializationConfig, setSpecializationConfig] =
    useState<CraftingSpecializationConfig>(
      storeSnapshot.craftingSpecializationConfig,
    );
  const [itemValueOverride, setItemValueOverride] = useState<number | null>(null);
  const [stationUsageFeeOverride, setStationUsageFeeOverride] =
    useState<StationUsageFeeOverride | null>(null);
  const [isPremium, setIsPremium] = useState(storeSnapshot.isPremium);
  const [recipeOptionIndex, setRecipeOptionIndex] = useState(0);

  const tier = item?.recipe ? getRecipeTier(item.recipe, enchantment) : null;
  const recipeOptions = tier ? getRecipeOptions(tier) : [];
  const canCraft =
    item !== null &&
    tier !== null &&
    recipeOptions.some((option) => option.ingredients.length > 0);
  const selectedRecipeOption = tier
    ? getRecipeOption(tier, recipeOptionIndex)
    : null;

  const buildTreeConfig = useMemo(
    () =>
      (
        useFocus: boolean,
        automaticPrices: ReadonlyMap<string, number>,
      ): CraftTreeConfig => {
        const nextProductionConfig = {
          ...productionConfig,
          useFocus,
        };
        return {
          expandedPaths: ROOT_EXPANDED,
          manualPrices: EMPTY_PRICES,
          automaticPrices,
          productionConfig: nextProductionConfig,
          selectedRecipeOptions: new Map([["root", recipeOptionIndex]]),
          stationFeeConfig,
          craftingSpecializationConfig: buildEffectiveSpecialization(
            nextProductionConfig,
            specializationConfig,
          ),
          itemValueOverride,
          stationUsageFeeOverride,
        };
      },
    [
      itemValueOverride,
      productionConfig,
      recipeOptionIndex,
      specializationConfig,
      stationFeeConfig,
      stationUsageFeeOverride,
    ],
  );

  const structureCalculation = useMemo(
    () =>
      canCraft && item
        ? calculateCraftCost(
            item.id,
            enchantment,
            quantity,
            repository,
            buildTreeConfig(false, EMPTY_PRICES),
          )
        : null,
    [
      buildTreeConfig,
      canCraft,
      enchantment,
      item,
      quantity,
      repository,
    ],
  );
  const materialTargets = useMemo(
    () =>
      structureCalculation && tier
        ? collectMarketPriceTargets(structureCalculation.root, tier)
        : [],
    [structureCalculation, tier],
  );
  const rootKey = item ? `black-market-craft:${item.id}@${enchantment}` : "black-market-craft:missing";
  const materialLabels = useMemo(() => {
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
    rootKey,
    materialTargets,
    saleTarget: null,
    targetLabels: materialLabels,
  });

  useEffect(() => {
    market.setConfig({
      server: MARKET_SERVER_BY_BLACK_MARKET[server],
      purchaseCity: opportunity.purchaseMarketKey as MarketCityId,
    });
  }, [market.setConfig, opportunity.purchaseMarketKey, server]);

  const withoutFocusCalculation = useMemo(
    () =>
      canCraft && item
        ? calculateCraftCost(
            item.id,
            enchantment,
            quantity,
            repository,
            buildTreeConfig(false, market.automaticPurchasePrices),
          )
        : null,
    [
      buildTreeConfig,
      canCraft,
      enchantment,
      item,
      market.automaticPurchasePrices,
      quantity,
      repository,
    ],
  );
  const withFocusCalculation = useMemo(
    () =>
      canCraft && item
        ? calculateCraftCost(
            item.id,
            enchantment,
            quantity,
            repository,
            buildTreeConfig(true, market.automaticPurchasePrices),
          )
        : null,
    [
      buildTreeConfig,
      canCraft,
      enchantment,
      item,
      market.automaticPurchasePrices,
      quantity,
      repository,
    ],
  );

  const transportCostTotal =
    transportMode === "per-unit" ? transportValue * quantity : transportValue;
  const emptyEconomics = calculateBlackMarketCraftingEconomics({
    isComplete: false,
    quantity,
    netMaterialCost: 0,
    recoveredMaterialValue: 0,
    stationFees: 0,
    effectiveCraftCost: 0,
    blackMarketBuyUnitPrice: opportunity.blackMarketBuyUnitPrice,
    estimatedSalesTaxPerUnit: opportunity.estimatedSalesTax,
    transportCostTotal,
    buyFinishedProfitPerUnit: opportunity.profit,
  });
  const withoutFocusEconomics = withoutFocusCalculation
    ? calculateBlackMarketCraftingEconomics({
        isComplete: withoutFocusCalculation.isComplete,
        quantity,
        netMaterialCost: withoutFocusCalculation.totalMaterialCost,
        recoveredMaterialValue:
          withoutFocusCalculation.totalSilverSavedByReturnRate,
        stationFees: withoutFocusCalculation.totalStationFees,
        effectiveCraftCost: withoutFocusCalculation.grandTotal,
        blackMarketBuyUnitPrice: opportunity.blackMarketBuyUnitPrice,
        estimatedSalesTaxPerUnit: opportunity.estimatedSalesTax,
        transportCostTotal,
        buyFinishedProfitPerUnit: opportunity.profit,
      })
    : emptyEconomics;
  const withFocusEconomics = withFocusCalculation
    ? calculateBlackMarketCraftingEconomics({
        isComplete: withFocusCalculation.isComplete,
        quantity,
        netMaterialCost: withFocusCalculation.totalMaterialCost,
        recoveredMaterialValue:
          withFocusCalculation.totalSilverSavedByReturnRate,
        stationFees: withFocusCalculation.totalStationFees,
        effectiveCraftCost: withFocusCalculation.grandTotal,
        blackMarketBuyUnitPrice: opportunity.blackMarketBuyUnitPrice,
        estimatedSalesTaxPerUnit: opportunity.estimatedSalesTax,
        transportCostTotal,
        buyFinishedProfitPerUnit: opportunity.profit,
      })
    : emptyEconomics;
  const selectedCalculation = productionConfig.useFocus
    ? withFocusCalculation
    : withoutFocusCalculation;
  const selectedEconomics = productionConfig.useFocus
    ? withFocusEconomics
    : withoutFocusEconomics;
  const recommendation = recommendBlackMarketStrategy(
    opportunity.profit,
    quantity,
    withoutFocusEconomics,
    withFocusEconomics,
  );
  const craftsNeeded = selectedRecipeOption
    ? quantity / selectedRecipeOption.outputQuantity
    : 0;

  function changeQuantity(rawValue: string) {
    const next = Number(rawValue);
    if (!Number.isFinite(next)) return;
    setQuantity(Math.max(1, Math.floor(next)));
    setStationUsageFeeOverride(null);
  }

  function changeTransport(rawValue: string) {
    const next = Number(rawValue);
    if (!Number.isFinite(next)) return;
    setTransportValue(Math.max(0, next));
  }

  function openInCraftingCalculator() {
    if (!item) return;
    const calculatorRootKey = `${item.id}@${enchantment}`;
    const store = useCraftTreeStore.getState();

    store.resetForItem(item.id, enchantment, true);
    if (!store.expandedPaths.has("root")) store.toggleExpanded("root");
    store.setRecipeOption("root", recipeOptionIndex);
    store.setProductionConfig(productionConfig);
    store.setStationFeeConfig(stationFeeConfig);
    store.setCraftingSpecializationConfig(specializationConfig);
    store.setItemValueOverride(itemValueOverride);
    store.setStationUsageFeeOverride(stationUsageFeeOverride);
    store.setIsPremium(isPremium);

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
      quantitiesByRoot.set(calculatorRootKey, quantity);
      expandedPathsByRoot.set(calculatorRootKey, new Set(["root"]));
      selectedRecipeOptionsByRoot.set(
        calculatorRootKey,
        new Map([["root", recipeOptionIndex]]),
      );
      if (itemValueOverride === null) itemValueOverridesByRoot.delete(calculatorRootKey);
      else itemValueOverridesByRoot.set(calculatorRootKey, itemValueOverride);
      if (stationUsageFeeOverride === null) {
        stationUsageFeeOverridesByRoot.delete(calculatorRootKey);
      } else {
        stationUsageFeeOverridesByRoot.set(
          calculatorRootKey,
          stationUsageFeeOverride,
        );
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
        craftingSpecializationConfig: specializationConfig,
        itemValueOverridesByRoot,
        stationUsageFeeOverridesByRoot,
        isPremium,
      };
    });

    onOpenCrafting(item);
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <section className="rounded-xl border border-accent-border/45 bg-accent-muted/25 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-faint">
              Mejor estrategia para el lote
            </p>
            <h3 className="mt-1 text-lg font-semibold text-text">
              {recommendation.label}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {recommendation.kind === "buy-finished"
                ? "La compra del objeto terminado supera las variantes de fabricación que tienen datos completos."
                : `Ventaja frente a comprar terminado: ${formatSignedSilver(
                    recommendation.advantageOverBuying / quantity,
                  )} plata por unidad.`}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-text-faint">Beneficio del lote</p>
            <p className="text-xl font-semibold tabular text-positive">
              {formatSignedSilver(recommendation.profit)} plata
            </p>
          </div>
        </div>
      </section>

      <div
        className="grid grid-cols-2 rounded-xl border border-border bg-surface-raised p-1"
        role="tablist"
        aria-label="Estrategias del Black Market"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "buy"}
          onClick={() => setActiveTab("buy")}
          className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "buy"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Comprar y transportar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "craft"}
          onClick={() => setActiveTab("craft")}
          className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "craft"
              ? "bg-surface text-text shadow-sm"
              : "text-text-muted hover:text-text"
          }`}
        >
          Fabricar con RRR
        </button>
      </div>

      {activeTab === "buy" ? (
        buyContent
      ) : !canCraft || !item || !tier || !selectedCalculation ? (
        <section className="rounded-xl border border-warning/35 bg-warning-muted p-5">
          <h3 className="text-base font-semibold text-warning">
            Estrategia de fabricación no disponible
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Este objeto no posee una receta válida para el encantamiento analizado. La oportunidad puede evaluarse únicamente como compra y transporte.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StrategyMetric
              label="Fabricar sin foco"
              value={
                withoutFocusEconomics.profitPerUnit === null
                  ? "Datos incompletos"
                  : `${formatSignedSilver(withoutFocusEconomics.profitPerUnit)} plata/u`
              }
              tone={withoutFocusEconomics.profitPerUnit === null ? "warning" : "default"}
            />
            <StrategyMetric
              label="Fabricar con foco"
              value={
                withFocusEconomics.profitPerUnit === null
                  ? "Datos incompletos"
                  : `${formatSignedSilver(withFocusEconomics.profitPerUnit)} plata/u`
              }
              tone={withFocusEconomics.profitPerUnit === null ? "warning" : "positive"}
            />
            <StrategyMetric
              label="ROI seleccionado"
              value={
                selectedEconomics.returnOnCostPercent === null
                  ? "Incompleto"
                  : formatBlackMarketPercent(
                      selectedEconomics.returnOnCostPercent,
                    )
              }
              tone={selectedEconomics.returnOnCostPercent === null ? "warning" : "positive"}
            />
            <StrategyMetric
              label="Ventaja vs comprar"
              value={
                selectedEconomics.advantageOverBuying === null
                  ? "Incompleto"
                  : `${formatSignedSilver(
                      selectedEconomics.advantageOverBuying / quantity,
                    )} plata/u`
              }
              tone={
                (selectedEconomics.advantageOverBuying ?? 0) > 0
                  ? "positive"
                  : "default"
              }
            />
          </section>

          <section className="rounded-xl border border-border bg-surface-raised/55 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Cantidad a fabricar
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(event) => changeQuantity(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-muted">
                    Transporte a Caerleon
                  </span>
                  <InfoHint
                    label="Transporte de fabricación"
                    text="Puedes expresar el transporte por unidad o como costo total del lote. La comparación de compra terminada conserva el transporte usado por el escáner."
                    align="left"
                    openOnHover
                  />
                </div>
                <div className="mt-1.5 grid grid-cols-[9rem_minmax(0,1fr)] gap-2">
                  <select
                    value={transportMode}
                    onChange={(event) =>
                      setTransportMode(event.target.value as TransportMode)
                    }
                    className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  >
                    <option value="per-unit">Por unidad</option>
                    <option value="batch">Por lote</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={transportValue}
                    onChange={(event) => changeTransport(event.target.value)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  />
                </div>
              </div>
            </div>
          </section>

          <ProductionConfigCard
            config={productionConfig}
            recommendation={productionRecommendation}
            isPremium={isPremium}
            station={tier.station}
            quantity={quantity}
            stationFeeConfig={stationFeeConfig}
            craftingSpecializationConfig={specializationConfig}
            detectedItemValue={item.itemValue ?? null}
            itemValueOverride={itemValueOverride}
            stationUsageFeeOverride={stationUsageFeeOverride}
            stationFeeBreakdown={selectedCalculation.stationFeeBreakdown}
            focusCostBreakdown={selectedCalculation.focusCostBreakdown}
            onChange={setProductionConfig}
            onPremiumChange={setIsPremium}
            onStationFeeConfigChange={setStationFeeConfig}
            onCraftingSpecializationConfigChange={setSpecializationConfig}
            onItemValueOverrideChange={setItemValueOverride}
            onStationUsageFeeOverrideChange={setStationUsageFeeOverride}
          />

          <section className="rounded-xl border border-border bg-surface-raised/45 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">
                  Materiales y ciudades de compra
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-text-faint">
                  Los precios muestran la captura utilizada y su antigüedad. Un material sin precio deja la estrategia incompleta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void market.refresh()}
                disabled={market.status === "loading"}
                className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:border-accent-border hover:text-accent disabled:cursor-wait disabled:opacity-60"
              >
                {market.status === "loading" ? "Actualizando…" : "Actualizar materiales"}
              </button>
            </div>

            <MaterialPurchaseConfigBar
              config={market.config}
              markets={market.markets}
              materialCityOverrideCount={market.materialCityOverrideCount}
              onChange={market.setConfig}
              onClearMaterialCities={market.clearMaterialPurchaseCities}
            />

            {recipeOptions.length > 1 && (
              <RecipeOptionSelector
                tier={tier}
                selectedIndex={recipeOptionIndex}
                repository={repository}
                onChange={(index) => {
                  setRecipeOptionIndex(index);
                  setStationUsageFeeOverride(null);
                }}
              />
            )}

            <div className="mt-4 space-y-3">
              {selectedCalculation.root.children.map((material, index) => {
                const materialItem = repository.getById(material.itemId);
                const key = buildItemPriceKey(
                  material.itemId,
                  material.enchantment,
                );
                const detail = market.automaticPurchasePriceDetails.get(key);
                const comparisons =
                  market.materialMarketPriceComparisons.get(key) ?? [];
                const override = market.materialPurchaseCityOverrides.get(key);
                const city =
                  market.resolvedMaterialPurchaseCities.get(key) ??
                  market.config.purchaseCity;
                const unitPrice = market.automaticPurchasePrices.get(key);
                const batchQuantity = material.quantity * craftsNeeded;
                const returnEligible =
                  materialItem !== null &&
                  isReturnEligibleIngredient(item, materialItem);

                return (
                  <article
                    key={`${key}:${index}`}
                    className="grid gap-3 rounded-xl border border-border bg-surface p-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ItemIcon
                        itemId={material.itemId}
                        enchantment={material.enchantment}
                        name={materialItem?.name ?? String(material.itemId)}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {materialItem?.name ?? String(material.itemId)}
                        </p>
                        <p className="mt-0.5 text-xs text-text-faint">
                          x{batchQuantity.toLocaleString("es-CL", {
                            maximumFractionDigits: 2,
                          })} para el lote · {returnEligible ? "recuperable por RRR" : "no recibe RRR"}
                        </p>
                        <p className="mt-1 text-[11px] text-text-faint">
                          {FRESHNESS_LABELS[detail?.freshness ?? "missing"]} · {formatDate(detail?.updatedAt ?? null)}
                        </p>
                      </div>
                    </div>
                    <MaterialMarketCitySelect
                      value={override ?? null}
                      defaultCity={market.config.purchaseCity}
                      markets={market.markets}
                      comparisons={comparisons}
                      ariaLabel={`Ciudad de compra de ${materialItem?.name ?? String(material.itemId)}`}
                      onChange={(nextCity) =>
                        market.setMaterialPurchaseCity(key, nextCity)
                      }
                    />
                    <div className="text-left md:text-right">
                      <p className="text-xs text-text-faint">
                        {getMarketName(market.markets, city)}
                      </p>
                      <p
                        className={`mt-1 font-semibold tabular ${
                          unitPrice === undefined ? "text-warning" : "text-text"
                        }`}
                      >
                        {unitPrice === undefined
                          ? "Sin precio"
                          : `${formatBlackMarketSilver(unitPrice)} plata/u`}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <CalculationReadinessBanner
            missingPrices={selectedCalculation.missingPriceItems}
            repository={repository}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
              <h3 className="text-sm font-semibold text-text">
                Costo efectivo de fabricación
              </h3>
              <div className="mt-2 divide-y divide-border/70">
                <EconomicRow
                  label="Costo bruto de materiales"
                  value={formatBlackMarketSilver(
                    selectedEconomics.grossMaterialCost,
                  )}
                />
                <EconomicRow
                  label="Materiales recuperados por RRR"
                  value={`−${formatBlackMarketSilver(
                    selectedEconomics.recoveredMaterialValue,
                  )}`}
                  positive
                />
                <EconomicRow
                  label="Tarifas de estación"
                  value={`+${formatBlackMarketSilver(
                    selectedEconomics.stationFees,
                  )}`}
                />
                <EconomicRow
                  label="Costo real de fabricación"
                  value={formatBlackMarketSilver(
                    selectedEconomics.effectiveCraftCost,
                  )}
                  strong
                />
              </div>
            </article>

            <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
              <h3 className="text-sm font-semibold text-text">
                Venta del lote al Black Market
              </h3>
              <div className="mt-2 divide-y divide-border/70">
                <EconomicRow
                  label="Orden de compra"
                  value={formatBlackMarketSilver(
                    opportunity.blackMarketBuyUnitPrice * quantity,
                  )}
                />
                <EconomicRow
                  label="Impuesto estimado"
                  value={`−${formatBlackMarketSilver(
                    selectedEconomics.estimatedSalesTax,
                  )}`}
                />
                <EconomicRow
                  label="Transporte"
                  value={`−${formatBlackMarketSilver(
                    selectedEconomics.transportCostTotal,
                  )}`}
                />
                <EconomicRow
                  label="Beneficio neto del lote"
                  value={
                    selectedEconomics.profit === null
                      ? "Datos incompletos"
                      : formatSignedSilver(selectedEconomics.profit)
                  }
                  strong
                  positive={(selectedEconomics.profit ?? 0) > 0}
                />
              </div>
            </article>
          </div>

          <ReturnedMaterialsCard
            materials={selectedCalculation.returnedMaterials}
            repository={repository}
            rootNode={selectedCalculation.root}
          />

          <div className="space-y-3 rounded-xl border border-warning/30 bg-warning-muted p-4 text-xs leading-relaxed text-text-muted">
            <p>
              La orden analizada exige calidad {BLACK_MARKET_QUALITY_LABELS[opportunity.blackMarketQuality]}. La calidad final del crafteo no está garantizada; confirma que el lote producido puede cubrir esa orden antes de usar el beneficio estimado.
            </p>
            <p>
              Los artefactos y componentes especiales se valoran como costo, pero el motor de crafteo los excluye del retorno de recursos.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-accent-border/40 bg-accent-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">
                Continuar en la calculadora completa
              </h3>
              <p className="mt-1 text-xs text-text-muted">
                Abrirá el objeto con encantamiento, cantidad, ciudad, foco, Premium, tarifas, especialización y variante de receta precargados.
              </p>
            </div>
            <button
              type="button"
              onClick={openInCraftingCalculator}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              Abrir en calculadora de crafteo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
