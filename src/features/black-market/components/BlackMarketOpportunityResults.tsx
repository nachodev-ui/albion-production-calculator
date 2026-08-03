import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import { buildItemIconUrl, type Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import type {
  BlackMarketMassAnalysisRow,
  BlackMarketMassCraftingAnalysis,
} from "../hooks/useBlackMarketMassCraftingAnalysis";
import type {
  BlackMarketOpportunitiesResponse,
  BlackMarketOpportunity,
  BlackMarketOpportunityFilters,
} from "../types";
import { blackMarketSaleModeLabel } from "../utils/blackMarketSaleEconomics";
import {
  baseBlackMarketItemIdentifier,
  blackMarketScannerCategoryName,
  blackMarketScannerMarketName,
  formatBlackMarketAge,
  formatBlackMarketPercent,
  formatBlackMarketSilver,
} from "./blackMarketScannerConfig";
import { BlackMarketDataConfidenceBadge } from "./BlackMarketDataConfidenceBadge";
import { BlackMarketQualityBadge } from "./BlackMarketQualityBadge";
import { BlackMarketRiskBadge } from "./BlackMarketRiskBadge";

interface BlackMarketOpportunityResultsProps {
  readonly response: BlackMarketOpportunitiesResponse;
  readonly repository: ItemRepository;
  readonly filters: BlackMarketOpportunityFilters;
  readonly strategyAnalysis: BlackMarketMassCraftingAnalysis;
  readonly offset: number;
  readonly loading: boolean;
  readonly onOpen: (opportunity: BlackMarketOpportunity) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

function ScannerSummary({
  response,
  strategyAnalysis,
  filters,
}: {
  readonly response: BlackMarketOpportunitiesResponse;
  readonly strategyAnalysis: BlackMarketMassCraftingAnalysis;
  readonly filters: BlackMarketOpportunityFilters;
}) {
  const craftable = strategyAnalysis.rows.filter((row) => row.status === "ready").length;
  const cards = [
    {
      label: "Oportunidades",
      value: String(response.totalMatching),
      note: `${response.returned} en esta página`,
    },
    {
      label: "Estrategias completas",
      value: String(craftable),
      note: "Con materiales suficientes",
    },
    {
      label: "Materiales consultados",
      value: String(strategyAnalysis.materialTargetCount),
      note: "Identificadores únicos",
    },
    {
      label: "Cálculo activo",
      value: blackMarketSaleModeLabel(filters.saleMode),
      note: `${filters.salesTaxPercent}% impuesto · ${
        filters.saleMode === "sell-order"
          ? `${filters.setupFeePercent}% setup`
          : "sin setup"
      }`,
      emphasized: true,
    },
    {
      label: "Fabricación",
      value:
        strategyAnalysis.status === "loading"
          ? "Consultando"
          : strategyAnalysis.status === "error"
            ? "Degradado"
            : "Disponible",
      note: "Cálculo local neto",
    },
  ] as const;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className={`rounded-xl border px-3.5 py-3 transition-colors ${
            "emphasized" in card && card.emphasized
              ? "border-accent-border/70 bg-accent-muted/30"
              : "border-border/80 bg-surface-raised/70"
          }`}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            {card.label}
          </p>
          <p className="mt-1.5 truncate text-base font-semibold tabular text-text">
            {card.value}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-text-faint">{card.note}</p>
        </article>
      ))}
    </div>
  );
}

function strategyTone(
  kind: BlackMarketMassAnalysisRow["recommendation"]["kind"],
): string {
  if (kind === "craft-with-focus") {
    return "border-positive/40 bg-positive-muted text-positive";
  }
  if (kind === "craft-without-focus") {
    return "border-accent-border bg-accent-muted text-accent";
  }
  return "border-border-strong bg-surface-raised text-text-muted";
}

function bestEconomics(row: BlackMarketMassAnalysisRow) {
  if (row.recommendation.kind === "craft-with-focus") return row.withFocus;
  if (row.recommendation.kind === "craft-without-focus") return row.withoutFocus;
  return null;
}

function strategyDescription(row: BlackMarketMassAnalysisRow): string {
  if (row.status === "incomplete") return "Faltan precios para completar la comparación.";
  if (row.status === "not-craftable") return "No existe una receta compatible para este objeto.";
  if (row.recommendation.kind === "craft-with-focus") {
    return "Fabricar con foco entrega el mejor retorno neto.";
  }
  if (row.recommendation.kind === "craft-without-focus") {
    return "Fabricar sin foco supera la compra del objeto terminado.";
  }
  return "Comprar terminado ofrece el mejor resultado neto.";
}

function MobileLabel({ children }: { readonly children: string }) {
  return (
    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-text-faint xl:hidden">
      {children}
    </p>
  );
}

