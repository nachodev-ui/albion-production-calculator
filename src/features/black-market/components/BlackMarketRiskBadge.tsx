import type { BlackMarketOpportunityRisk } from "../types";

export function BlackMarketRiskBadge({
  risk,
}: {
  readonly risk: BlackMarketOpportunityRisk;
}) {
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
