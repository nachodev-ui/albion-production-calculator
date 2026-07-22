import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  DEFAULT_HIDEOUT_POWER_LEVEL,
  getHideoutPowerProfile,
  type NodeReturnRateConfig,
} from "@core/domain/entities";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import {
  buildItemIconUrl,
  isVanityPlaceholder,
  type Item,
} from "@core/domain/entities/Item";
import {
  getRecipeOptions,
  getRecipeTier,
} from "@core/domain/entities/Recipe";
import type { CraftingSpecializationConfig } from "@core/domain/entities/ProductionEconomy";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import {
  calculateCraftCost,
  type CraftTreeConfig,
} from "@core/usecases/calculateCraftCost";
import { useAccountEntitlement } from "@features/account/hooks/useAccountEntitlement";
import { useAccountSession } from "@features/account/hooks/useAccountSession";
import { ENTITLEMENT_KEYS } from "@features/account/types";
import { useCraftTreeStore } from "@features/craft-calculator/store/craftTreeStore";
import {
  applyRecommendedProductionCity,
  getProductionCityRecommendation,
} from "@features/craft-calculator/utils/productionRecommendation";
import { useCurrentMarketPrices } from "@features/market-data/hooks/useCurrentMarketPrices";
import {
  buildItemPriceKey,
  buildMarketItemIdentifier,
  getMarketName,
  type AlbionServer as MarketAlbionServer,
  type MarketPriceTarget,
} from "@features/market-data/types/MarketPrice";
import { scanBlackMarketOpportunities } from "../api/blackMarketOpportunitiesApi";
import { DEFAULT_BLACK_MARKET_SCANNER_FILTERS } from "../storage/blackMarketScannerStorage";
import type {
  AlbionServer,
  BlackMarketCategory,
  BlackMarketOpportunitiesResponse,
  BlackMarketOpportunity,
} from "../types";
import {
  buildBatchOpportunityConfidence,
  buildSuggestedManufacturingOrder,
  consolidateBatchMaterials,
  groupBatchMaterialsByCity,
  resolveBatchPlannerLine,
  type BatchPlannerResolvedLine,
  type BatchPlannerSelection,
  type CheapestMaterialPrice,
} from "../utils/blackMarketBatchPlanner";
import {
  calculateBlackMarketCraftingEconomics,
  recommendBlackMarketStrategy,
} from "../utils/blackMarketCraftingComparison";
import { buildBlackMarketQualityPriceSchedule } from "../utils/blackMarketQuality";

const ROOT_EXPANDED: ReadonlySet<string> = new Set(["root"]);
const EMPTY_PRICES: ReadonlyMap<string, number> = new Map();
const MAX_BATCH_ITEMS = 25;
const SUPPORTED_CATEGORIES = new Set<Item["category"]>([
  "weapon",
  "armor",
  "offhand",
  "accessory",
]);
const MARKET_SERVER_BY_BLACK_MARKET: Record<AlbionServer, MarketAlbionServer> = {
  west: "americas",
  east: "asia",
  europe: "europe",
};
const SERVER_LABELS: Record<AlbionServer, string> = {
  west: "Americas",
  east: "Asia",
  europe: "Europe",
};
const CONFIDENCE_LABELS = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
} as const;
const CONFIDENCE_CLASSES = {
  high: "border-positive/30 bg-positive-muted text-positive",
  medium: "border-warning/30 bg-warning-muted text-warning",
  low: "border-negative/30 bg-negative-muted text-negative",
} as const;

interface PreparedSelection {
  readonly selection: BatchPlannerSelection;
  readonly item: Item;
  readonly recipeOptionIndex: number;
  readonly materialTargets: readonly MarketPriceTarget[];
}

interface BatchResultRow {
  readonly selection: BatchPlannerSelection;
  readonly item: Item;
  readonly line: BatchPlannerResolvedLine | null;
  readonly message: string | null;
}

