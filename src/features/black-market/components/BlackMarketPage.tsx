import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import {
  buildItemIconUrl,
  type Item,
  type ItemCategory,
} from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import type { AppRoute } from "../../../app/types";
import { FeatureGate } from "../../account/components/FeatureGate";
import { useAccountSession } from "../../account/hooks/useAccountSession";
import { ENTITLEMENT_KEYS } from "../../account/types";
import { analyzeBlackMarket } from "../api/blackMarketApi";
import {
  loadBlackMarketWorkspace,
  saveBlackMarketWorkspace,
} from "../storage/blackMarketWorkspaceStorage";
import type {
  AlbionServer,
  BlackMarketAnalysis,
  BlackMarketWorkspace,
} from "../types";

interface BlackMarketPageProps {
  readonly repository: ItemRepository;
  readonly onNavigate: (route: AppRoute) => void;
}

const SOURCE_MARKETS = [
  { key: "bridgewatch", name: "Bridgewatch" },
  { key: "martlock", name: "Martlock" },
  { key: "lymhurst", name: "Lymhurst" },
  { key: "fort_sterling", name: "Fort Sterling" },
  { key: "thetford", name: "Thetford" },
  { key: "caerleon", name: "Caerleon" },
  { key: "brecilien", name: "Brecilien" },
] as const;

const EQUIPMENT_CATEGORIES = new Set<ItemCategory>([
  "weapon",
  "armor",
  "offhand",
  "accessory",
]);

const QUALITY_LABELS: Readonly<Record<number, string>> = {
  1: "Normal",
  2: "Buena",
  3: "Sobresaliente",
  4: "Excelente",
  5: "Obra maestra",
};

function formatSilver(value: number | null): string {
  return value === null
    ? "Sin datos"
    : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number | null): string {
  return value === null
    ? "Sin datos"
    : `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin captura";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function itemIdentifier(item: Item, enchantment: number): string {
  return enchantment > 0 ? `${item.id}@${enchantment}` : item.id;
}

function normalizeWorkspace(
  workspace: BlackMarketWorkspace,
  repository: ItemRepository,
): BlackMarketWorkspace {
  if (!workspace.selectedItemId) return workspace;
  const item = repository.getById(workspace.selectedItemId as Item["id"]);
  if (!item || !EQUIPMENT_CATEGORIES.has(item.category)) {
    return { ...workspace, selectedItemId: null, enchantment: 0 };
  }
  return {
    ...workspace,
    enchantment: Math.min(workspace.enchantment, item.maxEnchantment),
  };
}

function FieldLabel({ children }: { readonly children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  positive,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly positive?: boolean | null;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface-raised p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-semibold tabular ${
          positive === true
            ? "text-positive"
            : positive === false
              ? "text-negative"
              : "text-text"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-text-faint">{detail}</p>
    </article>
  );
}

function DataFreshnessBadge({
  freshness,
}: {
  readonly freshness: "fresh" | "stale" | "missing";
}) {
  const styles = {
    fresh: "border-positive/40 bg-positive-muted text-positive",
    stale: "border-warning/40 bg-warning-muted text-warning",
    missing: "border-border bg-surface text-text-faint",
  } as const;
  const labels = {
    fresh: "Reciente",
    stale: "Antiguo",
    missing: "Sin datos",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${styles[freshness]}`}
    >
      {labels[freshness]}
    </span>
  );
}

