import type { BlackMarketOpportunity } from "../types";
import type { BlackMarketCraftingEconomics } from "../utils/blackMarketCraftingComparison";
import {
  formatBlackMarketSilver,
} from "./blackMarketScannerConfig";

interface BlackMarketCraftingEconomicsCardsProps {
  readonly economics: BlackMarketCraftingEconomics;
  readonly opportunity: BlackMarketOpportunity;
  readonly quantity: number;
}

function formatSignedSilver(value: number): string {
  return `${value > 0 ? "+" : ""}${formatBlackMarketSilver(value)}`;
}

function EconomicRow({
  label,
  value,
  strong = false,
  positive = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
  readonly positive?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-2.5 text-sm ${
        strong ? "border-t border-border pt-3 font-semibold" : ""
      }`}
    >
      <span className={strong ? "text-text" : "text-text-muted"}>{label}</span>
      <span
        className={`tabular ${
          positive ? "text-positive" : strong ? "text-text" : "text-text-muted"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function BlackMarketCraftingEconomicsCards({
  economics,
  opportunity,
  quantity,
}: BlackMarketCraftingEconomicsCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
        <h3 className="text-sm font-semibold text-text">
          Costo efectivo de fabricación
        </h3>
        <div className="mt-2 divide-y divide-border/70">
          <EconomicRow
            label="Costo bruto de materiales"
            value={formatBlackMarketSilver(economics.grossMaterialCost)}
          />
          <EconomicRow
            label="Materiales recuperados por RRR"
            value={`−${formatBlackMarketSilver(
              economics.recoveredMaterialValue,
            )}`}
            positive
          />
          <EconomicRow
            label="Tarifas de estación"
            value={`+${formatBlackMarketSilver(economics.stationFees)}`}
          />
          <EconomicRow
            label="Costo real de fabricación"
            value={formatBlackMarketSilver(economics.effectiveCraftCost)}
            strong
          />
        </div>
      </article>

      <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
        <h3 className="text-sm font-semibold text-text">
          Venta del lote al Black Market
        </h3>
        <div className="mt-2 divide-y divide-border/70">
          <EconomicRow
            label="Orden de compra"
            value={formatBlackMarketSilver(
              opportunity.blackMarketBuyUnitPrice * quantity,
            )}
          />
          <EconomicRow
            label="Impuesto estimado"
            value={`−${formatBlackMarketSilver(economics.estimatedSalesTax)}`}
          />
          <EconomicRow
            label="Transporte"
            value={`−${formatBlackMarketSilver(economics.transportCostTotal)}`}
          />
          <EconomicRow
            label="Beneficio neto del lote"
            value={
              economics.profit === null
                ? "Datos incompletos"
                : formatSignedSilver(economics.profit)
            }
            strong
            positive={(economics.profit ?? 0) > 0}
          />
        </div>
      </article>
    </div>
  );
}
