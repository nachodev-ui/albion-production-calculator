import {
  useCallback,
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
import type { CraftCalculation } from "@core/domain/entities/CraftCostNode";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import type { Item } from "@core/domain/entities/Item";
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
import { useCraftTreeStore } from "@features/craft-calculator/store/craftTreeStore";
import {
  applyRecommendedProductionCity,
  getProductionCityRecommendation,
} from "@features/craft-calculator/utils/productionRecommendation";
import { useCurrentMarketPrices } from "@features/market-data/hooks/useCurrentMarketPrices";
import type {
  AlbionServer as MarketAlbionServer,
  MarketCityId,
} from "@features/market-data/types/MarketPrice";
import { buildItemPriceKey } from "@features/market-data/types/MarketPrice";
import { collectMarketPriceTargets } from "@features/market-data/utils/collectMarketPriceTargets";
import { InfoHint } from "@shared/components/InfoHint";
import { BlackMarketCraftingEconomicsCards } from "./BlackMarketCraftingEconomicsCards";
import { BlackMarketCraftingMaterialsCard } from "./BlackMarketCraftingMaterialsCard";
import type {
  AlbionServer,
  BlackMarketOpportunity,
  BlackMarketOpportunityFilters,
} from "../types";
import {
  calculateBlackMarketCraftingEconomics,
  calculateBlackMarketFocusValuation,
  recommendBlackMarketStrategy,
  type BlackMarketCraftingEconomics,
} from "../utils/blackMarketCraftingComparison";
import {
  buildBlackMarketQualityPriceSchedule,
  type BlackMarketQualityPricePoint,
} from "../utils/blackMarketQuality";
import { preloadBlackMarketCraftingWorkspace } from "../utils/preloadBlackMarketCraftingWorkspace";
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
  readonly qualityOpportunities: readonly BlackMarketOpportunity[];
  readonly filters: BlackMarketOpportunityFilters;
  readonly repository: ItemRepository;
  readonly buyContent: ReactNode;
  readonly onOpenCrafting: (item: Item) => void;
}

type StrategyTab = "buy" | "craft";

const EMPTY_PRICES: ReadonlyMap<string, number> = new Map();
const ROOT_EXPANDED: ReadonlySet<string> = new Set(["root"]);
const MARKET_SERVER_BY_BLACK_MARKET: Record<AlbionServer, MarketAlbionServer> = {
  west: "americas",
  east: "asia",
  europe: "europe",
};

function formatSignedSilver(value: number): string {
  return `${value > 0 ? "+" : ""}${formatBlackMarketSilver(value)}`;
}

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDecimal(value: number | null, maximumFractionDigits = 2): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits,
  }).format(value);
}

