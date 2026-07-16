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
import type { AlbionServer, BlackMarketOpportunity } from "../types";
import {
  calculateBlackMarketCraftingEconomics,
  recommendBlackMarketStrategy,
  type BlackMarketCraftingEconomics,
} from "../utils/blackMarketCraftingComparison";
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
  readonly repository: ItemRepository;
  readonly buyContent: ReactNode;
  readonly onOpenCrafting: (item: Item) => void;
}

type StrategyTab = "buy" | "craft";
type TransportMode = "per-unit" | "batch";

const EMPTY_PRICES: ReadonlyMap<string, number> = new Map();
const ROOT_EXPANDED: ReadonlySet<string> = new Set(["root"]);
const MARKET_SERVER_BY_BLACK_MARKET: Record<AlbionServer, MarketAlbionServer> =
  {
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

function buildEconomics(
  calculation: CraftCalculation | null,
  opportunity: BlackMarketOpportunity,
  quantity: number,
  transportCostTotal: number,
): BlackMarketCraftingEconomics {
  return calculateBlackMarketCraftingEconomics({
    isComplete: calculation?.isComplete ?? false,
    quantity,
    netMaterialCost: calculation?.totalMaterialCost ?? 0,
    recoveredMaterialValue: calculation?.totalSilverSavedByReturnRate ?? 0,
    stationFees: calculation?.totalStationFees ?? 0,
    effectiveCraftCost: calculation?.grandTotal ?? 0,
    blackMarketBuyUnitPrice: opportunity.blackMarketBuyUnitPrice,
    estimatedSalesTaxPerUnit: opportunity.estimatedSalesTax,
    transportCostTotal,
    buyFinishedProfitPerUnit: opportunity.profit,
  });
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
  const [initialStore] = useState(() => useCraftTreeStore.getState());
  const cityRecommendation = useMemo(
    () => (item ? getProductionCityRecommendation(item) : null),
    [item],
  );
  const [activeTab, setActiveTab] = useState<StrategyTab>("buy");
  const [quantity, setQuantity] = useState(1);
  const [transportMode, setTransportMode] = useState<TransportMode>("per-unit");
  const [transportValue, setTransportValue] = useState(
    opportunity.transportCostPerUnit,
  );
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
  const [itemValueOverride, setItemValueOverride] = useState<number | null>(
    null,
  );
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

  const transportCostTotal =
    transportMode === "per-unit" ? transportValue * quantity : transportValue;
  const withoutFocusEconomics = buildEconomics(
    withoutFocusCalculation,
    opportunity,
    quantity,
    transportCostTotal,
  );
  const withFocusEconomics = buildEconomics(
    withFocusCalculation,
    opportunity,
    quantity,
    transportCostTotal,
  );
  const selectedCalculation = productionConfig.useFocus
    ? withFocusCalculation
    : withoutFocusCalculation;
  const selectedEconomics = productionConfig.useFocus
    ? withFocusEconomics
    : withoutFocusEconomics;
  const strategyRecommendation = recommendBlackMarketStrategy(
    opportunity.profit,
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

  function updateTransport(rawValue: string) {
    const next = Number(rawValue);
    if (!Number.isFinite(next)) return;
    setTransportValue(Math.max(0, next));
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
                ? "La compra terminada supera las variantes de fabricación con datos completos."
                : `Ventaja frente a comprar terminado: ${formatSignedSilver(
                    strategyRecommendation.advantageOverBuying / quantity,
                  )} plata por unidad.`}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-text-faint">Beneficio del lote</p>
            <p className="text-xl font-semibold tabular text-positive">
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
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              label="Fabricar sin foco"
              value={
                withoutFocusEconomics.profitPerUnit === null
                  ? "Datos incompletos"
                  : `${formatSignedSilver(withoutFocusEconomics.profitPerUnit)} plata/u`
              }
              tone={
                withoutFocusEconomics.profitPerUnit === null
                  ? "warning"
                  : "default"
              }
            />
            <Metric
              label="Fabricar con foco"
              value={
                withFocusEconomics.profitPerUnit === null
                  ? "Datos incompletos"
                  : `${formatSignedSilver(withFocusEconomics.profitPerUnit)} plata/u`
              }
              tone={
                withFocusEconomics.profitPerUnit === null
                  ? "warning"
                  : "positive"
              }
            />
            <Metric
              label="RRR seleccionado"
              value={formatRate(
                selectedCalculation.root.returnRate?.returnRate ?? null,
              )}
            />
            <Metric
              label="ROI seleccionado"
              value={
                selectedEconomics.returnOnCostPercent === null
                  ? "Incompleto"
                  : formatBlackMarketPercent(
                      selectedEconomics.returnOnCostPercent,
                    )
              }
              tone={
                selectedEconomics.returnOnCostPercent === null
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
                  onChange={(event) => updateQuantity(event.target.value)}
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
                    text="El costo puede expresarse por unidad o como total del lote. La estrategia de compra conserva el transporte del escáner."
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
                    onChange={(event) => updateTransport(event.target.value)}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  />
                </div>
              </div>
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
              calidad final del crafteo no está garantizada; confirma que el
              lote producido puede cubrirla.
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
