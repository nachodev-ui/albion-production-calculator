import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import { buildItemIconUrl, type Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import type { AppRoute } from "../../../app/types";
import { FeatureGate } from "../../account/components/FeatureGate";
import { useAccountSession } from "../../account/hooks/useAccountSession";
import { ENTITLEMENT_KEYS } from "../../account/types";
import { scanBlackMarketOpportunities } from "../api/blackMarketOpportunitiesApi";
import {
  loadBlackMarketScannerFilters,
  saveBlackMarketScannerFilters,
} from "../storage/blackMarketScannerStorage";
import { saveBlackMarketWorkspace } from "../storage/blackMarketWorkspaceStorage";
import type {
  AlbionServer,
  BlackMarketCategory,
  BlackMarketOpportunitiesResponse,
  BlackMarketOpportunity,
  BlackMarketOpportunityFilters,
  BlackMarketOpportunityRisk,
  BlackMarketOpportunitySort,
} from "../types";
import { BlackMarketPage } from "./BlackMarketPage";

interface BlackMarketOpportunityScannerPageProps {
  readonly repository: ItemRepository;
  readonly onNavigate: (route: AppRoute) => void;
}

const MARKETS = [
  { key: "bridgewatch", name: "Bridgewatch" },
  { key: "martlock", name: "Martlock" },
  { key: "lymhurst", name: "Lymhurst" },
  { key: "fort_sterling", name: "Fort Sterling" },
  { key: "thetford", name: "Thetford" },
  { key: "caerleon", name: "Caerleon" },
  { key: "brecilien", name: "Brecilien" },
] as const;

const CATEGORY_OPTIONS: readonly {
  readonly key: BlackMarketCategory;
  readonly label: string;
}[] = [
  { key: "weapon", label: "Armas" },
  { key: "armor", label: "Armaduras" },
  { key: "offhand", label: "Mano secundaria" },
  { key: "accessory", label: "Accesorios" },
];

const QUALITY_LABELS: Readonly<Record<number, string>> = {
  1: "Normal",
  2: "Buena",
  3: "Sobresaliente",
  4: "Excelente",
  5: "Obra maestra",
};

function formatSilver(value: number | null): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
        value,
      );
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatAge(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1_440)
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${Math.floor(minutes / 1_440)} d`;
}

function marketName(key: string): string {
  return MARKETS.find((market) => market.key === key)?.name ?? key;
}

function baseItemIdentifier(identifier: string): string {
  return identifier.split("@", 1)[0] ?? identifier;
}

function FieldLabel({ children }: { readonly children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
      {children}
    </span>
  );
}

function MultiChoice({
  title,
  values,
  options,
  onChange,
}: {
  readonly title: string;
  readonly values: readonly (string | number)[];
  readonly options: readonly {
    readonly value: string | number;
    readonly label: string;
  }[];
  readonly onChange: (values: readonly (string | number)[]) => void;
}) {
  function toggle(value: string | number) {
    const exists = values.includes(value);
    if (exists && values.length === 1) return;
    onChange(
      exists ? values.filter((item) => item !== value) : [...values, value],
    );
  }

  return (
    <fieldset>
      <legend>
        <FieldLabel>{title}</FieldLabel>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                selected
                  ? "border-accent-border bg-accent-muted text-accent"
                  : "border-border bg-surface-raised text-text-faint hover:text-text"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RiskBadge({ risk }: { readonly risk: BlackMarketOpportunityRisk }) {
  const styles = {
    low: "border-positive/40 bg-positive-muted text-positive",
    medium: "border-warning/40 bg-warning-muted text-warning",
    high: "border-negative/40 bg-negative-muted text-negative",
  } as const;
  const labels = { low: "Bajo", medium: "Medio", high: "Alto" } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${styles[risk]}`}
    >
      {labels[risk]}
    </span>
  );
}