function BlackMarketDashboard({ repository }: { readonly repository: ItemRepository }) {
  const session = useAccountSession();
  const [workspace, setWorkspace] = useState<BlackMarketWorkspace>(() =>
    normalizeWorkspace(loadBlackMarketWorkspace(), repository),
  );
  const [search, setSearch] = useState("");
  const [analysis, setAnalysis] = useState<BlackMarketAnalysis | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const selectedItem = workspace.selectedItemId
    ? repository.getById(workspace.selectedItemId as Item["id"])
    : null;

  const searchResults = useMemo(() => {
    const query = search.trim();
    if (query.length < 2) return [];
    return repository
      .searchByName(query)
      .filter(
        (item) =>
          EQUIPMENT_CATEGORIES.has(item.category) &&
          item.tier >= 4 &&
          item.recipe !== null,
      )
      .slice(0, 12);
  }, [repository, search]);

  useEffect(() => {
    saveBlackMarketWorkspace(workspace);
  }, [workspace]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );

  function updateWorkspace(patch: Partial<BlackMarketWorkspace>) {
    setWorkspace((current) => ({ ...current, ...patch }));
    setAnalysis(null);
    setError(null);
    setStatus("idle");
  }

  function selectItem(item: Item) {
    updateWorkspace({ selectedItemId: item.id, enchantment: 0 });
    setSearch("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) {
      setError("Selecciona primero un objeto de equipamiento.");
      setStatus("error");
      return;
    }
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
      const accessToken = await session.getAccessToken();
      if (!accessToken) {
        throw new Error("No fue posible obtener una sesión autenticada.");
      }
      const result = await analyzeBlackMarket(
        {
          server: workspace.server,
          purchaseMarketKey: workspace.purchaseMarketKey,
          itemIdentifier: itemIdentifier(selectedItem, workspace.enchantment),
          quality: workspace.quality,
          quantity: workspace.quantity,
          saleUnitPriceOverride: workspace.saleUnitPriceOverride,
          salesTaxRate: workspace.salesTaxPercent / 100,
          transportCost: workspace.transportCost,
          historyDays: workspace.historyDays,
        },
        accessToken,
        controller.signal,
      );
      if (activeRequest.current !== controller) return;
      setAnalysis(result);
      setStatus("success");
    } catch (requestError: unknown) {
      if (controller.signal.aborted) return;
      setAnalysis(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible analizar el Black Market.",
      );
      setStatus("error");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  const latestHistory = analysis?.history.points.slice(-14).reverse() ?? [];
  const economics = analysis?.economics ?? null;
  const profitPositive =
    economics?.profit === null || economics?.profit === undefined
      ? null
      : economics.profit >= 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-14 pt-1 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
          <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Herramienta Pro
                </span>
                <h2 className="mt-3 font-display text-2xl text-text">
                  Analiza una ruta hacia el Black Market
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                  Compara el costo de compra con la orden de compra observada en el
                  Black Market. El resultado descuenta impuesto y transporte, sin
                  inventar demanda ni probabilidad de venta.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submit}>
              <div className="relative">
                <label className="block">
                  <FieldLabel>Objeto a transportar</FieldLabel>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      selectedItem ? selectedItem.name : "Busca un arma o armadura..."
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text outline-none placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-accent-border"
                  />
                </label>
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-2xl">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectItem(item)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                      >
                        <img
                          src={buildItemIconUrl(item.id, 0, 64)}
                          alt=""
                          className="h-10 w-10 rounded-md bg-bg/40 object-contain"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-text">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-text-faint">
                            T{item.tier} · {item.category}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-3">
                  <img
                    src={buildItemIconUrl(
                      selectedItem.id,
                      workspace.enchantment as EnchantmentLevel,
                      96,
                    )}
                    alt={selectedItem.name}
                    className="h-16 w-16 rounded-lg bg-bg/45 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-text">
                      {selectedItem.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-faint">
                      T{selectedItem.tier}
                      {workspace.enchantment > 0
                        ? `.${workspace.enchantment}`
                        : ""} · {QUALITY_LABELS[workspace.quality]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateWorkspace({ selectedItemId: null, enchantment: 0 })}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:text-text"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label>
                  <FieldLabel>Servidor</FieldLabel>
                  <select
                    value={workspace.server}
                    onChange={(event) =>
                      updateWorkspace({ server: event.target.value as AlbionServer })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                  >
                    <option value="west">West</option>
                    <option value="east">East</option>
                    <option value="europe">Europe</option>
                  </select>
                </label>
                <label>
                  <FieldLabel>Mercado de compra</FieldLabel>
                  <select
                    value={workspace.purchaseMarketKey}
                    onChange={(event) =>
                      updateWorkspace({ purchaseMarketKey: event.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                  >
                    {SOURCE_MARKETS.map((market) => (
                      <option key={market.key} value={market.key}>
                        {market.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>Encantamiento</FieldLabel>
                  <select
                    value={workspace.enchantment}
                    disabled={!selectedItem}
                    onChange={(event) =>
                      updateWorkspace({ enchantment: Number(event.target.value) })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text disabled:opacity-50"
                  >
                    {Array.from(
                      { length: (selectedItem?.maxEnchantment ?? 0) + 1 },
                      (_, level) => (
                        <option key={level} value={level}>
                          {level === 0 ? "Sin encantar" : `.${level}`}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <FieldLabel>Calidad</FieldLabel>
                  <select
                    value={workspace.quality}
                    onChange={(event) =>
                      updateWorkspace({ quality: Number(event.target.value) })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                  >
                    {Object.entries(QUALITY_LABELS).map(([quality, label]) => (
                      <option key={quality} value={quality}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>Cantidad</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={1_000_000}
                    value={workspace.quantity}
                    onChange={(event) =>
                      updateWorkspace({
                        quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm tabular text-text"
                  />
                </label>
                <label>
                  <FieldLabel>Historial</FieldLabel>
                  <select
                    value={workspace.historyDays}
                    onChange={(event) =>
                      updateWorkspace({ historyDays: Number(event.target.value) })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text"
                  >
                    <option value={7}>7 días</option>
                    <option value={14}>14 días</option>
                    <option value={28}>28 días</option>
                    <option value={60}>60 días</option>
                    <option value={90}>90 días</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 rounded-xl border border-border bg-surface-raised p-4 sm:grid-cols-3">
                <label>
                  <FieldLabel>Venta esperada manual</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    placeholder="Usar orden observada"
                    value={workspace.saleUnitPriceOverride ?? ""}
                    onChange={(event) =>
                      updateWorkspace({
                        saleUnitPriceOverride:
                          event.target.value === ""
                            ? null
                            : Math.max(1, Math.floor(Number(event.target.value) || 1)),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular text-text"
                  />
                </label>
                <label>
                  <FieldLabel>Impuesto de venta</FieldLabel>
                  <div className="relative mt-2">
                    <input
                      type="number"
                      min={0}
                      max={99.99}
                      step={0.1}
                      value={workspace.salesTaxPercent}
                      onChange={(event) =>
                        updateWorkspace({
                          salesTaxPercent: Math.min(
                            99.99,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        })
                      }
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-8 text-sm tabular text-text"
                    />
                    <span className="absolute right-3 top-2.5 text-sm text-text-faint">%</span>
                  </div>
                </label>
                <label>
                  <FieldLabel>Costo de transporte</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    value={workspace.transportCost}
                    onChange={(event) =>
                      updateWorkspace({
                        transportCost: Math.max(
                          0,
                          Math.floor(Number(event.target.value) || 0),
                        ),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm tabular text-text"
                  />
                </label>
              </div>

              {error && (
                <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!selectedItem || status === "loading"}
                className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
              >
                {status === "loading" ? "Analizando datos..." : "Analizar oportunidad"}
              </button>
            </form>
          </div>

          <aside className="bg-surface-raised/45 p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-text">Lectura responsable</h3>
            <div className="mt-4 space-y-4 text-xs leading-relaxed text-text-muted">
              <p>
                El Black Market publica órdenes de compra que cambian con el tiempo.
                Esta sección compara capturas disponibles; no garantiza que la orden
                siga activa al llegar a Caerleon.
              </p>
              <p>
                El historial representa unidades observadas en buckets de mercado,
                no una promesa de venta para tu lote. Revisa siempre precio, volumen
                y antigüedad antes de transportar.
              </p>
              <p>
                El precio manual tiene prioridad y queda claramente identificado en
                el resultado. Úsalo para simular una orden vista dentro del juego
                cuando la base central aún no la tenga.
              </p>
            </div>

            {analysis && (
              <div className="mt-6 space-y-3 border-t border-border pt-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">Compra</span>
                  <DataFreshnessBadge freshness={analysis.purchase.freshness} />
                </div>
                <p className="text-xs text-text-faint">
                  {formatDate(analysis.purchase.priceDate)}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">Black Market</span>
                  <DataFreshnessBadge freshness={analysis.blackMarket.freshness} />
                </div>
                <p className="text-xs text-text-faint">
                  {formatDate(analysis.blackMarket.priceDate)}
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      {analysis && economics && (
        <section className="mt-6 space-y-5">
          {analysis.warnings.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning-muted p-4">
              <h3 className="text-sm font-semibold text-warning">
                Datos que debes revisar
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
                {analysis.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Compra unitaria"
              value={`${formatSilver(economics.purchaseUnitPrice)} plata`}
              detail={`Precio mínimo de venta en ${SOURCE_MARKETS.find((market) => market.key === analysis.purchaseMarketKey)?.name ?? analysis.purchaseMarketKey}.`}
            />
            <MetricCard
              label="Venta unitaria"
              value={`${formatSilver(economics.saleUnitPrice)} plata`}
              detail={
                economics.salePriceSource === "manual"
                  ? "Escenario manual ingresado por ti."
                  : economics.salePriceSource === "black-market-buy-order"
                    ? "Mejor orden de compra observada en Black Market."
                    : "Sin orden de compra disponible."
              }
            />
            <MetricCard
              label="Beneficio neto"
              value={`${formatSilver(economics.profit)} plata`}
              detail={`${formatSilver(economics.profitPerUnit)} plata por unidad después de impuesto y transporte.`}
              positive={profitPositive}
            />
            <MetricCard
              label="Retorno sobre costo"
              value={formatPercent(economics.returnOnCostPercent)}
              detail={`Margen sobre ingreso: ${formatPercent(economics.marginPercent)}.`}
              positive={profitPositive}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold text-text">Desglose económico</h3>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Costo de compra", economics.purchaseCost],
                  ["Ingreso bruto", economics.grossRevenue],
                  ["Impuesto", economics.salesTax],
                  ["Transporte", economics.transportCost],
                  ["Ingreso neto", economics.netRevenue],
                  ["Punto de equilibrio unitario", economics.breakEvenUnitPrice],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-text-muted">{label}</dt>
                    <dd className="font-medium tabular text-text">
                      {formatSilver(value as number | null)} plata
                    </dd>
                  </div>
                ))}
              </dl>
            </article>

            <article className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    Historial del Black Market
                  </h3>
                  <p className="mt-1 text-xs text-text-faint">
                    {analysis.history.soldUnits.toLocaleString("es-CL")} unidades en {analysis.history.bucketCount} buckets de los últimos {analysis.history.rangeDays} días.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wide text-text-faint">
                    Promedio ponderado
                  </p>
                  <p className="text-sm font-semibold tabular text-text">
                    {formatSilver(analysis.history.weightedAverageUnitPrice)} plata
                  </p>
                </div>
              </div>

              {latestHistory.length === 0 ? (
                <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-text-faint">
                  Aún no existen buckets centrales para este objeto y calidad.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-text-faint">
                      <tr>
                        <th className="pb-2 font-medium">Fecha</th>
                        <th className="pb-2 text-right font-medium">Unidades</th>
                        <th className="pb-2 text-right font-medium">Precio medio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestHistory.map((point) => (
                        <tr key={point.timestamp} className="border-t border-border/70">
                          <td className="py-2.5 text-text-muted">
                            {new Intl.DateTimeFormat("es-CL", {
                              dateStyle: "medium",
                            }).format(new Date(point.timestamp))}
                          </td>
                          <td className="py-2.5 text-right tabular text-text">
                            {point.itemCount.toLocaleString("es-CL")}
                          </td>
                          <td className="py-2.5 text-right tabular text-text">
                            {formatSilver(point.averageUnitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </div>
        </section>
      )}
    </div>
  );
}

export function BlackMarketPage({ repository, onNavigate }: BlackMarketPageProps) {
  return (
    <FeatureGate
      entitlementKey={ENTITLEMENT_KEYS.blackMarketAnalytics}
      title="Black Market Analytics"
      description="El análisis de compra, órdenes del Black Market, historial y rentabilidad está disponible exclusivamente para cuentas Pro. La autorización se valida nuevamente en la API central."
      onViewPlans={() => onNavigate("plans")}
      fallback={
        <div className="mx-auto w-full max-w-5xl px-5 pb-14 pt-2 sm:px-6">
          <FeatureGate
            entitlementKey={ENTITLEMENT_KEYS.blackMarketAnalytics}
            title="Black Market Analytics · Pro"
            description="Compara mercados de compra, orden de compra del Black Market, impuesto, transporte, beneficio, ROI e historial desde una sección dedicada y protegida por la API."
            onViewPlans={() => onNavigate("plans")}
          >
            <span />
          </FeatureGate>
        </div>
      }
    >
      <BlackMarketDashboard repository={repository} />
    </FeatureGate>
  );
}
