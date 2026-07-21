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
import {
  BLACK_MARKET_QUALITY_LABELS,
  baseBlackMarketItemIdentifier,
  blackMarketScannerCategoryName,
  blackMarketScannerMarketName,
  formatBlackMarketAge,
  formatBlackMarketPercent,
  formatBlackMarketSilver,
} from "./blackMarketScannerConfig";
import { BlackMarketRiskBadge } from "./BlackMarketRiskBadge";
import { BlackMarketDataConfidenceBadge } from "./BlackMarketDataConfidenceBadge";

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
}: {
  readonly response: BlackMarketOpportunitiesResponse;
  readonly strategyAnalysis: BlackMarketMassCraftingAnalysis;
}) {
  const craftable = strategyAnalysis.rows.filter(
    (row) => row.status === "ready",
  ).length;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Oportunidades
        </p>
        <p className="mt-2 text-2xl font-semibold tabular text-text">
          {response.totalMatching}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          {response.returned} visibles en esta página.
        </p>
      </article>
      <article className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Estrategias completas
        </p>
        <p className="mt-2 text-2xl font-semibold tabular text-positive">
          {craftable}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Filas con materiales suficientes para comparar.
        </p>
      </article>
      <article className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Materiales en batch
        </p>
        <p className="mt-2 text-2xl font-semibold tabular text-text">
          {strategyAnalysis.materialTargetCount}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Identificadores únicos consultados entre mercados.
        </p>
      </article>
      <article className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Datos Black Market
        </p>
        <p className="mt-2 text-2xl font-semibold tabular text-text">
          {response.coverage.blackMarketRows}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Combinaciones con orden de compra almacenada.
        </p>
      </article>
      <article className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Estado fabricación
        </p>
        <p className="mt-2 text-lg font-semibold text-text">
          {strategyAnalysis.status === "loading"
            ? "Consultando materiales"
            : strategyAnalysis.status === "error"
              ? "Datos degradados"
              : "Análisis disponible"}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Cálculo local con el motor de crafteo.
        </p>
      </article>
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
  return "border-border bg-surface text-text-muted";
}

function bestEconomics(row: BlackMarketMassAnalysisRow) {
  if (row.recommendation.kind === "craft-with-focus") return row.withFocus;
  if (row.recommendation.kind === "craft-without-focus") return row.withoutFocus;
  return null;
}

