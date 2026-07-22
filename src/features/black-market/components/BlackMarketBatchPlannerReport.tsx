import { buildItemIconUrl, type Item } from "@core/domain/entities/Item";
import { getMarketName, type MarketDefinition } from "@features/market-data/types/MarketPrice";
import type {
  BatchManufacturingStep,
  BatchPlannerResolvedLine,
  BatchPlannerSelection,
  BatchShoppingCityGroup,
  ConsolidatedBatchMaterial,
} from "../utils/blackMarketBatchPlanner";

export interface BatchPlannerReportRow {
  readonly selection: BatchPlannerSelection;
  readonly item: Item;
  readonly line: BatchPlannerResolvedLine | null;
  readonly message: string | null;
}

export interface BatchPlannerTotals {
  readonly profit: number;
  readonly capital: number;
  readonly grossMaterials: number;
  readonly recoveredMaterials: number;
  readonly effectiveMaterials: number;
  readonly estimatedWeight: number;
}

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

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits }).format(value);
}

function formatSilver(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : `${formatNumber(Math.round(value))} plata`;
}

function formatPercent(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : `${formatNumber(value, 2)}%`;
}

function Summary({ totals }: { readonly totals: BatchPlannerTotals }) {
  const cards = [
    ["Beneficio total", formatSilver(totals.profit)],
    ["Capital requerido", formatSilver(totals.capital)],
    ["Materiales brutos", formatNumber(totals.grossMaterials, 2)],
    ["Recuperados", formatNumber(totals.recoveredMaterials, 2)],
    ["Consumo efectivo", formatNumber(totals.effectiveMaterials, 2)],
    ["Peso estimado", `${formatNumber(totals.estimatedWeight, 2)} kg`],
  ] as const;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
            {label}
          </p>
          <p className="mt-2 text-lg font-semibold text-text">{value}</p>
        </div>
      ))}
    </section>
  );
}

