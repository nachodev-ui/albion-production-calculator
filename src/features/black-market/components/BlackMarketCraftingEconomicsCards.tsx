import type { BlackMarketOpportunity } from "../types";
import type {
  BlackMarketCraftingEconomics,
  BlackMarketFocusValuation,
} from "../utils/blackMarketCraftingComparison";
import {
  formatBlackMarketPercent,
  formatBlackMarketSilver,
} from "./blackMarketScannerConfig";

interface BlackMarketCraftingEconomicsCardsProps {
  readonly economics: BlackMarketCraftingEconomics;
  readonly focusValuation: BlackMarketFocusValuation;
  readonly opportunity: BlackMarketOpportunity;
  readonly quantity: number;
}

function formatSignedSilver(value: number): string {
  return `${value > 0 ? "+" : ""}${formatBlackMarketSilver(value)}`;
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits }).format(value);
}

function formatProbability(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}

function EconomicRow({
  label,
  value,
  strong = false,
  positive = false,
  warning = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
  readonly positive?: boolean;
  readonly warning?: boolean;
}) {
  const valueClassName = positive
    ? "text-positive"
    : warning
      ? "text-warning"
      : strong
        ? "text-text"
        : "text-text-muted";

  return (
    <div
      className={`flex items-center justify-between gap-4 py-2.5 text-sm ${
        strong ? "border-t border-border pt-3 font-semibold" : ""
      }`}
    >
      <span className={strong ? "text-text" : "text-text-muted"}>{label}</span>
      <span className={`text-right tabular ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function BlackMarketCraftingEconomicsCards({
  economics,
  focusValuation,
  opportunity,
  quantity,
}: BlackMarketCraftingEconomicsCardsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
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
          Calidad e ingreso esperado
        </h3>
        <div className="mt-2 divide-y divide-border/70">
          <EconomicRow
            label="Probabilidad de cumplir la orden"
            value={formatProbability(economics.qualitySuccessProbability)}
            warning={economics.qualitySuccessProbability < 0.5}
          />
          <EconomicRow
            label="Unidades esperadas para calidad objetivo"
            value={`${formatNumber(economics.expectedTargetUnits)} de ${quantity}`}
          />
          <EconomicRow
            label="Unidades esperadas en calidades alternativas"
            value={formatNumber(economics.expectedAlternativeUnits)}
          />
          <EconomicRow
            label="Ingreso de la orden objetivo"
            value={
              economics.expectedTargetRevenue === null
                ? "Datos incompletos"
                : formatBlackMarketSilver(economics.expectedTargetRevenue)
            }
          />
          <EconomicRow
            label="Ingreso alternativo por otras calidades"
            value={
              economics.expectedAlternativeRevenue === null
                ? "Datos incompletos"
                : formatBlackMarketSilver(economics.expectedAlternativeRevenue)
            }
          />
          <EconomicRow
            label="Ingreso bruto ponderado"
            value={
              economics.expectedGrossRevenue === null
                ? "Datos incompletos"
                : formatBlackMarketSilver(economics.expectedGrossRevenue)
            }
            strong
          />
        </div>
      </article>

      <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
        <h3 className="text-sm font-semibold text-text">
          Logística y beneficio contable
        </h3>
        <div className="mt-2 divide-y divide-border/70">
          <EconomicRow
            label="Materiales hacia fabricación"
            value={`−${formatBlackMarketSilver(
              economics.materialTransportCostTotal,
            )}`}
          />
          <EconomicRow
            label="Objetos fabricados hacia Caerleon"
            value={`−${formatBlackMarketSilver(
              economics.finishedTransportCostTotal,
            )}`}
          />
          <EconomicRow
            label="Escolta y protección"
            value={`−${formatBlackMarketSilver(economics.escortCostTotal)}`}
          />
          <EconomicRow
            label="Impuesto estimado"
            value={
              economics.estimatedSalesTax === null
                ? "Datos incompletos"
                : `−${formatBlackMarketSilver(economics.estimatedSalesTax)}`
            }
          />
          <EconomicRow
            label="Beneficio contable"
            value={
              economics.accountingProfit === null
                ? "Datos incompletos"
                : formatSignedSilver(economics.accountingProfit)
            }
            positive={(economics.accountingProfit ?? 0) > 0}
          />
          <EconomicRow
            label="ROI contable"
            value={
              economics.returnOnCostPercent === null
                ? "Datos incompletos"
                : formatBlackMarketPercent(economics.returnOnCostPercent)
            }
            strong
            positive={(economics.returnOnCostPercent ?? 0) > 0}
          />
        </div>
      </article>

      <article className="rounded-xl border border-accent-border/35 bg-accent-muted/15 p-4">
        <h3 className="text-sm font-semibold text-text">
          Ajuste económico de foco y riesgo
        </h3>
        <div className="mt-2 divide-y divide-border/70">
          <EconomicRow
            label="Foco requerido"
            value={formatNumber(economics.focusRequired, 0)}
          />
          <EconomicRow
            label="Beneficio adicional gracias al foco"
            value={
              focusValuation.incrementalAccountingProfit === null
                ? "No disponible"
                : formatSignedSilver(
                    focusValuation.incrementalAccountingProfit,
                  )
            }
          />
          <EconomicRow
            label="Plata obtenida por punto de foco"
            value={
              focusValuation.silverPerFocus === null
                ? "No disponible"
                : formatNumber(focusValuation.silverPerFocus)
            }
            warning={focusValuation.clearsConfiguredValue === false}
            positive={focusValuation.clearsConfiguredValue === true}
          />
          <EconomicRow
            label="Costo de oportunidad del foco"
            value={`−${formatBlackMarketSilver(
              economics.focusOpportunityCost,
            )}`}
          />
          <EconomicRow
            label={`Pérdida esperada por muerte (${formatProbability(
              economics.deathProbabilityRate,
            )})`}
            value={`−${formatBlackMarketSilver(economics.expectedDeathLoss)}`}
          />
          <EconomicRow
            label="Costo del tiempo"
            value={`−${formatBlackMarketSilver(economics.timeCostTotal)}`}
          />
          <EconomicRow
            label="Beneficio ajustado"
            value={
              economics.adjustedProfit === null
                ? "Datos incompletos"
                : formatSignedSilver(economics.adjustedProfit)
            }
            positive={(economics.adjustedProfit ?? 0) > 0}
          />
          <EconomicRow
            label="Ventaja ajustada frente a comprar"
            value={
              economics.advantageOverBuying === null
                ? "Datos incompletos"
                : formatSignedSilver(economics.advantageOverBuying)
            }
            strong
            positive={(economics.advantageOverBuying ?? 0) > 0}
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
          La referencia de compra terminada conserva el beneficio de la orden
          observada: {formatBlackMarketSilver(opportunity.profit)} plata por
          unidad. El ajuste económico no modifica la orden; solo explicita los
          costos de oportunidad configurados.
        </p>
      </article>
    </div>
  );
}