function ScannerSummary({
  response,
}: {
  readonly response: BlackMarketOpportunitiesResponse;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl border border-border bg-surface-raised p-4">
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
      <article className="rounded-xl border border-border bg-surface-raised p-4">
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
      <article className="rounded-xl border border-border bg-surface-raised p-4">
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
      <article className="rounded-xl border border-border bg-surface-raised p-4">
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
  const baseID = baseItemIdentifier(opportunity.itemIdentifier);
  const item = repository.getById(baseID as Item["id"]);
  return (
    <tr className="border-t border-border/70 align-middle hover:bg-surface-raised/60">
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onOpen(opportunity)}
          className="flex min-w-[15rem] items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          <img
            src={buildItemIconUrl(
              baseID as Item["id"],
              opportunity.enchantment as EnchantmentLevel,
              64,
            )}
            alt=""
            className="h-11 w-11 rounded-lg bg-bg/45 object-contain"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text">
              {item?.name ?? opportunity.itemIdentifier}
            </span>
            <span className="text-[10px] text-text-faint">
              T{opportunity.tier}.{opportunity.enchantment} ·{" "}
              {opportunity.category}
            </span>
          </span>
        </button>
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="font-medium text-text">
          {marketName(opportunity.purchaseMarketKey)}
        </p>
        <p className="mt-1 tabular text-text-muted">
          {formatSilver(opportunity.purchaseUnitPrice)}
        </p>
        <p className="mt-0.5 text-[10px] text-text-faint">
          {QUALITY_LABELS[opportunity.purchaseQuality]} ·{" "}
          {formatAge(opportunity.purchaseAgeMinutes)}
        </p>
      </td>
      <td className="px-3 py-3 text-xs">
        <p className="font-medium tabular text-text">
          {formatSilver(opportunity.blackMarketBuyUnitPrice)}
        </p>
        <p className="mt-1 text-[10px] text-text-faint">
          {QUALITY_LABELS[opportunity.blackMarketQuality]} ·{" "}
          {formatAge(opportunity.blackMarketAgeMinutes)}
        </p>
        {opportunity.blackMarketOrderDifference !== null && (
          <p className="mt-0.5 text-[10px] text-text-faint">
            Diferencia de órdenes:{" "}
            {formatSilver(opportunity.blackMarketOrderDifference)}
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <p className="font-semibold tabular text-positive">
          {formatSilver(opportunity.profit)}
        </p>
        <p className="mt-1 text-[10px] tabular text-text-faint">
          {formatPercent(opportunity.returnOnCostPercent)} ROI
        </p>
      </td>
      <td className="px-3 py-3 text-xs">
        <RiskBadge risk={opportunity.risk} />
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
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:border-accent-border hover:text-accent"
        >
          Ver detalle
        </button>
      </td>
    </tr>
  );
}

function Scanner({
  repository,
  onOpenDetail,
}: {
  readonly repository: ItemRepository;
  readonly onOpenDetail: (
    opportunity: BlackMarketOpportunity,
    filters: BlackMarketOpportunityFilters,
  ) => void;
}) {
  const session = useAccountSession();
  const [filters, setFilters] = useState<BlackMarketOpportunityFilters>(() =>
    loadBlackMarketScannerFilters(),
  );
  const [response, setResponse] =
    useState<BlackMarketOpportunitiesResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => saveBlackMarketScannerFilters(filters), [filters]);
  useEffect(() => () => activeRequest.current?.abort(), []);

  function updateFilters(patch: Partial<BlackMarketOpportunityFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
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
      if (!token)
        throw new Error("No fue posible obtener una sesión autenticada.");
      const result = await scanBlackMarketOpportunities(
        {
          ...filters,
          salesTaxRate: filters.salesTaxPercent / 100,
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

  const hasPrevious = offset > 0;
  const hasNext =
    response !== null && offset + response.returned < response.totalMatching;
  const marketOptions = MARKETS.map((market) => ({
    value: market.key,
    label: market.name,
  }));

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
              Cruza automáticamente precios de venta de las ciudades con órdenes
              de compra del Black Market, descuenta impuesto y transporte y
              prioriza oportunidades frescas. El resultado es una captura, no
              una garantía de ejecución.
            </p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted lg:max-w-sm">
            Verifica dentro del juego antes de comprar. Una orden puede
            completarse entre la captura y tu llegada a Caerleon.
          </div>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => void scan(0, event)}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label>
              <FieldLabel>Servidor</FieldLabel>
              <select
                value={filters.server}
                onChange={(event) =>
                  updateFilters({ server: event.target.value as AlbionServer })
                }
                className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
              >
                <option value="west">West</option>
                <option value="east">East</option>
                <option value="europe">Europe</option>
              </select>
            </label>
            <label>
              <FieldLabel>Beneficio mínimo</FieldLabel>
              <input
                type="number"
                min={0}
                value={filters.minimumProfit}
                onChange={(event) =>
                  updateFilters({
                    minimumProfit: Math.max(
                      0,
                      Math.floor(Number(event.target.value) || 0),
                    ),
                  })
                }
                className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm tabular text-text"
              />
            </label>
            <label>
              <FieldLabel>ROI mínimo</FieldLabel>
              <div className="relative mt-2">
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={filters.minimumReturnOnCostPercent}
                  onChange={(event) =>
                    updateFilters({
                      minimumReturnOnCostPercent: Math.max(
                        0,
                        Number(event.target.value) || 0,
                      ),
                    })
                  }
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 pr-8 text-sm tabular text-text"
                />
                <span className="absolute right-3 top-2.5 text-sm text-text-faint">
                  %
                </span>
              </div>
            </label>
            <label>
              <FieldLabel>Ordenar por</FieldLabel>
              <select
                value={filters.sort}
                onChange={(event) =>
                  updateFilters({
                    sort: event.target.value as BlackMarketOpportunitySort,
                  })
                }
                className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
              >
                <option value="profit">Mayor beneficio</option>
                <option value="roi">Mayor ROI</option>
                <option value="freshness">Mayor frescura</option>
              </select>
            </label>
            <label>
              <FieldLabel>Resultados por página</FieldLabel>
              <select
                value={filters.limit}
                onChange={(event) =>
                  updateFilters({ limit: Number(event.target.value) })
                }
                className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 rounded-xl border border-border bg-surface-raised/55 p-4 xl:grid-cols-2">
            <MultiChoice
              title="Mercados de compra"
              values={filters.purchaseMarketKeys}
              options={marketOptions}
              onChange={(values) =>
                updateFilters({
                  purchaseMarketKeys: values as readonly string[],
                })
              }
            />
            <MultiChoice
              title="Categorías"
              values={filters.categories}
              options={CATEGORY_OPTIONS.map((category) => ({
                value: category.key,
                label: category.label,
              }))}
              onChange={(values) =>
                updateFilters({
                  categories: values as readonly BlackMarketCategory[],
                })
              }
            />
            <MultiChoice
              title="Tier"
              values={filters.tiers}
              options={[4, 5, 6, 7, 8].map((value) => ({
                value,
                label: `T${value}`,
              }))}
              onChange={(values) =>
                updateFilters({ tiers: values as readonly number[] })
              }
            />
            <MultiChoice
              title="Encantamiento"
              values={filters.enchantments}
              options={[0, 1, 2, 3, 4].map((value) => ({
                value,
                label: value === 0 ? ".0" : `.${value}`,
              }))}
              onChange={(values) =>
                updateFilters({ enchantments: values as readonly number[] })
              }
            />
            <MultiChoice
              title="Calidad de compra"
              values={filters.qualities}
              options={[1, 2, 3, 4, 5].map((value) => ({
                value,
                label: QUALITY_LABELS[value] ?? String(value),
              }))}
              onChange={(values) =>
                updateFilters({ qualities: values as readonly number[] })
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label>
                <FieldLabel>Edad ciudad</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={filters.maximumCityAgeMinutes}
                  onChange={(event) =>
                    updateFilters({
                      maximumCityAgeMinutes: Math.max(
                        1,
                        Math.floor(Number(event.target.value) || 1),
                      ),
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm tabular text-text"
                />
              </label>
              <label>
                <FieldLabel>Edad BM</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={filters.maximumBlackMarketAgeMinutes}
                  onChange={(event) =>
                    updateFilters({
                      maximumBlackMarketAgeMinutes: Math.max(
                        1,
                        Math.floor(Number(event.target.value) || 1),
                      ),
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm tabular text-text"
                />
              </label>
              <label>
                <FieldLabel>Impuesto</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={99.99}
                  step={0.1}
                  value={filters.salesTaxPercent}
                  onChange={(event) =>
                    updateFilters({
                      salesTaxPercent: Math.min(
                        99.99,
                        Math.max(0, Number(event.target.value) || 0),
                      ),
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm tabular text-text"
                />
              </label>
              <label>
                <FieldLabel>Transporte/u.</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={filters.transportCostPerUnit}
                  onChange={(event) =>
                    updateFilters({
                      transportCostPerUnit: Math.max(
                        0,
                        Math.floor(Number(event.target.value) || 0),
                      ),
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm tabular text-text"
                />
              </label>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg hover:opacity-90 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
          >
            {status === "loading"
              ? "Escaneando mercados..."
              : "Buscar oportunidades"}
          </button>
        </form>
      </section>

      {response && (
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
                      onOpen={(selected) => onOpenDetail(selected, filters)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {response.data.length === 0 && (
              <p className="border-t border-border px-5 py-12 text-center text-sm text-text-faint">
                No hay oportunidades que cumplan beneficio, ROI y frescura
                seleccionados.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={!hasPrevious || status === "loading"}
              onClick={() => void scan(Math.max(0, offset - filters.limit))}
              className="rounded-lg border border-border px-4 py-2 text-xs text-text-muted disabled:opacity-40"
            >
              Página anterior
            </button>
            <p className="text-xs tabular text-text-faint">
              {response.totalMatching === 0 ? 0 : offset + 1}–
              {offset + response.returned} de {response.totalMatching}
            </p>
            <button
              type="button"
              disabled={!hasNext || status === "loading"}
              onClick={() => void scan(offset + filters.limit)}
              className="rounded-lg border border-border px-4 py-2 text-xs text-text-muted disabled:opacity-40"
            >
              Página siguiente
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function ProtectedScanner({
  repository,
  onNavigate,
}: BlackMarketOpportunityScannerPageProps) {
  const [detailKey, setDetailKey] = useState<string | null>(null);

  function openDetail(
    opportunity: BlackMarketOpportunity,
    filters: BlackMarketOpportunityFilters,
  ) {
    const selectedItemId = baseItemIdentifier(opportunity.itemIdentifier);
    saveBlackMarketWorkspace({
      selectedItemId,
      enchantment: opportunity.enchantment,
      server: filters.server,
      purchaseMarketKey: opportunity.purchaseMarketKey,
      quality: opportunity.purchaseQuality,
      quantity: 1,
      saleUnitPriceOverride: null,
      salesTaxPercent: filters.salesTaxPercent,
      transportCost: filters.transportCostPerUnit,
      historyDays: 28,
    });
    setDetailKey(opportunity.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (detailKey) {
    return (
      <div>
        <div className="mx-auto mb-4 flex w-full max-w-7xl px-5 sm:px-6">
          <button
            type="button"
            onClick={() => setDetailKey(null)}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-text-muted hover:border-accent-border hover:text-accent"
          >
            ← Volver al escáner
          </button>
        </div>
        <BlackMarketPage
          key={detailKey}
          repository={repository}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  return <Scanner repository={repository} onOpenDetail={openDetail} />;
}

export function BlackMarketOpportunityScannerPage({
  repository,
  onNavigate,
}: BlackMarketOpportunityScannerPageProps) {
  return (
    <FeatureGate
      entitlementKey={ENTITLEMENT_KEYS.blackMarketAnalytics}
      title="Escáner comparativo del Black Market"
      description="La comparación masiva entre ciudades y órdenes de compra del Black Market es exclusiva para cuentas Pro y se autoriza nuevamente en la API central."
      onViewPlans={() => onNavigate("plans")}
    >
      <ProtectedScanner repository={repository} onNavigate={onNavigate} />
    </FeatureGate>
  );
}
