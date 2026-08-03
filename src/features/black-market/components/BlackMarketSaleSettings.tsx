import { InfoHint } from "@shared/components/InfoHint";
import type {
  BlackMarketOpportunityFilters,
  BlackMarketSaleMode,
} from "../types";
import { blackMarketSaleModeLabel } from "../utils/blackMarketSaleEconomics";
import { BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME } from "./blackMarketScannerConfig";

interface BlackMarketSaleSettingsProps {
  readonly filters: BlackMarketOpportunityFilters;
  readonly onChange: (patch: Partial<BlackMarketOpportunityFilters>) => void;
}

const TAX_BY_PREMIUM = { premium: 4, standard: 8 } as const;

function numericPercent(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.min(99.99, Math.max(0, parsed)) : 0;
}

export function BlackMarketSaleSettings({
  filters,
  onChange,
}: BlackMarketSaleSettingsProps) {
  function selectMode(saleMode: BlackMarketSaleMode) {
    onChange({ saleMode });
  }

  function setPremium(isPremium: boolean) {
    onChange({
      isPremium,
      salesTaxPercent: isPremium
        ? TAX_BY_PREMIUM.premium
        : TAX_BY_PREMIUM.standard,
    });
  }

  return (
    <section className="rounded-xl border border-accent-border/55 bg-accent-muted/25 p-4 sm:p-5">
      <div className="flex flex-col gap-2 border-b border-accent-border/30 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Venta y comisiones
          </p>
          <h3 className="mt-1 text-base font-semibold text-text">
            Elige cómo vender al Black Market
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-muted">
            Beneficio y ROI se recalculan con el precio del modo seleccionado,
            impuesto de venta, setup fee y transporte. El modo activo es{" "}
            <strong className="text-text">
              {blackMarketSaleModeLabel(filters.saleMode)}
            </strong>
            .
          </p>
        </div>
        <span className="rounded-full border border-positive/35 bg-positive-muted px-3 py-1 text-[10px] font-semibold text-positive">
          Resultado neto
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(10rem,0.65fr))]">
        <fieldset>
          <legend className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            Modo de venta
            <InfoHint
              label="Modo de venta"
              text="Venta directa usa la mejor orden de compra disponible. Orden de venta usa el precio de publicación observado y descuenta además el setup fee configurado."
              align="left"
              openOnHover
              width={330}
            />
          </legend>
          <div className="mt-2 grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
            {(["direct", "sell-order"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={filters.saleMode === mode}
                onClick={() => selectMode(mode)}
                className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${
                  filters.saleMode === mode
                    ? "bg-accent text-bg shadow-sm"
                    : "text-text-muted hover:bg-surface-raised hover:text-text"
                }`}
              >
                {blackMarketSaleModeLabel(mode)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            Estado Premium
          </legend>
          <div className="mt-2 grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              aria-pressed={filters.isPremium}
              onClick={() => setPremium(true)}
              className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors ${
                filters.isPremium
                  ? "bg-positive-muted text-positive"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Premium
            </button>
            <button
              type="button"
              aria-pressed={!filters.isPremium}
              onClick={() => setPremium(false)}
              className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors ${
                !filters.isPremium
                  ? "bg-warning-muted text-warning"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Sin Premium
            </button>
          </div>
        </fieldset>

        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            Impuesto de venta
          </span>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              max={99.99}
              step={0.1}
              value={filters.salesTaxPercent}
              onChange={(event) =>
                onChange({ salesTaxPercent: numericPercent(event.target.value) })
              }
              className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-8 tabular`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-text-faint">
              %
            </span>
          </div>
        </label>

        <label>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            Setup fee
            <InfoHint
              label="Setup fee"
              text="Se descuenta solamente al publicar una orden de venta. En venta directa siempre se considera cero."
              align="left"
              openOnHover
              width={280}
            />
          </span>
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              max={99.99}
              step={0.1}
              value={filters.setupFeePercent}
              disabled={filters.saleMode === "direct"}
              onChange={(event) =>
                onChange({ setupFeePercent: numericPercent(event.target.value) })
              }
              className={`${BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME} pr-8 tabular disabled:cursor-not-allowed disabled:opacity-45`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-text-faint">
              %
            </span>
          </div>
        </label>
      </div>
    </section>
  );
}