function OpportunityRow({
  row,
  repository,
  analysisLoading,
  onOpen,
}: {
  readonly row: BlackMarketMassAnalysisRow;
  readonly repository: ItemRepository;
  readonly analysisLoading: boolean;
  readonly onOpen: (opportunity: BlackMarketOpportunity) => void;
}) {
  const { opportunity } = row;
  const baseID = baseBlackMarketItemIdentifier(opportunity.itemIdentifier);
  const item = repository.getById(baseID as Item["id"]);
  const economics = bestEconomics(row);

  return (
    <tr className="border-t border-border/70 align-middle transition-colors hover:bg-surface-raised/75">
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onOpen(opportunity)}
          className="group flex min-w-[15rem] cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          <img
            src={buildItemIconUrl(
              baseID as Item["id"],
              opportunity.enchantment as EnchantmentLevel,
              64,
            )}
            alt=""
            className="h-11 w-11 rounded-lg bg-bg/45 object-contain transition-transform group-hover:scale-105"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text transition-colors group-hover:text-accent">
              {item?.name ?? opportunity.itemIdentifier}
            </span>
            <span className="text-[10px] text-text-faint">
              T{opportunity.tier}.{opportunity.enchantment} ·{" "}
              {blackMarketScannerCategoryName(opportunity.category)}
            </span>
          </span>
        </button>
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="font-medium text-text">
          {blackMarketScannerMarketName(opportunity.purchaseMarketKey)}
        </p>
        <p className="mt-1 tabular text-text-muted">
          {formatBlackMarketSilver(opportunity.purchaseUnitPrice)}
        </p>
        <p className="mt-0.5 text-[10px] text-text-faint">
          {BLACK_MARKET_QUALITY_LABELS[opportunity.purchaseQuality]} ·{" "}
          {formatBlackMarketAge(opportunity.purchaseAgeMinutes)}
        </p>
        <BlackMarketDataConfidenceBadge
          label="Compra en ciudad"
          evidence={{
            ageMinutes: opportunity.purchaseAgeMinutes,
            unitPrice: opportunity.purchaseUnitPrice,
            observations7d: opportunity.purchaseHistoryObservations7d,
            volume7d: opportunity.purchaseHistoryVolume7d,
            medianPrice7d: opportunity.purchaseMedianPrice7d,
            buyPrice: opportunity.purchaseBuyUnitPrice,
            sellPrice: opportunity.purchaseUnitPrice,
          }}
          compact
        />
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="font-medium tabular text-text">
          {formatBlackMarketSilver(opportunity.blackMarketBuyUnitPrice)}
        </p>
        <p className="mt-1 text-[10px] text-text-faint">
          {BLACK_MARKET_QUALITY_LABELS[opportunity.blackMarketQuality]} ·{" "}
          {formatBlackMarketAge(opportunity.blackMarketAgeMinutes)}
        </p>
        <BlackMarketDataConfidenceBadge
          label="Orden Black Market"
          evidence={{
            ageMinutes: opportunity.blackMarketAgeMinutes,
            unitPrice: opportunity.blackMarketBuyUnitPrice,
            observations7d: opportunity.blackMarketHistoryObservations7d,
            volume7d: opportunity.blackMarketHistoryVolume7d,
            medianPrice7d: opportunity.blackMarketMedianPrice7d,
            buyPrice: opportunity.blackMarketBuyUnitPrice,
            sellPrice: opportunity.blackMarketSellUnitPrice,
          }}
          compact
        />
      </td>
      <td className="px-3 py-3 text-xs">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${strategyTone(
            row.recommendation.kind,
          )}`}
        >
          {row.recommendation.label}
        </span>
        {row.status === "incomplete" && (
          <p className="mt-1.5 text-[10px] text-warning">
            Precios de materiales incompletos
          </p>
        )}
        {row.status === "not-craftable" && (
          <p className="mt-1.5 text-[10px] text-text-faint">
            Sin receta compatible
          </p>
        )}
        {analysisLoading && row.status !== "ready" && (
          <p className="mt-1.5 text-[10px] text-accent">
            Actualizando materiales…
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <p
          className={`font-semibold tabular ${
            row.recommendation.profit >= 0 ? "text-positive" : "text-negative"
          }`}
        >
          {formatBlackMarketSilver(row.recommendation.profit)}
        </p>
        <p className="mt-1 text-[10px] tabular text-text-faint">
          {row.recommendation.returnOnCostPercent === null
            ? "ROI no disponible"
            : `${formatBlackMarketPercent(
                row.recommendation.returnOnCostPercent,
              )} ROI ajustado`}
        </p>
        {row.recommendation.kind !== "buy-finished" && (
          <p className="mt-0.5 text-[10px] tabular text-accent">
            {row.recommendation.advantageOverBuying >= 0 ? "+" : ""}
            {formatBlackMarketSilver(
              row.recommendation.advantageOverBuying,
            )}{" "}
            vs comprar
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-xs">
        {economics ? (
          <>
            <p className="font-medium text-text">
              {formatBlackMarketPercent(
                economics.qualitySuccessProbability * 100,
              )}{" "}
              calidad objetivo
            </p>
            {row.recommendation.kind === "craft-with-focus" &&
              (row.focusValuation?.silverPerFocus ?? null) !== null && (
                <p className="mt-1 text-[10px] tabular text-text-faint">
                  {new Intl.NumberFormat("es-CL", {
                    maximumFractionDigits: 2,
                  }).format(row.focusValuation?.silverPerFocus ?? 0)}{" "}
                  plata/foco
                </p>
              )}
            <p className="mt-0.5 text-[10px] tabular text-text-faint">
              Pérdida esperada{" "}
              {formatBlackMarketSilver(economics.expectedDeathLoss)}
            </p>
          </>
        ) : (
          <p className="text-text-faint">No aplica</p>
        )}
      </td>
      <td className="px-3 py-3 text-xs">
        <BlackMarketRiskBadge risk={opportunity.risk} />
        {opportunity.caerleonCompetition.canFillProfitably &&
          opportunity.purchaseMarketKey !== "caerleon" && (
            <p className="mt-1.5 max-w-40 text-[10px] leading-relaxed text-warning">
              Competencia rentable desde Caerleon
            </p>
          )}
      </td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          onClick={() => onOpen(opportunity)}
          className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted transition-all hover:-translate-y-0.5 hover:border-accent-border hover:bg-accent-muted hover:text-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border active:translate-y-0"
        >
          Ver detalle
        </button>
      </td>
    </tr>
  );
}

function sortAndFilterRows(
  rows: readonly BlackMarketMassAnalysisRow[],
  filters: BlackMarketOpportunityFilters,
): readonly BlackMarketMassAnalysisRow[] {
  const filtered = rows.filter(
    (row) =>
      filters.strategyFilter === "all" ||
      row.recommendation.kind === filters.strategyFilter,
  );
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
      />

      {(response.warnings.length > 0 ||
        strategyAnalysis.warnings.length > 0 ||
        strategyAnalysis.error) && (
        <div className="rounded-xl border border-warning/40 bg-warning-muted p-4">
          <h3 className="text-sm font-semibold text-warning">
            Estado de los datos
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
            {[
              ...response.warnings,
              ...strategyAnalysis.warnings,
              ...(strategyAnalysis.error ? [strategyAnalysis.error] : []),
            ].map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-1 border-b border-border bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Resultados con mejor estrategia
            </h3>
            <p className="mt-0.5 text-[11px] text-text-faint">
              Fabricación usa precios batch de materiales, RRR, foco, calidad y
              costos logísticos configurados. El orden local se aplica a esta
              página.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-faint">
            {visibleRows.length} de {response.returned} filas visibles
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[92rem] text-left">
            <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-text-faint">
              <tr>
                <th className="px-3 py-3 font-medium">Objeto</th>
                <th className="px-3 py-3 font-medium">Comprar</th>
                <th className="px-3 py-3 font-medium">Black Market</th>
                <th className="px-3 py-3 font-medium">Mejor estrategia</th>
                <th className="px-3 py-3 text-right font-medium">
                  Beneficio y ROI
                </th>
                <th className="px-3 py-3 font-medium">Calidad y riesgo</th>
                <th className="px-3 py-3 font-medium">Riesgo de mercado</th>
                <th className="px-3 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <OpportunityRow
                  key={row.opportunity.id}
                  row={row}
                  repository={repository}
                  analysisLoading={strategyAnalysis.status === "loading"}
                  onOpen={onOpen}
                />
              ))}
            </tbody>
          </table>
        </div>
        {visibleRows.length === 0 && (
          <p className="border-t border-border px-5 py-12 text-center text-sm text-text-faint">
            No hay oportunidades de esta página cuya mejor estrategia coincida
            con el filtro seleccionado.
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
          {response.totalMatching === 0 ? 0 : offset + 1}–
          {offset + response.returned} de {response.totalMatching}
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

      <p className="sr-only">
        Página configurada con {filters.limit} resultados como máximo.
      </p>
    </section>
  );
}
