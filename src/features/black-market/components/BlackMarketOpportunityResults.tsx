import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import { buildItemIconUrl, type Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
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

interface BlackMarketOpportunityResultsProps {
  readonly response: BlackMarketOpportunitiesResponse;
  readonly repository: ItemRepository;
  readonly filters: BlackMarketOpportunityFilters;
  readonly offset: number;
  readonly loading: boolean;
  readonly onOpen: (opportunity: BlackMarketOpportunity) => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

function ScannerSummary({
  response,
}: {
  readonly response: BlackMarketOpportunitiesResponse;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          Datos de ciudades
        </p>
        <p className="mt-2 text-2xl font-semibold tabular text-text">
          {response.coverage.sourceMarketRows}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Combinaciones de venta en mercados seleccionados.
        </p>
      </article>
      <article className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Orden
        </p>
        <p className="mt-2 text-lg font-semibold text-text">
          {response.sort === "profit"
            ? "Mayor beneficio"
            : response.sort === "roi"
              ? "Mayor ROI"
              : "Más reciente"}
        </p>
        <p className="mt-1 text-xs text-text-faint">
          Cálculo realizado en la API central.
        </p>
      </article>
    </div>
  );
}

function OpportunityRow({
  opportunity,
  repository,
  onOpen,
}: {
  readonly opportunity: BlackMarketOpportunity;
  readonly repository: ItemRepository;
  readonly onOpen: (opportunity: BlackMarketOpportunity) => void;
}) {
  const baseID = baseBlackMarketItemIdentifier(opportunity.itemIdentifier);
  const item = repository.getById(baseID as Item["id"]);

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
              T{opportunity.tier}.{opportunity.enchantment} · {" "}
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
          {BLACK_MARKET_QUALITY_LABELS[opportunity.purchaseQuality]} · {" "}
          {formatBlackMarketAge(opportunity.purchaseAgeMinutes)}
        </p>
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="font-medium tabular text-text">
          {formatBlackMarketSilver(opportunity.blackMarketBuyUnitPrice)}
        </p>
        <p className="mt-1 text-[10px] text-text-faint">
          {BLACK_MARKET_QUALITY_LABELS[opportunity.blackMarketQuality]} · {" "}
          {formatBlackMarketAge(opportunity.blackMarketAgeMinutes)}
        </p>
        {opportunity.blackMarketOrderDifference !== null && (
          <p className="mt-0.5 text-[10px] text-text-faint">
            Diferencia de órdenes: {" "}
            {formatBlackMarketSilver(opportunity.blackMarketOrderDifference)}
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <p className="font-semibold tabular text-positive">
          {formatBlackMarketSilver(opportunity.profit)}
        </p>
        <p className="mt-1 text-[10px] tabular text-text-faint">
          {formatBlackMarketPercent(opportunity.returnOnCostPercent)} ROI
        </p>
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

export function BlackMarketOpportunityResults({
  response,
  repository,
  filters,
  offset,
  loading,
  onOpen,
  onPrevious,
  onNext,
}: BlackMarketOpportunityResultsProps) {
  const hasPrevious = offset > 0;
  const hasNext = offset + response.returned < response.totalMatching;

  return (
    <section className="mt-6 space-y-5">
      <ScannerSummary response={response} />

      {response.warnings.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning-muted p-4">
          <h3 className="text-sm font-semibold text-warning">
            Estado de los datos
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
            {response.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-col gap-1 border-b border-border bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">Resultados</h3>
            <p className="mt-0.5 text-[11px] text-text-faint">
              Haz clic en el objeto o en “Ver detalle” para abrir el desglose sin salir del escáner.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-text-faint">
            Valores por unidad
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[68rem] text-left">
            <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-text-faint">
              <tr>
                <th className="px-3 py-3 font-medium">Objeto</th>
                <th className="px-3 py-3 font-medium">Comprar</th>
                <th className="px-3 py-3 font-medium">Black Market</th>
                <th className="px-3 py-3 text-right font-medium">
                  Resultado
                </th>
                <th className="px-3 py-3 font-medium">Riesgo</th>
                <th className="px-3 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {response.data.map((opportunity) => (
                <OpportunityRow
                  key={opportunity.id}
                  opportunity={opportunity}
                  repository={repository}
                  onOpen={onOpen}
                />
              ))}
            </tbody>
          </table>
        </div>
        {response.data.length === 0 && (
          <p className="border-t border-border px-5 py-12 text-center text-sm text-text-faint">
            No hay oportunidades que cumplan beneficio, ROI y frescura seleccionados.
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
