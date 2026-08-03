import { useEffect, useMemo } from "react";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import { buildItemIconUrl, type Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import { InfoHint } from "@shared/components/InfoHint";
import type {
  AlbionServer,
  BlackMarketOpportunity,
  BlackMarketOpportunityFilters,
} from "../types";
import {
  blackMarketSaleModeLabel,
  calculateOpportunitySaleEconomics,
  selectedBlackMarketUnitPrice,
} from "../utils/blackMarketSaleEconomics";
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
import { BlackMarketStrategyComparison } from "./BlackMarketStrategyComparison";

interface BlackMarketOpportunityDetailDialogProps {
  readonly opportunity: BlackMarketOpportunity;
  readonly qualityOpportunities: readonly BlackMarketOpportunity[];
  readonly filters: BlackMarketOpportunityFilters;
  readonly server: AlbionServer;
  readonly repository: ItemRepository;
  readonly onClose: () => void;
  readonly onOpenCrafting: (item: Item) => void;
}

function DetailMetric({
  label,
  value,
  emphasis = "default",
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasis?: "default" | "positive" | "warning";
}) {
  const valueClassName =
    emphasis === "positive"
      ? "text-positive"
      : emphasis === "warning"
        ? "text-warning"
        : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">{label}</p>
      <p className={`mt-2 text-xl font-semibold tabular ${valueClassName}`}>{value}</p>
    </div>
  );
}

function BreakdownRow({
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
    <div className={`flex items-center justify-between gap-4 py-2.5 text-sm ${strong ? "border-t border-border pt-3 font-semibold" : ""}`}>
      <span className={strong ? "text-text" : "text-text-muted"}>{label}</span>
      <span className={`tabular ${positive ? "text-positive" : strong ? "text-text" : "text-text-muted"}`}>{value}</span>
    </div>
  );
}

function saleAgeMinutes(opportunity: BlackMarketOpportunity, useSellOrder: boolean): number | null {
  if (!useSellOrder) return opportunity.blackMarketAgeMinutes;
  if (!opportunity.blackMarketSellPriceDate) return null;
  const timestamp = Date.parse(opportunity.blackMarketSellPriceDate);
  return Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
    : null;
}

