import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { getRecipeOptions, getRecipeTier } from "@core/domain/entities/Recipe";
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
  buildSuggestedManufacturingOrder,
  consolidateBatchMaterials,
  groupBatchMaterialsByCity,
  resolveBatchPlannerLine,
  type BatchPlannerSelection,
  type CheapestMaterialPrice,
} from "../utils/blackMarketBatchPlanner";
import {
  calculateBlackMarketCraftingEconomics,
  recommendBlackMarketStrategy,
} from "../utils/blackMarketCraftingComparison";
import { buildBlackMarketQualityPriceSchedule } from "../utils/blackMarketQuality";
import {
  BlackMarketBatchPlannerReport,
  type BatchPlannerReportRow,
  type BatchPlannerTotals,
} from "./BlackMarketBatchPlannerReport";

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

interface PreparedSelection {
  readonly selection: BatchPlannerSelection;
  readonly item: Item;
  readonly recipeOptionIndex: number;
  readonly materialTargets: readonly MarketPriceTarget[];
}

function normalizeQuantity(value: number): number {
  return Number.isFinite(value)
    ? Math.min(100_000, Math.max(1, Math.floor(value)))
    : 1;
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

function supportedCategory(category: Item["category"]): BlackMarketCategory | null {
  return SUPPORTED_CATEGORIES.has(category)
    ? (category as BlackMarketCategory)
    : null;
}

function eligibleItem(item: Item): boolean {
  return (
    Boolean(item.recipe) &&
    !isVanityPlaceholder(item) &&
    supportedCategory(item.category) !== null &&
    (item.recipe?.tiers.some((tier) =>
      getRecipeOptions(tier).some((option) => option.ingredients.length > 0),
    ) ?? false)
  );
}

function selectionKey(selection: BatchPlannerSelection): string {
  return `${buildMarketItemIdentifier(selection.itemId, selection.enchantment)}:q${selection.quality}`;
}

function dedupeTargets(targets: readonly MarketPriceTarget[]) {
  const byKey = new Map<string, MarketPriceTarget>();
  for (const target of targets) {
    byKey.set(buildItemPriceKey(target.itemId, target.enchantment), target);
  }
  return Array.from(byKey.values());
}

function findOpportunity(
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

function downloadCsv(filename: string, rows: readonly (readonly (string | number)[])[]) {
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
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const searchResults = useMemo(() => {
    if (query.trim().length < 2) return [];
    const selected = new Set(selections.map((selection) => selection.itemId));
    return repository
      .searchByName(query.trim())
      .filter((item) => eligibleItem(item) && !selected.has(item.id))
      .slice(0, 8);
  }, [query, repository, selections]);

  const preparedSelections = useMemo<readonly PreparedSelection[]>(() => {
    return selections.flatMap((selection) => {
      const item = repository.getById(selection.itemId);
      const tier = item?.recipe
        ? getRecipeTier(item.recipe, selection.enchantment)
        : null;
      const options = tier ? getRecipeOptions(tier) : [];
      const recipeOptionIndex = options.findIndex(
        (option) => option.ingredients.length > 0,
      );
      if (!item || recipeOptionIndex < 0) return [];
      return [
        {
          selection,
          item,
          recipeOptionIndex,
          materialTargets: options[recipeOptionIndex]!.ingredients.map(
            (ingredient) => ({
              itemId: ingredient.itemId,
              enchantment: ingredient.enchantment,
            }),
          ),
        },
      ];
    });
  }, [repository, selections]);

  const materialTargets = useMemo(
    () => dedupeTargets(preparedSelections.flatMap((entry) => entry.materialTargets)),
    [preparedSelections],
  );
  const targetLabels = useMemo(
    () =>
      new Map(
        materialTargets.map((target) => [
          buildItemPriceKey(target.itemId, target.enchantment),
          repository.getById(target.itemId)?.name ?? String(target.itemId),
        ]),
      ),
    [materialTargets, repository],
  );
  const marketRootKey = useMemo(
    () =>
      `black-market-batch:${selections.map(selectionKey).sort().join("|") || "empty"}`,
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
        Array.from(cheapestPrices.entries()).map(([key, value]) => [
          key,
          value.unitPrice,
        ]),
      ),
    [cheapestPrices],
  );

  const reportRows = useMemo<readonly BatchPlannerReportRow[]>(() => {
    if (!response) return [];
    return preparedSelections.map((entry) => {
      const opportunity = findOpportunity(response, entry.selection);
      if (!opportunity) {
        return {
          selection: entry.selection,
          item: entry.item,
          line: null,
          message:
            "No se encontró una orden compatible del Black Market para esta calidad.",
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
            : "Faltan precios de materiales para comparar fabricación.",
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
    () => reportRows.flatMap((row) => (row.line ? [row.line] : [])),
    [reportRows],
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
  const totals = useMemo<BatchPlannerTotals>(
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
      const items = preparedSelections.map((entry) => entry.item);
      const result = await scanBlackMarketOpportunities(
        {
          server,
          purchaseMarketKeys:
            DEFAULT_BLACK_MARKET_SCANNER_FILTERS.purchaseMarketKeys,
          tiers: [...new Set(items.map((item) => item.tier))],
          enchantments: [
            ...new Set(preparedSelections.map((entry) => entry.selection.enchantment)),
          ],
          qualities: [
            ...new Set(preparedSelections.map((entry) => entry.selection.quality)),
          ],
          categories: [
            ...new Set(
              items.flatMap((item) => {
                const category = supportedCategory(item.category);
                return category ? [category] : [];
              }),
            ),
          ],
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
    } catch (requestError: unknown) {
      if (controller.signal.aborted) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible calcular el lote.",
      );
      setStatus("error");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  function exportCsv() {
    const confidenceLabels = { high: "Alta", medium: "Media", low: "Baja" } as const;
    const rows: (string | number)[][] = [
      ["Planificador batch del Black Market"],
      ["Servidor", SERVER_LABELS[server]],
      ["Generado", new Date().toISOString()],
      [],
      ["Objeto", "Cantidad", "Estrategia", "Beneficio", "ROI", "Capital", "Confianza"],
      ...reportRows.map((row) => [
        `${row.item.name}${row.selection.enchantment > 0 ? ` .${row.selection.enchantment}` : ""}`,
        row.selection.quantity,
        row.line?.strategyLabel ?? "Sin resultado",
        row.line?.profit ?? "",
        row.line?.returnOnCostPercent ?? "",
        row.line?.capitalRequired ?? "",
        row.line ? confidenceLabels[row.line.confidence] : "",
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
        material.name,
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
      ["Orden", "Objeto", "Cantidad"],
      ...manufacturingOrder.map((step, index) => [
        index + 1,
        step.name,
        step.quantity,
      ]),
    ];
    downloadCsv(
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
              Combina objetos, compara comprar o fabricar y consolida materiales por
              la ciudad con el precio disponible más bajo.
            </p>
          </div>
          <p className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs text-text-muted lg:max-w-sm">
            El peso es estimado. Confirma precios, carga y órdenes dentro del juego.
          </p>
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
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text outline-none focus:border-accent-border"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border bg-surface p-2 shadow-2xl">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-raised"
                    >
                      <img
                        src={buildItemIconUrl(item.id, 0 as EnchantmentLevel, 48)}
                        alt=""
                        className="h-10 w-10 object-contain"
                      />
                      <span>
                        <span className="block text-sm font-medium text-text">{item.name}</span>
                        <span className="text-xs text-text-faint">Tier {item.tier}</span>
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
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text outline-none"
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
                className="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text outline-none"
              />
            </label>
          </div>

          <div className="space-y-3">
            {selections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-text-muted">
                Añade al menos un objeto para comenzar.
              </div>
            ) : (
              selections.map((selection) => {
                const item = repository.getById(selection.itemId);
                if (!item) return null;
                const enchantments =
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
                        src={buildItemIconUrl(item.id, selection.enchantment, 64)}
                        alt=""
                        className="h-12 w-12 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                        <p className="text-xs text-text-faint">Tier {item.tier}</p>
                      </div>
                    </div>
                    <label className="text-xs text-text-faint">
                      Cantidad
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
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                      />
                    </label>
                    <label className="text-xs text-text-faint">
                      Encant.
                      <select
                        value={selection.enchantment}
                        onChange={(event) =>
                          updateSelection(selection.itemId, {
                            enchantment: Number(event.target.value) as EnchantmentLevel,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                      >
                        {enchantments.map((enchantment) => (
                          <option key={enchantment} value={enchantment}>.{enchantment}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-text-faint">
                      Calidad
                      <select
                        value={selection.quality}
                        onChange={(event) =>
                          updateSelection(selection.itemId, {
                            quality: Number(event.target.value) as 1 | 2 | 3 | 4 | 5,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
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
                      className="rounded-lg border border-negative/30 px-3 py-2 text-xs font-semibold text-negative hover:bg-negative-muted"
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
              materiales únicos · mercado {market.status}
            </p>
            <button
              type="submit"
              disabled={selections.length === 0 || status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50"
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
        <BlackMarketBatchPlannerReport
          rows={reportRows}
          totals={totals}
          materials={materials}
          shoppingGroups={shoppingGroups}
          manufacturingOrder={manufacturingOrder}
          markets={market.markets}
          warnings={[...response.warnings, ...market.refreshWarnings]}
          canExport={csvEntitlement === true}
          onExport={exportCsv}
        />
      )}
    </div>
  );
}