function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100_000, Math.max(1, Math.floor(value)));
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits }).format(value);
}

function formatSilver(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${formatNumber(Math.round(value))} plata`;
}

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, 2)}%`;
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

function supportedBlackMarketCategory(
  category: Item["category"],
): BlackMarketCategory | null {
  return SUPPORTED_CATEGORIES.has(category)
    ? (category as BlackMarketCategory)
    : null;
}

function eligibleItem(item: Item): boolean {
  return (
    Boolean(item.recipe) &&
    !isVanityPlaceholder(item) &&
    supportedBlackMarketCategory(item.category) !== null &&
    (item.recipe?.tiers.some((tier) =>
      getRecipeOptions(tier).some((option) => option.ingredients.length > 0),
    ) ?? false)
  );
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

function selectionKey(selection: BatchPlannerSelection): string {
  return `${buildMarketItemIdentifier(selection.itemId, selection.enchantment)}:q${selection.quality}`;
}

function opportunityForSelection(
  response: BlackMarketOpportunitiesResponse,
  selection: BatchPlannerSelection,
): BlackMarketOpportunity | null {
  const identifier = buildMarketItemIdentifier(
    selection.itemId,
    selection.enchantment,
  );
  return (
    response.data
      .filter(
        (opportunity) =>
          opportunity.itemIdentifier === identifier &&
          opportunity.purchaseQuality === selection.quality,
      )
      .sort(
        (left, right) =>
          right.profit - left.profit ||
          right.blackMarketBuyUnitPrice - left.blackMarketBuyUnitPrice,
      )[0] ?? null
  );
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function triggerCsvDownload(filename: string, rows: readonly (readonly (string | number)[])[]): void {
  const content = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BlackMarketBatchPlannerPage({
  repository,
}: {
  readonly repository: ItemRepository;
}) {
  const session = useAccountSession();
  const csvEntitlement = useAccountEntitlement(ENTITLEMENT_KEYS.exportsCsv);
  const [initialStore] = useState(() => useCraftTreeStore.getState());
  const [query, setQuery] = useState("");
  const [selections, setSelections] = useState<readonly BatchPlannerSelection[]>([]);
  const [server, setServer] = useState<AlbionServer>("west");
  const [salesTaxPercent, setSalesTaxPercent] = useState(4);
  const [response, setResponse] =
    useState<BlackMarketOpportunitiesResponse | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const searchResults = useMemo(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return [];
    const selectedIds = new Set(selections.map((selection) => selection.itemId));
    return repository
      .searchByName(normalized)
      .filter((item) => eligibleItem(item) && !selectedIds.has(item.id))
      .slice(0, 8);
  }, [query, repository, selections]);

  const preparedSelections = useMemo<readonly PreparedSelection[]>(() => {
    const prepared: PreparedSelection[] = [];
    for (const selection of selections) {
      const item = repository.getById(selection.itemId);
      const tier = item?.recipe
        ? getRecipeTier(item.recipe, selection.enchantment)
        : null;
      const recipeOptions = tier ? getRecipeOptions(tier) : [];
      const recipeOptionIndex = recipeOptions.findIndex(
        (option) => option.ingredients.length > 0,
      );
      if (!item || !tier || recipeOptionIndex < 0) continue;
      prepared.push({
        selection,
        item,
        recipeOptionIndex,
        materialTargets: recipeOptions[recipeOptionIndex]!.ingredients.map(
          (ingredient) => ({
            itemId: ingredient.itemId,
            enchantment: ingredient.enchantment,
          }),
        ),
      });
    }
    return prepared;
  }, [repository, selections]);

  const materialTargets = useMemo(
    () => dedupeTargets(preparedSelections.flatMap((entry) => entry.materialTargets)),
    [preparedSelections],
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
  const marketRootKey = useMemo(
    () =>
      `black-market-batch:${selections
        .map(selectionKey)
        .sort()
        .join("|") || "empty"}`,
    [selections],
  );
  const market = useCurrentMarketPrices({
    rootKey: marketRootKey,
    materialTargets,
    saleTarget: null,
    targetLabels,
  });
  const setMarketConfig = market.setConfig;

  useEffect(() => {
    setMarketConfig({ server: MARKET_SERVER_BY_BLACK_MARKET[server] });
  }, [server, setMarketConfig]);

  const cheapestPrices = useMemo(() => {
    const allowedCities = new Set(
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.purchaseMarketKeys,
    );
    const prices = new Map<string, CheapestMaterialPrice>();
    for (const target of materialTargets) {
      const key = buildItemPriceKey(target.itemId, target.enchantment);
      const best = (market.materialMarketPriceComparisons.get(key) ?? [])
        .filter(
          (option) =>
            allowedCities.has(option.city) &&
            option.value !== null &&
            option.value > 0,
        )
        .sort((left, right) => (left.value ?? Infinity) - (right.value ?? Infinity))[0];
      if (best?.value !== null && best?.value !== undefined) {
        prices.set(key, { city: best.city, unitPrice: best.value });
      }
    }
    return prices;
  }, [market.materialMarketPriceComparisons, materialTargets]);

  const automaticPrices = useMemo(
    () =>
      new Map(
        Array.from(cheapestPrices.entries()).map(([key, price]) => [
          key,
          price.unitPrice,
        ]),
      ),
    [cheapestPrices],
  );

  const resultRows = useMemo<readonly BatchResultRow[]>(() => {
    if (!response) return [];
    return preparedSelections.map((entry) => {
      const opportunity = opportunityForSelection(response, entry.selection);
      if (!opportunity) {
        return {
          selection: entry.selection,
          item: entry.item,
          line: null,
          message:
            "No se encontró una orden compatible y fresca del Black Market para esta calidad.",
        };
      }

      const productionConfig = applyRecommendedProductionCity(
        initialStore.productionConfig,
        getProductionCityRecommendation(entry.item),
        "crafting",
      );
      const buildConfig = (useFocus: boolean): CraftTreeConfig => ({
        expandedPaths: ROOT_EXPANDED,
        manualPrices: EMPTY_PRICES,
        automaticPrices,
        productionConfig: { ...productionConfig, useFocus },
        selectedRecipeOptions: new Map([["root", entry.recipeOptionIndex]]),
        stationFeeConfig: initialStore.stationFeeConfig,
        craftingSpecializationConfig: effectiveSpecialization(
          productionConfig,
          initialStore.craftingSpecializationConfig,
        ),
        itemValueOverride: null,
        stationUsageFeeOverride: null,
      });
      const withoutFocusCalculation = calculateCraftCost(
        entry.item.id,
        entry.selection.enchantment,
        entry.selection.quantity,
        repository,
        buildConfig(false),
      );
      const withFocusCalculation = calculateCraftCost(
        entry.item.id,
        entry.selection.enchantment,
        entry.selection.quantity,
        repository,
        buildConfig(true),
      );
      const qualitySchedule = buildBlackMarketQualityPriceSchedule({
        targetQuality: opportunity.blackMarketQuality,
        targetUnitPrice: opportunity.blackMarketBuyUnitPrice,
        availableOrders: response.data
          .filter(
            (candidate) =>
              candidate.itemIdentifier === opportunity.itemIdentifier,
          )
          .map((candidate) => ({
            minimumQuality: Math.min(
              5,
              Math.max(1, candidate.blackMarketQuality),
            ) as 1 | 2 | 3 | 4 | 5,
            unitPrice: candidate.blackMarketBuyUnitPrice,
          })),
        lowerQualityFallbackPercent: 0,
      });
      const buildEconomics = (
        calculation: typeof withoutFocusCalculation,
        useFocus: boolean,
      ) =>
        calculateBlackMarketCraftingEconomics({
          isComplete: calculation.isComplete,
          quantity: entry.selection.quantity,
          netMaterialCost: calculation.totalMaterialCost,
          recoveredMaterialValue: calculation.totalSilverSavedByReturnRate,
          stationFees: calculation.totalStationFees,
          effectiveCraftCost: calculation.grandTotal,
          blackMarketBuyUnitPrice: opportunity.blackMarketBuyUnitPrice,
          salesTaxRate: salesTaxPercent / 100,
          targetQuality: opportunity.blackMarketQuality,
          qualityIncreasePercent:
            initialStore.craftingSpecializationConfig.qualityIncrease,
          qualityPriceSchedule: qualitySchedule,
          materialTransportCostTotal: 0,
          finishedTransportCostTotal: 0,
          escortCostTotal: 0,
          deathProbabilityRate: 0,
          timeCostTotal: 0,
          focusRequired: useFocus
            ? calculation.focusCostBreakdown.totalFocusRequired
            : 0,
          focusValuePerPoint: 0,
          buyFinishedProfitPerUnit: opportunity.profit,
        });
      const withoutFocus = buildEconomics(withoutFocusCalculation, false);
      const withFocus = buildEconomics(withFocusCalculation, true);
      const recommendation = recommendBlackMarketStrategy(
        opportunity.profit,
        opportunity.returnOnCostPercent,
        entry.selection.quantity,
        withoutFocus,
        withFocus,
      );
      return {
        selection: entry.selection,
        item: entry.item,
        line: resolveBatchPlannerLine({
          selection: entry.selection,
          opportunity,
          recommendation,
          withoutFocus,
          withFocus,
          withoutFocusCalculation,
          withFocusCalculation,
        }),
        message:
          withoutFocusCalculation.isComplete || withFocusCalculation.isComplete
            ? null
            : "Faltan precios de uno o más materiales para comparar fabricación.",
      };
    });
  }, [
    automaticPrices,
    initialStore,
    preparedSelections,
    repository,
    response,
    salesTaxPercent,
  ]);

  const resolvedLines = useMemo(
    () => resultRows.flatMap((row) => (row.line ? [row.line] : [])),
    [resultRows],
  );
  const materials = useMemo(
    () => consolidateBatchMaterials(resolvedLines, repository, cheapestPrices),
    [cheapestPrices, repository, resolvedLines],
  );
  const shoppingGroups = useMemo(
    () => groupBatchMaterialsByCity(materials),
    [materials],
  );
  const manufacturingOrder = useMemo(
    () =>
      buildSuggestedManufacturingOrder(
        resolvedLines
          .filter((line) => line.strategy !== "buy-finished")
          .map((line) => line.selection),
        repository,
      ),
    [repository, resolvedLines],
  );
  const totals = useMemo(
    () => ({
      profit: resolvedLines.reduce((sum, line) => sum + line.profit, 0),
      capital: resolvedLines.reduce(
        (sum, line) => sum + line.capitalRequired,
        0,
      ),
      grossMaterials: materials.reduce(
        (sum, material) => sum + material.grossQuantity,
        0,
      ),
      recoveredMaterials: materials.reduce(
        (sum, material) => sum + material.recoveredQuantity,
        0,
      ),
      effectiveMaterials: materials.reduce(
        (sum, material) => sum + material.effectiveQuantity,
        0,
      ),
      estimatedWeight: materials.reduce(
        (sum, material) => sum + material.estimatedWeight,
        0,
      ),
    }),
    [materials, resolvedLines],
  );

  function addItem(item: Item) {
    if (selections.length >= MAX_BATCH_ITEMS) return;
    const firstTier = item.recipe?.tiers.find((tier) =>
      getRecipeOptions(tier).some((option) => option.ingredients.length > 0),
    );
    if (!firstTier) return;
    setSelections((current) => [
      ...current,
      {
        itemId: item.id,
        enchantment: firstTier.enchantment,
        quality: 1,
        quantity: 1,
      },
    ]);
    setQuery("");
    setResponse(null);
  }

  function updateSelection(
    itemId: BatchPlannerSelection["itemId"],
    patch: Partial<BatchPlannerSelection>,
  ) {
    setSelections((current) =>
      current.map((selection) =>
        selection.itemId === itemId
          ? {
              ...selection,
              ...patch,
              quantity:
                patch.quantity === undefined
                  ? selection.quantity
                  : normalizeQuantity(patch.quantity),
            }
          : selection,
      ),
    );
    setResponse(null);
  }

  function removeSelection(itemId: BatchPlannerSelection["itemId"]) {
    setSelections((current) =>
      current.filter((selection) => selection.itemId !== itemId),
    );
    setResponse(null);
  }

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selections.length === 0) return;
    if (!session.isAuthenticated) {
      await session.login();
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus("loading");
    setError(null);

    try {
      const token = await session.getAccessToken();
      if (!token) throw new Error("No fue posible obtener una sesión autenticada.");
      const selectedItems = preparedSelections.map((entry) => entry.item);
      const tiers = [...new Set(selectedItems.map((item) => item.tier))];
      const enchantments = [
        ...new Set(preparedSelections.map((entry) => entry.selection.enchantment)),
      ];
      const qualities = [
        ...new Set(preparedSelections.map((entry) => entry.selection.quality)),
      ];
      const categories = [
        ...new Set(
          selectedItems.flatMap((item) => {
            const category = supportedBlackMarketCategory(item.category);
            return category ? [category] : [];
          }),
        ),
      ];
      const result = await scanBlackMarketOpportunities(
        {
          server,
          purchaseMarketKeys:
            DEFAULT_BLACK_MARKET_SCANNER_FILTERS.purchaseMarketKeys,
          tiers,
          enchantments,
          qualities,
          categories,
          minimumProfit: 0,
          minimumReturnOnCostPercent: 0,
          maximumCityAgeMinutes: 10_080,
          maximumBlackMarketAgeMinutes: 10_080,
          salesTaxRate: salesTaxPercent / 100,
          transportCostPerUnit: 0,
          sort: "profit",
          limit: 500,
          offset: 0,
        },
        token,
        controller.signal,
      );
      if (activeRequest.current !== controller) return;
      setResponse(result);
      setStatus("success");
    } catch (calculationError: unknown) {
      if (controller.signal.aborted) return;
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : "No fue posible calcular el lote.",
      );
      setStatus("error");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Planificador batch del Black Market"],
      ["Servidor", SERVER_LABELS[server]],
      ["Generado", new Date().toISOString()],
      [],
      ["Objeto", "Cantidad", "Estrategia", "Beneficio", "ROI", "Capital", "Confianza"],
      ...resultRows.map((row) => [
        `${row.item.name}${row.selection.enchantment > 0 ? ` .${row.selection.enchantment}` : ""}`,
        row.selection.quantity,
        row.line?.strategyLabel ?? "Sin resultado",
        row.line?.profit ?? "",
        row.line?.returnOnCostPercent ?? "",
        row.line?.capitalRequired ?? "",
        row.line ? CONFIDENCE_LABELS[row.line.confidence] : "",
      ]),
      [],
      ["Resumen"],
      ["Beneficio total", totals.profit],
      ["Capital total requerido", totals.capital],
      ["Materiales brutos", totals.grossMaterials],
      ["Materiales recuperados", totals.recoveredMaterials],
      ["Cantidad efectiva consumida", totals.effectiveMaterials],
      ["Peso total estimado", totals.estimatedWeight],
      [],
      ["Material", "Bruto", "Recuperado", "Efectivo", "Ciudad", "Precio unitario", "Peso estimado"],
      ...materials.map((material) => [
        `${material.name}${material.enchantment > 0 ? ` .${material.enchantment}` : ""}`,
        material.grossQuantity,
        material.recoveredQuantity,
        material.effectiveQuantity,
        material.city
          ? getMarketName(market.markets, material.city)
          : "Sin cobertura",
        material.unitPrice ?? "",
        material.estimatedWeight,
      ]),
      [],
      ["Orden de fabricación", "Objeto", "Cantidad"],
      ...manufacturingOrder.map((step, index) => [
        index + 1,
        `${step.name}${step.enchantment > 0 ? ` .${step.enchantment}` : ""}`,
        step.quantity,
      ]),
    ];
    triggerCsvDownload(
      `albion-batch-plan-${new Date().toISOString().slice(0, 10)}.csv`,
      rows,
    );
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 pb-14 pt-1 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <span className="inline-flex rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
              Herramienta Pro
            </span>
            <h2 className="mt-3 font-display text-2xl text-text">
              Planificador batch y lista de compra
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
              Prepara varios objetos en un solo lote. El sistema consulta precios e
              historial mediante los flujos batch existentes, compara comprar o
              fabricar y consolida la compra por ciudad.
            </p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted lg:max-w-sm">
            El peso es una estimación para planificación. Confirma precios, carga y
            órdenes dentro del juego antes de ejecutar el lote.
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={(event) => void calculate(event)}>
          <div className="grid gap-4 lg:grid-cols-[1fr_12rem_12rem]">
            <label className="relative block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">
                Añadir objetos
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca espada, bolsa, casco…"
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-faint focus:border-accent-border"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border bg-surface p-2 shadow-2xl">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-raised"
                    >
                      <img
                        src={buildItemIconUrl(item.id, 0 as EnchantmentLevel, 48)}
                        alt=""
                        className="h-10 w-10 object-contain"
                      />
                      <span>
                        <span className="block text-sm font-medium text-text">
                          {item.name}
                        </span>
                        <span className="text-xs text-text-faint">
                          Tier {item.tier}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">
                Servidor
              </span>
              <select
                value={server}
                onChange={(event) => {
                  setServer(event.target.value as AlbionServer);
                  setResponse(null);
                }}
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text outline-none focus:border-accent-border"
              >
                <option value="west">Americas</option>
                <option value="europe">Europe</option>
                <option value="east">Asia</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-faint">
                Impuesto BM
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  value={salesTaxPercent}
                  onChange={(event) => {
                    setSalesTaxPercent(
                      Math.min(99.99, Math.max(0, Number(event.target.value) || 0)),
                    );
                    setResponse(null);
                  }}
                  className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 pr-9 text-sm text-text outline-none focus:border-accent-border"
                />
                <span className="pointer-events-none absolute right-3 top-3 text-sm text-text-faint">
                  %
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            {selections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-text-muted">
                Añade al menos un objeto para comenzar el plan.
              </div>
            ) : (
              selections.map((selection) => {
                const item = repository.getById(selection.itemId);
                if (!item) return null;
                const availableEnchantments =
                  item.recipe?.tiers
                    .filter((tier) =>
                      getRecipeOptions(tier).some(
                        (option) => option.ingredients.length > 0,
                      ),
                    )
                    .map((tier) => tier.enchantment) ?? [];
                return (
                  <div
                    key={String(selection.itemId)}
                    className="grid gap-3 rounded-xl border border-border bg-surface-raised p-3 md:grid-cols-[minmax(0,1fr)_8rem_8rem_9rem_auto] md:items-end"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={buildItemIconUrl(
                          item.id,
                          selection.enchantment,
                          64,
                        )}
                        alt=""
                        className="h-12 w-12 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">
                          {item.name}
                        </p>
                        <p className="text-xs text-text-faint">Tier {item.tier}</p>
                      </div>
                    </div>
                    <label>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-faint">
                        Cantidad
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={selection.quantity}
                        onChange={(event) =>
                          updateSelection(selection.itemId, {
                            quantity: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent-border"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-faint">
                        Encant.
                      </span>
                      <select
                        value={selection.enchantment}
                        onChange={(event) =>
                          updateSelection(selection.itemId, {
                            enchantment: Number(event.target.value) as EnchantmentLevel,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent-border"
                      >
                        {availableEnchantments.map((enchantment) => (
                          <option key={enchantment} value={enchantment}>
                            .{enchantment}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-faint">
                        Calidad
                      </span>
                      <select
                        value={selection.quality}
                        onChange={(event) =>
                          updateSelection(selection.itemId, {
                            quality: Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent-border"
                      >
                        <option value="1">Normal</option>
                        <option value="2">Buena</option>
                        <option value="3">Sobresaliente</option>
                        <option value="4">Excelente</option>
                        <option value="5">Obra maestra</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSelection(selection.itemId)}
                      className="rounded-lg border border-negative/30 px-3 py-2 text-xs font-semibold text-negative transition-colors hover:bg-negative-muted"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
              {error}
            </p>
          )}
          {market.error && (
            <p className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-sm text-text-muted">
              Precios de materiales: {market.error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-faint">
              {selections.length}/{MAX_BATCH_ITEMS} objetos · {materialTargets.length}{" "}
              materiales únicos · consulta de materiales {market.status}
            </p>
            <button
              type="submit"
              disabled={selections.length === 0 || status === "loading"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 sm:w-auto"
            >
              {status === "loading" && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/35 border-t-bg" />
              )}
              {status === "loading" ? "Calculando lote…" : "Calcular plan batch"}
            </button>
          </div>
        </form>
      </section>

      {response && (
        <div className="mt-5 space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Beneficio total", formatSilver(totals.profit)],
              ["Capital requerido", formatSilver(totals.capital)],
              ["Materiales brutos", formatNumber(totals.grossMaterials, 2)],
              ["Recuperados", formatNumber(totals.recoveredMaterials, 2)],
              ["Consumo efectivo", formatNumber(totals.effectiveMaterials, 2)],
              ["Peso estimado", `${formatNumber(totals.estimatedWeight, 2)} kg`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
                  {label}
                </p>
                <p className="mt-2 text-lg font-semibold text-text">{value}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl text-text">Resultado consolidado</h3>
                <p className="mt-1 text-xs text-text-muted">
                  La confianza usa la peor señal entre la compra de ciudad y la orden del Black Market.
                </p>
              </div>
              <button
                type="button"
                disabled={csvEntitlement !== true || resultRows.length === 0}
                onClick={exportCsv}
                className="rounded-xl border border-accent-border bg-accent-muted px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-45"
                title={
                  csvEntitlement === true
                    ? "Exportar reporte completo"
                    : "Tu acceso no incluye exportaciones CSV"
                }
              >
                Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-text-faint">
                  <tr>
                    <th className="px-5 py-3">Objeto</th>
                    <th className="px-5 py-3">Cantidad</th>
                    <th className="px-5 py-3">Beneficio</th>
                    <th className="px-5 py-3">ROI</th>
                    <th className="px-5 py-3">Capital</th>
                    <th className="px-5 py-3">Confianza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resultRows.map((row) => (
                    <tr key={selectionKey(row.selection)} className="align-top">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={buildItemIconUrl(
                              row.item.id,
                              row.selection.enchantment,
                              56,
                            )}
                            alt=""
                            className="h-10 w-10 object-contain"
                          />
                          <div>
                            <p className="font-semibold text-text">
                              {row.item.name}
                              {row.selection.enchantment > 0
                                ? ` .${row.selection.enchantment}`
                                : ""}
                            </p>
                            <p className="mt-1 text-xs text-text-faint">
                              {row.line?.strategyLabel ?? row.message}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-text-muted">
                        {formatNumber(row.selection.quantity)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-text">
                        {formatSilver(row.line?.profit ?? null)}
                      </td>
                      <td className="px-5 py-4 text-text-muted">
                        {formatPercent(row.line?.returnOnCostPercent ?? null)}
                      </td>
                      <td className="px-5 py-4 text-text-muted">
                        {formatSilver(row.line?.capitalRequired ?? null)}
                      </td>
                      <td className="px-5 py-4">
                        {row.line ? (
                          <span
                            title={row.line.confidenceReasons.join("\n")}
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${CONFIDENCE_CLASSES[row.line.confidence]}`}
                          >
                            {CONFIDENCE_LABELS[row.line.confidence]}
                          </span>
                        ) : (
                          <span className="text-text-faint">Sin cobertura</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h3 className="font-display text-xl text-text">Materiales consolidados</h3>
                <p className="mt-1 text-xs text-text-muted">
                  Cantidad requerida, retorno estimado y consumo efectivo de las estrategias fabricadas.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-text-faint">
                    <tr>
                      <th className="px-5 py-3">Material</th>
                      <th className="px-5 py-3">Bruto</th>
                      <th className="px-5 py-3">Recuperado</th>
                      <th className="px-5 py-3">Efectivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {materials.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                          Las estrategias recomendadas compran los objetos terminados o no poseen cobertura suficiente.
                        </td>
                      </tr>
                    ) : (
                      materials.map((material) => (
                        <tr key={material.key}>
                          <td className="px-5 py-3 font-medium text-text">
                            {material.name}
                            {material.enchantment > 0
                              ? ` .${material.enchantment}`
                              : ""}
                          </td>
                          <td className="px-5 py-3 text-text-muted">
                            {formatNumber(material.grossQuantity, 2)}
                          </td>
                          <td className="px-5 py-3 text-positive">
                            {formatNumber(material.recoveredQuantity, 2)}
                          </td>
                          <td className="px-5 py-3 font-semibold text-text">
                            {formatNumber(material.effectiveQuantity, 2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="font-display text-xl text-text">Lista de compra por ciudad</h3>
              <p className="mt-1 text-xs text-text-muted">
                Cada material se asigna al precio disponible más bajo entre las ciudades configuradas.
              </p>
              <div className="mt-5 space-y-4">
                {shoppingGroups.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                    No hay materiales efectivos para comprar.
                  </p>
                ) : (
                  shoppingGroups.map((group) => (
                    <div
                      key={group.city}
                      className="rounded-xl border border-border bg-surface-raised p-4"
                    >
                      <h4 className="font-semibold text-text">
                        {getMarketName(market.markets, group.city)}
                      </h4>
                      <ul className="mt-3 space-y-2 text-sm text-text-muted">
                        {group.materials.map((material) => (
                          <li key={material.key} className="flex justify-between gap-4">
                            <span>{material.name}</span>
                            <span className="font-semibold text-text">
                              {formatNumber(Math.ceil(material.effectiveQuantity), 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="font-display text-xl text-text">Orden de fabricación sugerido</h3>
            <p className="mt-1 text-xs text-text-muted">
              Las dependencias seleccionadas se colocan antes de los objetos que las consumen; el resto se ordena por tier y nombre.
            </p>
            {manufacturingOrder.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                No hay objetos recomendados para fabricar en este lote.
              </p>
            ) : (
              <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {manufacturingOrder.map((step, index) => (
                  <li
                    key={`${step.itemId}@${step.enchantment}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-bold text-accent">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text">
                        {step.name}
                        {step.enchantment > 0 ? ` .${step.enchantment}` : ""}
                      </p>
                      <p className="text-xs text-text-faint">
                        {formatNumber(step.quantity)} unidades
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {[...response.warnings, ...market.refreshWarnings].length > 0 && (
            <section className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted">
              {[...response.warnings, ...market.refreshWarnings].map((warning) => (
                <p key={warning}>• {warning}</p>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