export function BlackMarketOpportunityDetailDialog({
  opportunity,
  qualityOpportunities,
  filters,
  server,
  repository,
  onClose,
  onOpenCrafting,
}: BlackMarketOpportunityDetailDialogProps) {
  const baseID = baseBlackMarketItemIdentifier(opportunity.itemIdentifier);
  const item = repository.getById(baseID as Item["id"]);
  const titleId = "black-market-opportunity-detail-title";
  const saleEconomics = calculateOpportunitySaleEconomics(opportunity, {
    saleMode: filters.saleMode,
    salesTaxPercent: filters.salesTaxPercent,
    setupFeePercent: filters.setupFeePercent,
    transportCostPerUnit: filters.transportCostPerUnit,
  });
  const selectedUnitPrice = selectedBlackMarketUnitPrice(opportunity, filters.saleMode);
  const effectiveFeePercent =
    filters.salesTaxPercent +
    (filters.saleMode === "sell-order" ? filters.setupFeePercent : 0);
  const strategyOpportunity = useMemo<BlackMarketOpportunity>(
    () => ({
      ...opportunity,
      blackMarketBuyUnitPrice: selectedUnitPrice ?? 0,
      estimatedSalesTax: (saleEconomics.salesTax ?? 0) + (saleEconomics.setupFee ?? 0),
      netUnitRevenue: saleEconomics.netRevenue ?? 0,
      profit: saleEconomics.profitPerUnit ?? -1_000_000_000_000_000,
      marginPercent: saleEconomics.marginPercent ?? 0,
      returnOnCostPercent: saleEconomics.returnOnCostPercent ?? 0,
      breakEvenUnitPrice: saleEconomics.breakEvenUnitPrice ?? 0,
    }),
    [opportunity, saleEconomics, selectedUnitPrice],
  );
  const strategyQualityOpportunities = useMemo(
    () =>
      qualityOpportunities.map((candidate) => ({
        ...candidate,
        blackMarketBuyUnitPrice:
          selectedBlackMarketUnitPrice(candidate, filters.saleMode) ?? 0,
      })),
    [filters.saleMode, qualityOpportunities],
  );
  const strategyFilters = useMemo(
    () => ({ ...filters, salesTaxPercent: effectiveFeePercent }),
    [effectiveFeePercent, filters],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedAge = saleAgeMinutes(opportunity, filters.saleMode === "sell-order");
  const buyContent = (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DetailMetric
          label="Beneficio neto por unidad"
          value={saleEconomics.profitPerUnit === null ? "No disponible" : `${formatBlackMarketSilver(saleEconomics.profitPerUnit)} plata`}
          emphasis={saleEconomics.profitPerUnit === null ? "warning" : "positive"}
        />
        <DetailMetric
          label="ROI neto ajustado"
          value={saleEconomics.returnOnCostPercent === null ? "No disponible" : formatBlackMarketPercent(saleEconomics.returnOnCostPercent)}
          emphasis={saleEconomics.returnOnCostPercent === null ? "warning" : "positive"}
        />
        <DetailMetric
          label="Ingreso neto"
          value={saleEconomics.netRevenue === null ? "No disponible" : formatBlackMarketSilver(saleEconomics.netRevenue)}
        />
        <DetailMetric
          label="Precio de equilibrio"
          value={saleEconomics.breakEvenUnitPrice === null ? "No disponible" : formatBlackMarketSilver(saleEconomics.breakEvenUnitPrice)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface-raised/55 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">Compra en ciudad</p>
              <h3 className="mt-1 text-base font-semibold text-text">{blackMarketScannerMarketName(opportunity.purchaseMarketKey)}</h3>
            </div>
            <BlackMarketQualityBadge quality={opportunity.purchaseQuality} />
          </div>
          <p className="mt-4 text-2xl font-semibold tabular text-text">{formatBlackMarketSilver(opportunity.purchaseUnitPrice)}</p>
          <p className="mt-1 text-xs text-text-faint">Precio por unidad · {formatBlackMarketAge(opportunity.purchaseAgeMinutes)} de antigüedad</p>
          <BlackMarketDataConfidenceBadge
            label="Evidencia de compra"
            evidence={{
              ageMinutes: opportunity.purchaseAgeMinutes,
              unitPrice: opportunity.purchaseUnitPrice,
              observations7d: opportunity.purchaseHistoryObservations7d,
              volume7d: opportunity.purchaseHistoryVolume7d,
              medianPrice7d: opportunity.purchaseMedianPrice7d,
              buyPrice: opportunity.purchaseBuyUnitPrice,
              sellPrice: opportunity.purchaseUnitPrice,
            }}
          />
        </article>

        <article className="rounded-xl border border-accent-border/40 bg-accent-muted/35 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">Venta en Black Market</p>
              <h3 className="mt-1 text-base font-semibold text-text">Precios por modo</h3>
            </div>
            <BlackMarketQualityBadge quality={opportunity.blackMarketQuality} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border p-3 ${filters.saleMode === "direct" ? "border-accent bg-surface shadow-sm" : "border-border bg-surface/55"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Venta directa</p>
              <p className="mt-2 text-xl font-semibold tabular text-text">{formatBlackMarketSilver(opportunity.blackMarketBuyUnitPrice)}</p>
              <p className="mt-1 text-[10px] text-text-faint">Mejor orden de compra</p>
            </div>
            <div className={`rounded-xl border p-3 ${filters.saleMode === "sell-order" ? "border-accent bg-surface shadow-sm" : "border-border bg-surface/55"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">Orden de venta</p>
              <p className="mt-2 text-xl font-semibold tabular text-text">
                {opportunity.blackMarketSellUnitPrice === null ? "Sin precio" : formatBlackMarketSilver(opportunity.blackMarketSellUnitPrice)}
              </p>
              <p className="mt-1 text-[10px] text-text-faint">Publicación observada</p>
            </div>
          </div>
          <p className="mt-3 rounded-lg border border-accent-border/40 bg-accent-muted px-3 py-2 text-xs font-medium text-accent">
            Usado para el cálculo: {blackMarketSaleModeLabel(filters.saleMode)}
          </p>
          <p className="mt-2 text-[10px] text-text-faint">
            {selectedAge === null ? "Fecha del modo seleccionado no disponible" : `${formatBlackMarketAge(selectedAge)} de antigüedad`}
          </p>
          <BlackMarketDataConfidenceBadge
            label="Evidencia Black Market"
            evidence={{
              ageMinutes: selectedAge,
              unitPrice: selectedUnitPrice,
              observations7d: opportunity.blackMarketHistoryObservations7d,
              volume7d: opportunity.blackMarketHistoryVolume7d,
              medianPrice7d: opportunity.blackMarketMedianPrice7d,
              buyPrice: opportunity.blackMarketBuyUnitPrice,
              sellPrice: opportunity.blackMarketSellUnitPrice,
            }}
          />
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text">Desglose financiero transparente</h3>
            <InfoHint
              label="Desglose financiero"
              text="El ingreso neto descuenta el impuesto de venta y, solo al publicar una orden, el setup fee. Beneficio neto descuenta además compra y transporte."
              align="left"
              openOnHover
              width={350}
            />
          </div>
          {saleEconomics.available ? (
            <div className="mt-2 divide-y divide-border/70">
              <BreakdownRow label="Modo de venta" value={blackMarketSaleModeLabel(filters.saleMode)} />
              <BreakdownRow label="Precio unitario usado" value={formatBlackMarketSilver(saleEconomics.selectedUnitPrice)} />
              <BreakdownRow label="Ingreso bruto" value={formatBlackMarketSilver(saleEconomics.grossRevenue)} />
              <BreakdownRow label={`Impuesto de venta (${filters.salesTaxPercent}%)`} value={`−${formatBlackMarketSilver(saleEconomics.salesTax)}`} />
              <BreakdownRow label={`Setup fee (${filters.saleMode === "sell-order" ? filters.setupFeePercent : 0}%)`} value={`−${formatBlackMarketSilver(saleEconomics.setupFee)}`} />
              <BreakdownRow label="Ingreso neto" value={formatBlackMarketSilver(saleEconomics.netRevenue)} strong />
              <BreakdownRow label="Costo de compra" value={`−${formatBlackMarketSilver(saleEconomics.purchaseCost)}`} />
              <BreakdownRow label="Transporte" value={`−${formatBlackMarketSilver(saleEconomics.transportCost)}`} />
              <BreakdownRow label="Costo total" value={formatBlackMarketSilver(saleEconomics.totalCost)} />
              <BreakdownRow label="Beneficio neto" value={formatBlackMarketSilver(saleEconomics.profit)} strong positive={(saleEconomics.profit ?? 0) >= 0} />
              <BreakdownRow label="ROI neto ajustado" value={formatBlackMarketPercent(saleEconomics.returnOnCostPercent ?? 0)} strong positive={(saleEconomics.returnOnCostPercent ?? 0) >= 0} />
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-warning/35 bg-warning-muted p-4 text-sm text-warning">
              No existe un precio válido para {blackMarketSaleModeLabel(filters.saleMode).toLowerCase()} en esta captura. Cambia el modo o actualiza los datos.
            </p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
          <h3 className="text-sm font-semibold text-text">Riesgos y competencia</h3>
          {opportunity.riskReasons.length > 0 ? (
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-muted">
              {opportunity.riskReasons.map((reason) => <li key={reason} className="flex gap-2"><span aria-hidden="true" className="mt-0.5 text-warning">•</span><span>{reason}</span></li>)}
            </ul>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-text-faint">No se detectaron advertencias adicionales para esta captura.</p>
          )}
          {opportunity.caerleonCompetition.available && (
            <div className="mt-4 rounded-lg border border-warning/30 bg-warning-muted p-3 text-xs leading-relaxed text-text-muted">
              <p className="font-medium text-warning">Competencia desde Caerleon</p>
              <p className="mt-1">Precio observado: {formatBlackMarketSilver(opportunity.caerleonCompetition.purchaseUnitPrice)} · antigüedad {formatBlackMarketAge(opportunity.caerleonCompetition.ageMinutes)}.</p>
            </div>
          )}
        </article>
      </div>

      <p className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted">
        Confirma precio, calidad y modo de venta dentro del juego antes de comprar. Las órdenes pueden cambiar durante el traslado.
      </p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-bg/85 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="mx-auto my-3 w-full max-w-6xl overflow-hidden rounded-2xl border border-accent-border/60 bg-surface shadow-2xl sm:my-8">
        <header className="flex items-start gap-4 border-b border-border bg-surface-raised/70 p-4 sm:p-6">
          <img
            src={buildItemIconUrl(baseID as Item["id"], opportunity.enchantment as EnchantmentLevel, 96)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl bg-bg/45 object-contain sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-accent">Comparación de estrategias</span>
              <BlackMarketQualityBadge quality={opportunity.blackMarketQuality} />
              <BlackMarketRiskBadge risk={opportunity.risk} />
            </div>
            <h2 id={titleId} className="mt-3 truncate font-display text-xl text-text sm:text-2xl">{item?.name ?? opportunity.itemIdentifier}</h2>
            <p className="mt-1 text-sm font-medium text-text-muted">
              T{opportunity.tier}.{opportunity.enchantment} · {blackMarketScannerCategoryName(opportunity.category)} · calidad objetivo destacada arriba
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Compara compra terminada y fabricación usando {blackMarketSaleModeLabel(filters.saleMode).toLowerCase()}, con impuestos y comisiones netas.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-lg text-text-muted transition-colors hover:border-accent-border hover:bg-accent-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border">×</button>
        </header>

        <BlackMarketStrategyComparison
          item={item}
          enchantment={opportunity.enchantment as EnchantmentLevel}
          server={server}
          opportunity={strategyOpportunity}
          qualityOpportunities={strategyQualityOpportunities}
          filters={strategyFilters}
          repository={repository}
          buyContent={buyContent}
          onOpenCrafting={onOpenCrafting}
        />
      </section>
    </div>
  );
}