function nonNegative(rawValue: string): number {
  const value = Number(rawValue.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : 0;
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

function Metric({
  label,
  value,
  tone = "default",
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: "default" | "positive" | "warning";
}) {
  const className =
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
      <p className={`mt-1.5 text-lg font-semibold tabular ${className}`}>
        {value}
      </p>
    </div>
  );
}

function qualityOrders(
  opportunity: BlackMarketOpportunity,
  candidates: readonly BlackMarketOpportunity[],
): readonly BlackMarketQualityPricePoint[] {
  return candidates
    .filter((candidate) => candidate.itemIdentifier === opportunity.itemIdentifier)
    .map((candidate) => ({
      minimumQuality: Math.min(
        5,
        Math.max(1, candidate.blackMarketQuality),
      ) as 1 | 2 | 3 | 4 | 5,
      unitPrice: candidate.blackMarketBuyUnitPrice,
    }));
}

export function BlackMarketStrategyComparison({
  item,
  enchantment,
  server,
  opportunity,
  qualityOpportunities,
  filters,
  repository,
  buyContent,
  onOpenCrafting,
}: BlackMarketStrategyComparisonProps) {
  const [initialStore] = useState(() => useCraftTreeStore.getState());
  const cityRecommendation = useMemo(
    () => (item ? getProductionCityRecommendation(item) : null),
    [item],
  );
  const [activeTab, setActiveTab] = useState<StrategyTab>("buy");
  const [quantity, setQuantity] = useState(1);
  const [focusValuePerPoint, setFocusValuePerPoint] = useState(
    filters.focusValuePerPoint,
  );
  const [lowerQualityFallbackPercent, setLowerQualityFallbackPercent] = useState(
    filters.lowerQualityFallbackPercent,
  );
  const [materialTransportCostTotal, setMaterialTransportCostTotal] = useState(
    filters.materialTransportCostPerBatch,
  );
  const [finishedTransportCostPerUnit, setFinishedTransportCostPerUnit] = useState(
    filters.finishedTransportCostPerUnit,
  );
  const [escortCostTotal, setEscortCostTotal] = useState(
    filters.escortCostPerBatch,
  );
  const [deathProbabilityPercent, setDeathProbabilityPercent] = useState(
    filters.deathProbabilityPercent,
  );
  const [timeCostTotal, setTimeCostTotal] = useState(filters.timeCostPerBatch);
  const [productionConfig, setProductionConfig] =
    useState<NodeReturnRateConfig>(() =>
      item
        ? applyRecommendedProductionCity(
            initialStore.productionConfig,
            getProductionCityRecommendation(item),
            "crafting",
          )
        : DEFAULT_RETURN_RATE_CONFIG,
    );
  const [stationFeeConfig, setStationFeeConfig] = useState<StationFeeConfig>(
    initialStore.stationFeeConfig,
  );
  const [specializationConfig, setSpecializationConfig] =
    useState<CraftingSpecializationConfig>(
      initialStore.craftingSpecializationConfig,
    );
  const [isPremium, setIsPremium] = useState(initialStore.isPremium);
  const [itemValueOverride, setItemValueOverride] = useState<number | null>(null);
  const [stationUsageFeeOverride, setStationUsageFeeOverride] =
    useState<StationUsageFeeOverride | null>(null);
  const [recipeOptionIndex, setRecipeOptionIndex] = useState(0);

  const tier = item?.recipe ? getRecipeTier(item.recipe, enchantment) : null;
  const recipeOptions = tier ? getRecipeOptions(tier) : [];
  const selectedRecipeOption = tier
    ? getRecipeOption(tier, recipeOptionIndex)
    : null;
  const canCraft =
    item !== null &&
    tier !== null &&
    recipeOptions.some((option) => option.ingredients.length > 0);

  const buildTreeConfig = useCallback(
    (
      useFocus: boolean,
      automaticPrices: ReadonlyMap<string, number>,
    ): CraftTreeConfig => {
      const nextProductionConfig = { ...productionConfig, useFocus };
      return {
        expandedPaths: ROOT_EXPANDED,
        manualPrices: EMPTY_PRICES,
        automaticPrices,
        productionConfig: nextProductionConfig,
        selectedRecipeOptions: new Map([["root", recipeOptionIndex]]),
        stationFeeConfig,
        craftingSpecializationConfig: effectiveSpecialization(
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

  const structureCalculation = useMemo(() => {
    if (!canCraft || !item) return null;
    return calculateCraftCost(
      item.id,
      enchantment,
      quantity,
      repository,
      buildTreeConfig(false, EMPTY_PRICES),
    );
  }, [buildTreeConfig, canCraft, enchantment, item, quantity, repository]);
  const materialTargets = useMemo(
    () =>
      structureCalculation && tier
        ? collectMarketPriceTargets(structureCalculation.root, tier)
        : [],
    [structureCalculation, tier],
  );
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
    rootKey: item
      ? `black-market-craft:${item.id}@${enchantment}`
      : "black-market-craft:missing",
    materialTargets,
    saleTarget: null,
    targetLabels: materialLabels,
  });
  const setMarketConfig = market.setConfig;

  useEffect(() => {
    setMarketConfig({
      server: MARKET_SERVER_BY_BLACK_MARKET[server],
      purchaseCity: opportunity.purchaseMarketKey as MarketCityId,
    });
  }, [opportunity.purchaseMarketKey, server, setMarketConfig]);

  const withoutFocusCalculation = useMemo(() => {
    if (!canCraft || !item) return null;
    return calculateCraftCost(
      item.id,
      enchantment,
      quantity,
      repository,
      buildTreeConfig(false, market.automaticPurchasePrices),
    );
  }, [
    buildTreeConfig,
    canCraft,
    enchantment,
    item,
    market.automaticPurchasePrices,
    quantity,
    repository,
  ]);
  const withFocusCalculation = useMemo(() => {
    if (!canCraft || !item) return null;
    return calculateCraftCost(
      item.id,
      enchantment,
      quantity,
      repository,
      buildTreeConfig(true, market.automaticPurchasePrices),
    );
  }, [
    buildTreeConfig,
    canCraft,
    enchantment,
    item,
    market.automaticPurchasePrices,
    quantity,
    repository,
  ]);

  const qualityPriceSchedule = useMemo(
    () =>
      buildBlackMarketQualityPriceSchedule({
        targetQuality: opportunity.blackMarketQuality,
        targetUnitPrice: opportunity.blackMarketBuyUnitPrice,
        availableOrders: qualityOrders(opportunity, qualityOpportunities),
        lowerQualityFallbackPercent,
      }),
    [
      lowerQualityFallbackPercent,
      opportunity,
      qualityOpportunities,
    ],
  );
  const finishedTransportCostTotal =
    finishedTransportCostPerUnit * quantity;

  function buildEconomics(
    calculation: CraftCalculation | null,
    useFocus: boolean,
  ): BlackMarketCraftingEconomics {
    return calculateBlackMarketCraftingEconomics({
      isComplete: calculation?.isComplete ?? false,
      quantity,
      netMaterialCost: calculation?.totalMaterialCost ?? 0,
      recoveredMaterialValue: calculation?.totalSilverSavedByReturnRate ?? 0,
      stationFees: calculation?.totalStationFees ?? 0,
      effectiveCraftCost: calculation?.grandTotal ?? 0,
      blackMarketBuyUnitPrice: opportunity.blackMarketBuyUnitPrice,
      salesTaxRate: filters.salesTaxPercent / 100,
      targetQuality: opportunity.blackMarketQuality,
      qualityIncreasePercent: specializationConfig.qualityIncrease,
      qualityPriceSchedule,
      materialTransportCostTotal,
      finishedTransportCostTotal,
      escortCostTotal,
      deathProbabilityRate: deathProbabilityPercent / 100,
      timeCostTotal,
      focusRequired:
        useFocus && calculation
          ? calculation.focusCostBreakdown.totalFocusRequired
          : 0,
      focusValuePerPoint,
      buyFinishedProfitPerUnit: opportunity.profit,
    });
  }

  const withoutFocusEconomics = buildEconomics(
    withoutFocusCalculation,
    false,
  );
  const withFocusEconomics = buildEconomics(withFocusCalculation, true);
  const focusValuation = calculateBlackMarketFocusValuation(
    withoutFocusEconomics,
    withFocusEconomics,
  );
  const selectedCalculation = productionConfig.useFocus
    ? withFocusCalculation
    : withoutFocusCalculation;
  const selectedEconomics = productionConfig.useFocus
    ? withFocusEconomics
    : withoutFocusEconomics;
  const strategyRecommendation = recommendBlackMarketStrategy(
    opportunity.profit,
    opportunity.returnOnCostPercent,
    quantity,
    withoutFocusEconomics,
    withFocusEconomics,
  );
  const craftsNeeded = selectedRecipeOption
    ? quantity / selectedRecipeOption.outputQuantity
    : 0;

  function updateQuantity(rawValue: string) {
    const next = Number(rawValue);
    if (!Number.isFinite(next)) return;
    setQuantity(Math.max(1, Math.floor(next)));
    setStationUsageFeeOverride(null);
  }

  function openInCraftingCalculator() {
    if (!item) return;
    preloadBlackMarketCraftingWorkspace({
      item,
      enchantment,
      quantity,
      recipeOptionIndex,
      productionConfig,
      stationFeeConfig,
      craftingSpecializationConfig: specializationConfig,
      itemValueOverride,
      stationUsageFeeOverride,
      isPremium,
      materialCities: new Map(market.resolvedMaterialPurchaseCities),
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
              {strategyRecommendation.label}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {strategyRecommendation.kind === "buy-finished"
                ? "La compra terminada supera las variantes de fabricación después de valorar foco, calidad y riesgo."
                : `Ventaja ajustada frente a comprar terminado: ${formatSignedSilver(
                    strategyRecommendation.advantageOverBuying / quantity,
                  )} plata por unidad.`}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-text-faint">Beneficio ajustado del lote</p>
            <p
              className={`text-xl font-semibold tabular ${
                strategyRecommendation.profit >= 0
                  ? "text-positive"
                  : "text-negative"
              }`}
            >
              {formatSignedSilver(strategyRecommendation.profit)} plata
            </p>
          </div>
        </div>
      </section>

      <div
        className="grid grid-cols-2 rounded-xl border border-border bg-surface-raised p-1"
        role="tablist"
        aria-label="Estrategias del Black Market"
      >
        {(
          [
            ["buy", "Comprar y transportar"],
            ["craft", "Fabricar con RRR"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "buy" ? (
        buyContent
      ) : !canCraft || !item || !tier || !selectedCalculation ? (
        <section className="rounded-xl border border-warning/35 bg-warning-muted p-5">
          <h3 className="text-base font-semibold text-warning">
            Estrategia de fabricación no disponible
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Este objeto no posee una receta válida para el encantamiento
            analizado. Solo puede evaluarse como compra y transporte.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric
              label="Sin foco ajustado"
              value={
                withoutFocusEconomics.adjustedProfitPerUnit === null
                  ? "Datos incompletos"
                  : `${formatSignedSilver(
                      withoutFocusEconomics.adjustedProfitPerUnit,
                    )} plata/u`
              }
              tone={
                withoutFocusEconomics.adjustedProfitPerUnit === null
                  ? "warning"
                  : "default"
              }
            />
            <Metric
              label="Con foco ajustado"
              value={
                withFocusEconomics.adjustedProfitPerUnit === null
                  ? "Datos incompletos"
                  : `${formatSignedSilver(
                      withFocusEconomics.adjustedProfitPerUnit,
                    )} plata/u`
              }
              tone={
                withFocusEconomics.adjustedProfitPerUnit === null
                  ? "warning"
                  : "positive"
              }
            />
            <Metric
              label="Plata por foco"
              value={
                focusValuation.silverPerFocus === null
                  ? "No disponible"
                  : formatDecimal(focusValuation.silverPerFocus)
              }
              tone={
                focusValuation.clearsConfiguredValue === false
                  ? "warning"
                  : "positive"
              }
            />
            <Metric
              label="Prob. calidad objetivo"
              value={formatRate(selectedEconomics.qualitySuccessProbability)}
              tone={
                selectedEconomics.qualitySuccessProbability < 0.5
                  ? "warning"
                  : "default"
              }
            />
            <Metric
              label="ROI ajustado"
              value={
                selectedEconomics.adjustedReturnOnCostPercent === null
                  ? "Incompleto"
                  : formatBlackMarketPercent(
                      selectedEconomics.adjustedReturnOnCostPercent,
                    )
              }
              tone={
                selectedEconomics.adjustedReturnOnCostPercent === null
                  ? "warning"
                  : "positive"
              }
            />
            <Metric
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text">
                Supuestos económicos del lote
              </h3>
              <InfoHint
                label="Beneficio ajustado"
                text="El beneficio contable descuenta fabricación y logística directa. El beneficio ajustado descuenta además costo de oportunidad del foco, pérdida esperada por muerte y valor del tiempo."
                align="left"
                openOnHover
                width={330}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Cantidad a fabricar
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(event) => updateQuantity(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Valor mínimo del foco
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={focusValuePerPoint}
                  onChange={(event) =>
                    setFocusValuePerPoint(nonNegative(event.target.value))
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Recuperación calidad inferior (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={lowerQualityFallbackPercent}
                  onChange={(event) =>
                    setLowerQualityFallbackPercent(
                      Math.min(100, nonNegative(event.target.value)),
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Materiales → fabricación
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={materialTransportCostTotal}
                  onChange={(event) =>
                    setMaterialTransportCostTotal(
                      Math.floor(nonNegative(event.target.value)),
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Fabricación → Caerleon por unidad
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={finishedTransportCostPerUnit}
                  onChange={(event) =>
                    setFinishedTransportCostPerUnit(
                      Math.floor(nonNegative(event.target.value)),
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Escolta y protección
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={escortCostTotal}
                  onChange={(event) =>
                    setEscortCostTotal(
                      Math.floor(nonNegative(event.target.value)),
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Probabilidad de muerte (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={deathProbabilityPercent}
                  onChange={(event) =>
                    setDeathProbabilityPercent(
                      Math.min(100, nonNegative(event.target.value)),
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
              <label>
                <span className="text-xs font-medium text-text-muted">
                  Costo del tiempo
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={timeCostTotal}
                  onChange={(event) =>
                    setTimeCostTotal(Math.floor(nonNegative(event.target.value)))
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>
            </div>
          </section>

          <ProductionConfigCard
            config={productionConfig}
            recommendation={cityRecommendation}
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

          <BlackMarketCraftingMaterialsCard
            item={item}
            calculation={selectedCalculation}
            craftsNeeded={craftsNeeded}
            tier={tier}
            recipeOptionCount={recipeOptions.length}
            recipeOptionIndex={recipeOptionIndex}
            repository={repository}
            config={market.config}
            markets={market.markets}
            status={market.status}
            materialCityOverrideCount={market.materialCityOverrideCount}
            automaticPrices={market.automaticPurchasePrices}
            automaticPriceDetails={market.automaticPurchasePriceDetails}
            priceComparisons={market.materialMarketPriceComparisons}
            cityOverrides={market.materialPurchaseCityOverrides}
            resolvedCities={market.resolvedMaterialPurchaseCities}
            onConfigChange={market.setConfig}
            onClearCities={market.clearMaterialPurchaseCities}
            onRecipeOptionChange={(index) => {
              setRecipeOptionIndex(index);
              setStationUsageFeeOverride(null);
            }}
            onCityChange={market.setMaterialPurchaseCity}
            onRefresh={market.refresh}
          />

          <CalculationReadinessBanner
            missingPrices={selectedCalculation.missingPriceItems}
            repository={repository}
          />

          <BlackMarketCraftingEconomicsCards
            economics={selectedEconomics}
            focusValuation={focusValuation}
            opportunity={opportunity}
            quantity={quantity}
          />

          <ReturnedMaterialsCard
            materials={selectedCalculation.returnedMaterials}
            repository={repository}
            rootNode={selectedCalculation.root}
          />

          <div className="space-y-2 rounded-xl border border-warning/30 bg-warning-muted p-4 text-xs leading-relaxed text-text-muted">
            <p>
              La orden exige calidad{" "}
              {BLACK_MARKET_QUALITY_LABELS[opportunity.blackMarketQuality]}. La
              estimación pondera la probabilidad de alcanzar esa calidad y usa
              órdenes inferiores observadas en esta página; si faltan, aplica el
              porcentaje conservador configurado.
            </p>
            <p>
              “Increase in Quality” se interpreta como porcentaje de tiradas
              adicionales y solo cuenta la mejor. El foco se valora por su costo
              de oportunidad, pero no añade una tirada de calidad.
            </p>
            <p>
              Artefactos y componentes especiales se valoran como costo, pero el
              motor los excluye del retorno de recursos.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-accent-border/40 bg-accent-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">
                Continuar en la calculadora completa
              </h3>
              <p className="mt-1 text-xs text-text-muted">
                Se precargarán encantamiento, cantidad, ciudad, foco, Premium,
                tarifas, especialización, receta y ciudades de materiales.
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
