import type { CraftCalculation } from "@core/domain/entities/CraftCostNode";
import type { Item } from "@core/domain/entities/Item";
import { isReturnEligibleIngredient } from "@core/domain/entities/ResourceReturnEligibility";
import type { RecipeTier } from "@core/domain/entities/Recipe";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import { RecipeOptionSelector } from "@features/craft-calculator/components/recipe/RecipeOptionSelector";
import { MaterialMarketCitySelect } from "@features/market-data/components/MaterialMarketCitySelect";
import { MaterialPurchaseConfigBar } from "@features/market-data/components/MaterialPurchaseConfigBar";
import type {
  AutomaticMarketPriceDetail,
  MarketCityId,
  MarketConfig,
  MarketDefinition,
  MarketPriceFreshness,
  MaterialMarketPriceComparisons,
  MaterialPurchaseCityOverrides,
} from "@features/market-data/types/MarketPrice";
import {
  buildItemPriceKey,
  getMarketName,
} from "@features/market-data/types/MarketPrice";
import { ItemIcon } from "@shared/components/ItemIcon";
import { formatBlackMarketSilver } from "./blackMarketScannerConfig";

interface BlackMarketCraftingMaterialsCardProps {
  readonly item: Item;
  readonly calculation: CraftCalculation;
  readonly craftsNeeded: number;
  readonly tier: RecipeTier;
  readonly recipeOptionCount: number;
  readonly recipeOptionIndex: number;
  readonly repository: ItemRepository;
  readonly config: MarketConfig;
  readonly markets: readonly MarketDefinition[];
  readonly status: "idle" | "loading" | "success" | "error";
  readonly materialCityOverrideCount: number;
  readonly automaticPrices: ReadonlyMap<string, number>;
  readonly automaticPriceDetails: ReadonlyMap<
    string,
    AutomaticMarketPriceDetail
  >;
  readonly priceComparisons: MaterialMarketPriceComparisons;
  readonly cityOverrides: MaterialPurchaseCityOverrides;
  readonly resolvedCities: ReadonlyMap<string, MarketCityId>;
  readonly onConfigChange: (patch: Partial<MarketConfig>) => void;
  readonly onClearCities: () => void;
  readonly onRecipeOptionChange: (index: number) => void;
  readonly onCityChange: (
    itemPriceKey: string,
    city: MarketCityId | null,
  ) => void;
  readonly onRefresh: () => Promise<void>;
}

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

export function BlackMarketCraftingMaterialsCard({
  item,
  calculation,
  craftsNeeded,
  tier,
  recipeOptionCount,
  recipeOptionIndex,
  repository,
  config,
  markets,
  status,
  materialCityOverrideCount,
  automaticPrices,
  automaticPriceDetails,
  priceComparisons,
  cityOverrides,
  resolvedCities,
  onConfigChange,
  onClearCities,
  onRecipeOptionChange,
  onCityChange,
  onRefresh,
}: BlackMarketCraftingMaterialsCardProps) {
  return (
    <section className="rounded-xl border border-border bg-surface-raised/45 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Materiales y ciudades de compra
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-text-faint">
            Cada precio conserva su captura y antigüedad. Si falta un material,
            la estrategia permanece incompleta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={status === "loading"}
          className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:border-accent-border hover:text-accent disabled:cursor-wait disabled:opacity-60"
        >
          {status === "loading" ? "Actualizando…" : "Actualizar materiales"}
        </button>
      </div>

      <MaterialPurchaseConfigBar
        config={config}
        markets={markets}
        materialCityOverrideCount={materialCityOverrideCount}
        onChange={onConfigChange}
        onClearMaterialCities={onClearCities}
      />

      {recipeOptionCount > 1 && (
        <RecipeOptionSelector
          tier={tier}
          selectedIndex={recipeOptionIndex}
          repository={repository}
          onChange={onRecipeOptionChange}
        />
      )}

      <div className="mt-4 space-y-3">
        {calculation.root.children.map((material, index) => {
          const materialItem = repository.getById(material.itemId);
          const priceKey = buildItemPriceKey(
            material.itemId,
            material.enchantment,
          );
          const priceDetail = automaticPriceDetails.get(priceKey);
          const comparisons = priceComparisons.get(priceKey) ?? [];
          const override = cityOverrides.get(priceKey);
          const city = resolvedCities.get(priceKey) ?? config.purchaseCity;
          const unitPrice = automaticPrices.get(priceKey);
          const batchQuantity = material.quantity * craftsNeeded;
          const returnEligible =
            materialItem !== null &&
            isReturnEligibleIngredient(item, materialItem);

          return (
            <article
              key={`${priceKey}:${index}`}
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
                    x
                    {batchQuantity.toLocaleString("es-CL", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    para el lote ·{" "}
                    {returnEligible ? "recuperable por RRR" : "no recibe RRR"}
                  </p>
                  <p className="mt-1 text-[11px] text-text-faint">
                    {FRESHNESS_LABELS[priceDetail?.freshness ?? "missing"]} ·{" "}
                    {formatDate(priceDetail?.updatedAt ?? null)}
                  </p>
                </div>
              </div>

              <MaterialMarketCitySelect
                value={override ?? null}
                defaultCity={config.purchaseCity}
                markets={markets}
                comparisons={comparisons}
                ariaLabel={`Ciudad de compra de ${materialItem?.name ?? String(material.itemId)}`}
                onChange={(cityOverride) =>
                  onCityChange(priceKey, cityOverride)
                }
              />

              <div className="md:text-right">
                <p className="text-xs text-text-faint">
                  {getMarketName(markets, city)}
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
  );
}
