import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import type { AppRoute } from "../../../app/types";
import { FeatureGate } from "../../account/components/FeatureGate";
import { useAccountSession } from "../../account/hooks/useAccountSession";
import { ENTITLEMENT_KEYS } from "../../account/types";
import { scanBlackMarketOpportunities } from "../api/blackMarketOpportunitiesApi";
import { useBlackMarketMassCraftingAnalysis } from "../hooks/useBlackMarketMassCraftingAnalysis";
import {
  loadBlackMarketScannerFilters,
  saveBlackMarketScannerFilters,
} from "../storage/blackMarketScannerStorage";
import type {
  BlackMarketOpportunitiesResponse,
  BlackMarketOpportunity,
  BlackMarketOpportunityFilters,
} from "../types";
import { BlackMarketOpportunityDetailDialog } from "./BlackMarketOpportunityDetailDialog";
import { BlackMarketOpportunityResults } from "./BlackMarketOpportunityResults";
import { BlackMarketScannerControls } from "./BlackMarketScannerControls";
import { BlackMarketStrategyAssumptions } from "./BlackMarketStrategyAssumptions";

interface BlackMarketOpportunityScannerPageProps {
  readonly repository: ItemRepository;
  readonly onNavigate: (route: AppRoute) => void;
  readonly onOpenCrafting: (item: Item) => void;
}

function Scanner({
  repository,
  onOpenCrafting,
}: {
  readonly repository: ItemRepository;
  readonly onOpenCrafting: (item: Item) => void;
}) {
  const session = useAccountSession();
  const [filters, setFilters] = useState<BlackMarketOpportunityFilters>(() =>
    loadBlackMarketScannerFilters(),
  );
  const [response, setResponse] =
    useState<BlackMarketOpportunitiesResponse | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<BlackMarketOpportunity | null>(null);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const strategyAnalysis = useBlackMarketMassCraftingAnalysis({
    response,
    repository,
    filters,
  });

  useEffect(() => saveBlackMarketScannerFilters(filters), [filters]);
  useEffect(() => () => activeRequest.current?.abort(), []);

  function updateFilters(patch: Partial<BlackMarketOpportunityFilters>) {
    const normalizedPatch =
      patch.limit === undefined
        ? patch
        : { ...patch, limit: Math.min(100, Math.max(25, patch.limit)) };
    setFilters((current) => ({ ...current, ...normalizedPatch }));
    setOffset(0);
  }

  async function scan(nextOffset: number, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
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
      if (!token) {
        throw new Error("No fue posible obtener una sesión autenticada.");
      }

      const {
        salesTaxPercent,
        focusValuePerPoint: _focusValuePerPoint,
        lowerQualityFallbackPercent: _lowerQualityFallbackPercent,
        materialTransportCostPerBatch: _materialTransportCostPerBatch,
        finishedTransportCostPerUnit: _finishedTransportCostPerUnit,
        escortCostPerBatch: _escortCostPerBatch,
        deathProbabilityPercent: _deathProbabilityPercent,
        timeCostPerBatch: _timeCostPerBatch,
        strategyFilter: _strategyFilter,
        strategySort: _strategySort,
        ...requestFilters
      } = filters;
      const result = await scanBlackMarketOpportunities(
        {
          ...requestFilters,
          limit: Math.min(100, requestFilters.limit),
          salesTaxRate: salesTaxPercent / 100,
          offset: nextOffset,
        },
        token,
        controller.signal,
      );

      if (activeRequest.current !== controller) return;
      setResponse(result);
      setOffset(nextOffset);
      setStatus("success");
    } catch (scanError: unknown) {
      if (controller.signal.aborted) return;
      setError(
        scanError instanceof Error
          ? scanError.message
          : "No fue posible escanear oportunidades.",
      );
      setStatus("error");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-5 pb-14 pt-1 sm:px-6">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <span className="inline-flex rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
              Escáner Pro
            </span>
            <h2 className="mt-3 font-display text-2xl text-text">
              Oportunidades ciudad → Black Market
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
              Cruza precios de ciudades con órdenes del Black Market y, para la
              página visible, consulta materiales en batch para comparar comprar,
              fabricar sin foco y fabricar con foco. El resultado es una captura,
              no una garantía de ejecución.
            </p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted lg:max-w-sm">
            Verifica dentro del juego antes de comprar o fabricar. Las órdenes,
            los materiales y la competencia pueden cambiar mientras preparas el
            lote.
          </div>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => void scan(0, event)}
        >
          <BlackMarketScannerControls
            filters={filters}
            onChange={updateFilters}
          />
          <BlackMarketStrategyAssumptions
            filters={filters}
            onChange={updateFilters}
          />

          {error && (
            <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-faint">
              {filters.purchaseMarketKeys.length} mercados · {filters.tiers.length}{" "}
              tiers · {filters.categories.length} categorías · máximo {filters.limit}{" "}
              estrategias por página
            </p>
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-wait disabled:translate-y-0 disabled:opacity-50 sm:w-auto"
            >
              {status === "loading" && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-bg/35 border-t-bg"
                />
              )}
              {status === "loading"
                ? "Escaneando mercados..."
                : "Buscar oportunidades"}
            </button>
          </div>
        </form>
      </section>

      {response && (
        <BlackMarketOpportunityResults
          response={response}
          repository={repository}
          filters={filters}
          strategyAnalysis={strategyAnalysis}
          offset={offset}
          loading={status === "loading"}
          onOpen={setSelectedOpportunity}
          onPrevious={() => void scan(Math.max(0, offset - response.limit))}
          onNext={() => void scan(offset + response.limit)}
        />
      )}

      {selectedOpportunity && (
        <BlackMarketOpportunityDetailDialog
          opportunity={selectedOpportunity}
          qualityOpportunities={response?.data ?? []}
          filters={filters}
          server={response?.server ?? filters.server}
          repository={repository}
          onClose={() => setSelectedOpportunity(null)}
          onOpenCrafting={(item) => {
            setSelectedOpportunity(null);
            onOpenCrafting(item);
          }}
        />
      )}
    </div>
  );
}

export function BlackMarketOpportunityScannerPage({
  repository,
  onNavigate,
  onOpenCrafting,
}: BlackMarketOpportunityScannerPageProps) {
  return (
    <FeatureGate
      entitlementKey={ENTITLEMENT_KEYS.blackMarketAnalytics}
      title="Escáner comparativo del Black Market"
      description="La comparación masiva entre ciudades, fabricación y órdenes de compra del Black Market es exclusiva para cuentas Pro y se autoriza nuevamente en la API central."
      onViewPlans={() => onNavigate("plans")}
    >
      <Scanner repository={repository} onOpenCrafting={onOpenCrafting} />
    </FeatureGate>
  );
}
