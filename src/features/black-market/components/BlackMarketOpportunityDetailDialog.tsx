import { useEffect } from "react";
import type { EnchantmentLevel } from "@core/domain/entities/Enchantment";
import { buildItemIconUrl, type Item } from "@core/domain/entities/Item";
import type { ItemRepository } from "@core/domain/repositories/ItemRepository";
import { InfoHint } from "@shared/components/InfoHint";
import type { BlackMarketOpportunity } from "../types";
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

interface BlackMarketOpportunityDetailDialogProps {
  readonly opportunity: BlackMarketOpportunity;
  readonly repository: ItemRepository;
  readonly onClose: () => void;
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold tabular ${valueClassName}`}>
        {value}
      </p>
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

export function BlackMarketOpportunityDetailDialog({
  opportunity,
  repository,
  onClose,
}: BlackMarketOpportunityDetailDialogProps) {
  const baseID = baseBlackMarketItemIdentifier(opportunity.itemIdentifier);
  const item = repository.getById(baseID as Item["id"]);
  const titleId = "black-market-opportunity-detail-title";

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

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-bg/85 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mx-auto my-3 w-full max-w-5xl overflow-hidden rounded-2xl border border-accent-border/60 bg-surface shadow-2xl sm:my-8"
      >
        <header className="flex items-start gap-4 border-b border-border bg-surface-raised/70 p-4 sm:p-6">
          <img
            src={buildItemIconUrl(
              baseID as Item["id"],
              opportunity.enchantment as EnchantmentLevel,
              96,
            )}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl bg-bg/45 object-contain sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-accent">
                Detalle de oportunidad
              </span>
              <BlackMarketRiskBadge risk={opportunity.risk} />
            </div>
            <h2
              id={titleId}
              className="mt-3 truncate font-display text-xl text-text sm:text-2xl"
            >
              {item?.name ?? opportunity.itemIdentifier}
            </h2>
            <p className="mt-1 text-xs text-text-faint">
              T{opportunity.tier}.{opportunity.enchantment} · {" "}
              {blackMarketScannerCategoryName(opportunity.category)} · {" "}
              {BLACK_MARKET_QUALITY_LABELS[opportunity.purchaseQuality]}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Comprar en {blackMarketScannerMarketName(opportunity.purchaseMarketKey)} y vender a la orden de compra del Black Market.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-lg text-text-muted transition-colors hover:border-accent-border hover:bg-accent-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            ×
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailMetric
              label="Beneficio por unidad"
              value={`${formatBlackMarketSilver(opportunity.profit)} plata`}
              emphasis="positive"
            />
            <DetailMetric
              label="Retorno sobre costo"
              value={formatBlackMarketPercent(
                opportunity.returnOnCostPercent,
              )}
              emphasis="positive"
            />
            <DetailMetric
              label="Margen neto"
              value={formatBlackMarketPercent(opportunity.marginPercent)}
            />
            <DetailMetric
              label="Precio de equilibrio"
              value={formatBlackMarketSilver(opportunity.breakEvenUnitPrice)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-border bg-surface-raised/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    Compra en ciudad
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-text">
                    {blackMarketScannerMarketName(
                      opportunity.purchaseMarketKey,
                    )}
                  </h3>
                </div>
                <span className="rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-text-muted">
                  {formatBlackMarketAge(opportunity.purchaseAgeMinutes)} de antigüedad
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tabular text-text">
                {formatBlackMarketSilver(opportunity.purchaseUnitPrice)}
              </p>
              <p className="mt-1 text-xs text-text-faint">
                Calidad {BLACK_MARKET_QUALITY_LABELS[opportunity.purchaseQuality]} · precio por unidad
              </p>
            </article>

            <article className="rounded-xl border border-accent-border/40 bg-accent-muted/35 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    Venta en Black Market
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-text">
                    Orden de compra observada
                  </h3>
                </div>
                <span className="rounded-full border border-accent-border/50 bg-surface px-2 py-1 text-[10px] text-accent">
                  {formatBlackMarketAge(opportunity.blackMarketAgeMinutes)} de antigüedad
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tabular text-accent">
                {formatBlackMarketSilver(opportunity.blackMarketBuyUnitPrice)}
              </p>
              <p className="mt-1 text-xs text-text-faint">
                Calidad {BLACK_MARKET_QUALITY_LABELS[opportunity.blackMarketQuality]} · precio por unidad
              </p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text">
                  Desglose por unidad
                </h3>
                <InfoHint
                  label="Desglose por unidad"
                  text="Todos los importes se calculan para una unidad. El beneficio descuenta el impuesto estimado y el transporte configurado en el escáner."
                  align="left"
                  openOnHover
                />
              </div>
              <div className="mt-2 divide-y divide-border/70">
                <BreakdownRow
                  label="Costo de compra"
                  value={formatBlackMarketSilver(opportunity.purchaseUnitPrice)}
                />
                <BreakdownRow
                  label="Orden de compra Black Market"
                  value={formatBlackMarketSilver(
                    opportunity.blackMarketBuyUnitPrice,
                  )}
                />
                <BreakdownRow
                  label="Impuesto estimado"
                  value={`−${formatBlackMarketSilver(opportunity.estimatedSalesTax)}`}
                />
                <BreakdownRow
                  label="Transporte estimado"
                  value={`−${formatBlackMarketSilver(opportunity.transportCostPerUnit)}`}
                />
                <BreakdownRow
                  label="Ingreso neto"
                  value={formatBlackMarketSilver(opportunity.netUnitRevenue)}
                />
                <BreakdownRow
                  label="Beneficio"
                  value={formatBlackMarketSilver(opportunity.profit)}
                  strong
                  positive
                />
              </div>
            </article>

            <article className="rounded-xl border border-border bg-surface-raised/45 p-4">
              <h3 className="text-sm font-semibold text-text">
                Riesgos y competencia
              </h3>
              {opportunity.riskReasons.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-muted">
                  {opportunity.riskReasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span aria-hidden="true" className="mt-0.5 text-warning">
                        •
                      </span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-relaxed text-text-faint">
                  No se detectaron advertencias adicionales para esta captura.
                </p>
              )}

              {opportunity.caerleonCompetition.available && (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning-muted p-3 text-xs leading-relaxed text-text-muted">
                  <p className="font-medium text-warning">
                    Competencia desde Caerleon
                  </p>
                  <p className="mt-1">
                    Precio observado: {" "}
                    {formatBlackMarketSilver(
                      opportunity.caerleonCompetition.purchaseUnitPrice,
                    )} · antigüedad {" "}
                    {formatBlackMarketAge(
                      opportunity.caerleonCompetition.ageMinutes,
                    )}.
                  </p>
                  {opportunity.caerleonCompetition.canFillProfitably && (
                    <p className="mt-1 font-medium text-warning">
                      La orden también puede cubrirse rentablemente desde Caerleon.
                    </p>
                  )}
                </div>
              )}
            </article>
          </div>

          <p className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted">
            Confirma la orden dentro del juego antes de comprar. Los precios representan la última captura disponible y pueden cambiar durante el traslado.
          </p>
        </div>
      </section>
    </div>
  );
}