function ResultTable({
  rows,
  canExport,
  onExport,
}: {
  readonly rows: readonly BatchPlannerReportRow[];
  readonly canExport: boolean;
  readonly onExport: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl text-text">Resultado consolidado</h3>
          <p className="mt-1 text-xs text-text-muted">
            La confianza corresponde a la peor señal entre la compra y el Black Market.
          </p>
        </div>
        <button
          type="button"
          disabled={!canExport || rows.length === 0}
          onClick={onExport}
          className="rounded-xl border border-accent-border bg-accent-muted px-4 py-2.5 text-sm font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-45"
          title={canExport ? "Exportar reporte completo" : "Tu acceso no incluye exportaciones CSV"}
        >
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-text-faint">
            <tr>
              {[
                "Objeto",
                "Cantidad",
                "Beneficio",
                "ROI",
                "Capital",
                "Confianza",
              ].map((heading) => (
                <th key={heading} className="px-5 py-3">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={`${row.selection.itemId}@${row.selection.enchantment}:q${row.selection.quality}`} className="align-top">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={buildItemIconUrl(row.item.id, row.selection.enchantment, 56)}
                      alt=""
                      className="h-10 w-10 object-contain"
                    />
                    <div>
                      <p className="font-semibold text-text">
                        {row.item.name}{row.selection.enchantment > 0 ? ` .${row.selection.enchantment}` : ""}
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-text-faint">
                        {row.line?.strategyLabel ?? row.message}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-text-muted">{formatNumber(row.selection.quantity)}</td>
                <td className="px-5 py-4 font-semibold text-text">{formatSilver(row.line?.profit ?? null)}</td>
                <td className="px-5 py-4 text-text-muted">{formatPercent(row.line?.returnOnCostPercent ?? null)}</td>
                <td className="px-5 py-4 text-text-muted">{formatSilver(row.line?.capitalRequired ?? null)}</td>
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
  );
}

function MaterialsTable({ materials }: { readonly materials: readonly ConsolidatedBatchMaterial[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display text-xl text-text">Materiales consolidados</h3>
        <p className="mt-1 text-xs text-text-muted">Bruto, retorno estimado y consumo efectivo de las estrategias fabricadas.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-raised text-[10px] uppercase tracking-[0.12em] text-text-faint">
            <tr>
              {['Material', 'Bruto', 'Recuperado', 'Efectivo'].map((heading) => (
                <th key={heading} className="px-5 py-3">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {materials.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-text-muted">No hay materiales efectivos para comprar.</td></tr>
            ) : materials.map((material) => (
              <tr key={material.key}>
                <td className="px-5 py-3 font-medium text-text">
                  {material.name}{material.enchantment > 0 ? ` .${material.enchantment}` : ""}
                </td>
                <td className="px-5 py-3 text-text-muted">{formatNumber(material.grossQuantity, 2)}</td>
                <td className="px-5 py-3 text-positive">{formatNumber(material.recoveredQuantity, 2)}</td>
                <td className="px-5 py-3 font-semibold text-text">{formatNumber(material.effectiveQuantity, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShoppingList({
  groups,
  markets,
}: {
  readonly groups: readonly BatchShoppingCityGroup[];
  readonly markets: readonly MarketDefinition[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-xl text-text">Lista de compra por ciudad</h3>
      <p className="mt-1 text-xs text-text-muted">Cada material usa el precio disponible más bajo entre las ciudades configuradas.</p>
      <div className="mt-5 space-y-4">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">No hay materiales efectivos para comprar.</p>
        ) : groups.map((group) => (
          <div key={group.city} className="rounded-xl border border-border bg-surface-raised p-4">
            <h4 className="font-semibold text-text">{getMarketName(markets, group.city)}</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-muted">
              {group.materials.map((material) => (
                <li key={material.key} className="flex justify-between gap-4">
                  <span>{material.name}</span>
                  <span className="font-semibold text-text">{formatNumber(Math.ceil(material.effectiveQuantity))}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManufacturingOrder({ order }: { readonly order: readonly BatchManufacturingStep[] }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-xl text-text">Orden de fabricación sugerido</h3>
      <p className="mt-1 text-xs text-text-muted">Las dependencias seleccionadas se colocan antes de sus consumidores.</p>
      {order.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">No hay objetos recomendados para fabricar.</p>
      ) : (
        <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {order.map((step, index) => (
            <li key={`${step.itemId}@${step.enchantment}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-bold text-accent">{index + 1}</span>
              <div>
                <p className="text-sm font-semibold text-text">{step.name}{step.enchantment > 0 ? ` .${step.enchantment}` : ""}</p>
                <p className="text-xs text-text-faint">{formatNumber(step.quantity)} unidades</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function BlackMarketBatchPlannerReport({
  rows,
  totals,
  materials,
  shoppingGroups,
  manufacturingOrder,
  markets,
  warnings,
  canExport,
  onExport,
}: {
  readonly rows: readonly BatchPlannerReportRow[];
  readonly totals: BatchPlannerTotals;
  readonly materials: readonly ConsolidatedBatchMaterial[];
  readonly shoppingGroups: readonly BatchShoppingCityGroup[];
  readonly manufacturingOrder: readonly BatchManufacturingStep[];
  readonly markets: readonly MarketDefinition[];
  readonly warnings: readonly string[];
  readonly canExport: boolean;
  readonly onExport: () => void;
}) {
  return (
    <div className="mt-5 space-y-5">
      <Summary totals={totals} />
      <ResultTable rows={rows} canExport={canExport} onExport={onExport} />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <MaterialsTable materials={materials} />
        <ShoppingList groups={shoppingGroups} markets={markets} />
      </div>
      <ManufacturingOrder order={manufacturingOrder} />
      {warnings.length > 0 && (
        <section className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted">
          {warnings.map((warning) => <p key={warning}>• {warning}</p>)}
        </section>
      )}
    </div>
  );
}