function SalePriceOption({
  label,
  value,
  selected,
}: {
  readonly label: string;
  readonly value: number | null;
  readonly selected: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border px-2.5 py-2 transition-colors ${
        selected
          ? "border-accent-border/75 bg-accent-muted/45 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
          : "border-border/65 bg-bg/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`truncate text-[9px] font-semibold uppercase tracking-[0.1em] ${
            selected ? "text-accent" : "text-text-faint"
          }`}
        >
          {label}
        </p>
        {selected && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Modo utilizado" />
        )}
      </div>
      <p
        className={`mt-1 truncate text-sm font-semibold tabular ${
          value === null ? "text-text-faint" : "text-text"
        }`}
      >
        {value === null ? "Sin precio" : formatBlackMarketSilver(value)}
      </p>
    </div>
  );
}

function OpportunityCard({
  row,
  repository,
  filters,
  analysisLoading,
  onOpen,
}: {
  readonly row: BlackMarketMassAnalysisRow;
  readonly repository: ItemRepository;
  readonly filters: BlackMarketOpportunityFilters;
  readonly analysisLoading: boolean;
  readonly onOpen: (opportunity: BlackMarketOpportunity) => void;
}) {
  const { opportunity } = row;
  const baseID = baseBlackMarketItemIdentifier(opportunity.itemIdentifier);
  const item = repository.getById(baseID as Item["id"]);
  const economics = bestEconomics(row);
  const selectedSaleAvailable =
    row.buyFinishedEconomics.available || economics?.isComplete === true;
  const focusValue = row.focusValuation?.silverPerFocus;
  const secondaryFacts: string[] = [];

  if (economics) {
    secondaryFacts.push(
      `${formatBlackMarketPercent(economics.qualitySuccessProbability * 100)} calidad objetivo`,
      `Pérdida esperada ${formatBlackMarketSilver(economics.expectedDeathLoss)}`,
    );
  } else {
    secondaryFacts.push("Compra de objeto terminado");
  }

  if (
    row.recommendation.kind === "craft-with-focus" &&
    focusValue !== null &&
    focusValue !== undefined
  ) {
    secondaryFacts.push(
      `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(
        focusValue,
      )} plata/foco`,
    );
  }

  if (
    opportunity.caerleonCompetition.canFillProfitably &&
    opportunity.purchaseMarketKey !== "caerleon"
  ) {
    secondaryFacts.push("Competencia rentable desde Caerleon");
  }

  return (
    <article className="group overflow-hidden rounded-xl border border-border/85 bg-surface transition-[border-color,background-color,box-shadow] hover:border-border-strong hover:bg-surface-raised/35 hover:shadow-[0_12px_32px_rgb(0_0_0/0.16)]">
      <div className="grid md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.35fr)_minmax(8.5rem,0.68fr)_minmax(16rem,1.15fr)_minmax(11rem,0.78fr)_minmax(10rem,0.68fr)_minmax(8rem,0.52fr)]">
        <section className="min-w-0 p-4">
          <MobileLabel>Objeto</MobileLabel>
          <button
            type="button"
            onClick={() => onOpen(opportunity)}
            className="flex w-full cursor-pointer items-center gap-3 text-left focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            <img
              src={buildItemIconUrl(
                baseID as Item["id"],
                opportunity.enchantment as EnchantmentLevel,
                64,
              )}
              alt=""
              className="h-13 w-13 shrink-0 rounded-xl border border-border/70 bg-bg/45 object-contain transition-transform group-hover:scale-[1.03]"
            />
            <span className="min-w-0">
              <span className="block line-clamp-2 text-[15px] font-semibold leading-snug text-text transition-colors group-hover:text-accent">
                {item?.name ?? opportunity.itemIdentifier}
              </span>
              <span className="mt-1 block text-[10px] font-medium text-text-faint">
                T{opportunity.tier}.{opportunity.enchantment} ·{" "}
                {blackMarketScannerCategoryName(opportunity.category)}
              </span>
            </span>
          </button>
        </section>

        <section className="border-t border-border/60 p-4 md:border-l md:border-t-0 xl:border-l">
          <MobileLabel>Compra</MobileLabel>
          <p className="truncate text-xs font-semibold text-text">
            {blackMarketScannerMarketName(opportunity.purchaseMarketKey)}
          </p>
          <p className="mt-1.5 truncate text-base font-semibold tabular text-text">
            {formatBlackMarketSilver(opportunity.purchaseUnitPrice)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <BlackMarketQualityBadge quality={opportunity.purchaseQuality} compact />
            <span className="text-[9px] tabular text-text-faint">
              {formatBlackMarketAge(opportunity.purchaseAgeMinutes)}
            </span>
          </div>
        </section>

        <section className="border-t border-border/60 p-4 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <MobileLabel>Black Market</MobileLabel>
            <span className="ml-auto">
              <BlackMarketQualityBadge quality={opportunity.blackMarketQuality} compact />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SalePriceOption
              label="Venta directa"
              value={opportunity.blackMarketBuyUnitPrice}
              selected={filters.saleMode === "direct"}
            />
            <SalePriceOption
              label="Orden de venta"
              value={opportunity.blackMarketSellUnitPrice}
              selected={filters.saleMode === "sell-order"}
            />
          </div>
          <BlackMarketDataConfidenceBadge
            label="Evidencia Black Market"
            evidence={{
              ageMinutes: opportunity.blackMarketAgeMinutes,
              unitPrice: row.buyFinishedEconomics.selectedUnitPrice,
              observations7d: opportunity.blackMarketHistoryObservations7d,
              volume7d: opportunity.blackMarketHistoryVolume7d,
              medianPrice7d: opportunity.blackMarketMedianPrice7d,
              buyPrice: opportunity.blackMarketBuyUnitPrice,
              sellPrice: opportunity.blackMarketSellUnitPrice,
            }}
            compact
          />
        </section>

        <section className="border-t border-border/60 p-4 md:border-l xl:border-l xl:border-t-0">
          <MobileLabel>Mejor estrategia</MobileLabel>
          <span
            className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[10px] font-semibold ${strategyTone(
              row.recommendation.kind,
            )}`}
          >
            <span className="truncate">{row.recommendation.label}</span>
          </span>
          <p className="mt-2 text-[10px] leading-relaxed text-text-faint">
            {analysisLoading && row.status !== "ready"
              ? "Actualizando costos de materiales…"
              : strategyDescription(row)}
          </p>
        </section>

        <section className="border-t border-border/60 p-4 md:border-l xl:border-l xl:border-t-0">
          <MobileLabel>Resultado</MobileLabel>
          {selectedSaleAvailable ? (
            <>
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-text-faint">
                Beneficio neto
              </p>
              <p
                className={`mt-1 text-xl font-bold tabular tracking-tight ${
                  row.recommendation.profit >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatBlackMarketSilver(row.recommendation.profit)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border/70 bg-bg/25 px-2 py-1 text-[10px] font-semibold tabular text-text-muted">
                  {row.recommendation.returnOnCostPercent === null
                    ? "ROI no disponible"
                    : `${formatBlackMarketPercent(
                        row.recommendation.returnOnCostPercent,
                      )} ROI neto`}
                </span>
                {row.recommendation.kind !== "buy-finished" && (
                  <span className="text-[9px] font-medium tabular text-accent">
                    {row.recommendation.advantageOverBuying >= 0 ? "+" : ""}
                    {formatBlackMarketSilver(row.recommendation.advantageOverBuying)} vs comprar
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning-muted/45 px-3 py-2.5">
              <p className="text-xs font-semibold text-warning">Resultado incompleto</p>
              <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
                Sin precio para {blackMarketSaleModeLabel(filters.saleMode).toLowerCase()}.
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col justify-between gap-3 border-t border-border/60 p-4 md:border-l xl:border-l xl:border-t-0">
          <div>
            <MobileLabel>Riesgo</MobileLabel>
            <div className="flex items-center justify-between gap-2 xl:block">
              <span className="text-[9px] font-semibold uppercase tracking-[0.13em] text-text-faint xl:block">
                Riesgo
              </span>
              <span className="xl:mt-2 xl:block">
                <BlackMarketRiskBadge risk={opportunity.risk} />
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpen(opportunity)}
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-accent-border/65 bg-accent-muted/20 px-3 py-2 text-xs font-semibold text-accent transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent-muted/55 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border active:translate-y-0"
          >
            Ver detalle
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/55 bg-bg/20 px-4 py-2.5 text-[9px] text-text-faint">
        {secondaryFacts.map((fact, index) => (
          <span key={fact} className="inline-flex items-center gap-3">
            {index > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-border-strong" />}
            <span>{fact}</span>
          </span>
        ))}
      </footer>
    </article>
  );
}

function sortAndFilterRows(
  rows: readonly BlackMarketMassAnalysisRow[],
  filters: BlackMarketOpportunityFilters,
): readonly BlackMarketMassAnalysisRow[] {
  const filtered = rows.filter((row) => {
    const matchesStrategy =
      filters.strategyFilter === "all" ||
      row.recommendation.kind === filters.strategyFilter;
    const profit = row.recommendation.profit;
    const roi = row.recommendation.returnOnCostPercent;
    const hasSelectedPrice =
      row.buyFinishedEconomics.available ||
      row.withFocus?.isComplete ||
      row.withoutFocus?.isComplete;
    return (
      matchesStrategy &&
      hasSelectedPrice &&
      profit >= filters.minimumProfit &&
      (roi ?? -Infinity) >= filters.minimumReturnOnCostPercent
    );
  });

  if (filters.strategySort === "api") return filtered;

  return [...filtered].sort((left, right) => {
    if (filters.strategySort === "best-roi") {
      return (
        (right.recommendation.returnOnCostPercent ?? -Infinity) -
        (left.recommendation.returnOnCostPercent ?? -Infinity)
      );
    }
    if (filters.strategySort === "advantage") {
      return (
        right.recommendation.advantageOverBuying -
        left.recommendation.advantageOverBuying
      );
    }
    return right.recommendation.profit - left.recommendation.profit;
  });
}

export function BlackMarketOpportunityResults({
  response,
  repository,
  filters,
  strategyAnalysis,
  offset,
  loading,
  onOpen,
  onPrevious,
  onNext,
}: BlackMarketOpportunityResultsProps) {
  const hasPrevious = offset > 0;
  const hasNext = offset + response.returned < response.totalMatching;
  const visibleRows = sortAndFilterRows(strategyAnalysis.rows, filters);

  return (
    <section className="mt-6 space-y-5">
      <ScannerSummary
        response={response}
        strategyAnalysis={strategyAnalysis}
        filters={filters}
      />

      {(response.warnings.length > 0 ||
        strategyAnalysis.warnings.length > 0 ||
        strategyAnalysis.error) && (
        <div className="rounded-xl border border-warning/40 bg-warning-muted p-4">
          <h3 className="text-sm font-semibold text-warning">Estado de los datos</h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
            [
              ...response.warnings,
              ...strategyAnalysis.warnings,
              ...(strategyAnalysis.error ? [strategyAnalysis.error] : []),
            ].map((warning) => <li key={warning}>• {warning}</li>)
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-[0_18px_55px_rgb(0_0_0/0.16)]">
        <header className="flex flex-col gap-2 border-b border-border/75 bg-surface-raised/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="text-base font-semibold text-text">Resultados netos por estrategia</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
              Ordenados por rentabilidad real: {filters.salesTaxPercent}% de impuesto
              {filters.saleMode === "sell-order"
                ? `, ${filters.setupFeePercent}% de setup fee`
                : ""}
              , transporte y costos de fabricación incluidos.
            </p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-border-strong/70 bg-bg/30 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted">
            {visibleRows.length} de {response.returned} visibles
          </span>
        </header>

        <div className="hidden border-b border-border/65 bg-bg/20 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-text-faint xl:grid xl:grid-cols-[minmax(15rem,1.35fr)_minmax(8.5rem,0.68fr)_minmax(16rem,1.15fr)_minmax(11rem,0.78fr)_minmax(10rem,0.68fr)_minmax(8rem,0.52fr)]">
          <span>Objeto</span>
          <span className="border-l border-border/50 pl-4">Compra</span>
          <span className="border-l border-border/50 pl-4">Black Market</span>
          <span className="border-l border-border/50 pl-4">Estrategia</span>
          <span className="border-l border-border/50 pl-4">Resultado</span>
          <span className="border-l border-border/50 pl-4">Riesgo y acción</span>
        </div>

        <div className="black-market-results-scroll space-y-2 bg-bg/10 p-2.5 sm:p-3">
          {visibleRows.map((row) => (
            <OpportunityCard
              key={row.opportunity.id}
              row={row}
              repository={repository}
              filters={filters}
              analysisLoading={strategyAnalysis.status === "loading"}
              onOpen={onOpen}
            />
          ))}
        </div>

        {visibleRows.length === 0 && (
          <p className="border-t border-border px-5 py-12 text-center text-sm text-text-faint">
            No hay oportunidades que cumplan los umbrales netos para el modo de venta seleccionado.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          disabled={!hasPrevious || loading}
          onClick={onPrevious}
          className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs text-text-muted transition-colors hover:border-accent-border hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Página anterior
        </button>
        <p className="text-xs tabular text-text-faint">
          {response.totalMatching === 0 ? 0 : offset + 1}–{offset + response.returned} de{" "}
          {response.totalMatching}
        </p>
        <button
          type="button"
          disabled={!hasNext || loading}
          onClick={onNext}
          className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs text-text-muted transition-colors hover:border-accent-border hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Página siguiente
        </button>
      </div>

      <p className="sr-only">Página configurada con {filters.limit} resultados como máximo.</p>
    </section>
  );
}
