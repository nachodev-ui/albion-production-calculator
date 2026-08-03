import { DataConfidenceHint } from "@features/data-trust/components/DataConfidenceHint";
import {
  buildBlackMarketDataConfidence,
  type BlackMarketDataConfidenceLevel,
  type BlackMarketDataEvidence,
} from "../utils/blackMarketDataConfidence";

const PRESENTATION: Record<
  BlackMarketDataConfidenceLevel,
  { readonly label: string; readonly className: string }
> = {
  high: {
    label: "Confianza alta",
    className:
      "border-positive/50 bg-positive-muted px-2 py-0.5 text-[9px] text-positive",
  },
  medium: {
    label: "Confianza media",
    className:
      "border-accent-border bg-accent-muted px-2 py-0.5 text-[9px] text-accent",
  },
  low: {
    label: "Confianza baja",
    className:
      "border-negative/40 bg-negative-muted px-2 py-0.5 text-[9px] text-negative",
  },
};

const COMPACT_DOT: Record<BlackMarketDataConfidenceLevel, string> = {
  high: "bg-positive",
  medium: "bg-accent",
  low: "bg-negative",
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function BlackMarketDataConfidenceBadge({
  label,
  evidence,
  compact = false,
}: {
  readonly label: string;
  readonly evidence: BlackMarketDataEvidence;
  readonly compact?: boolean;
}) {
  const confidence = buildBlackMarketDataConfidence(evidence);
  const presentation = PRESENTATION[confidence.level];

  if (compact) {
    return (
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-text-faint">
        <span className="inline-flex items-center gap-1.5 font-medium text-text-muted">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${COMPACT_DOT[confidence.level]}`}
          />
          {presentation.label}
        </span>
        <span aria-hidden="true" className="text-border-strong">
          ·
        </span>
        <span className="tabular">
          {formatInteger(evidence.observations7d)} precios ·{" "}
          {formatInteger(evidence.volume7d)} unidades
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface/65 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
          {label}
        </p>
        <DataConfidenceHint
          level={confidence.level}
          label={presentation.label}
          className={`${presentation.className} px-2.5 py-1 text-[10px]`}
        />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
        {formatInteger(evidence.observations7d)} precios guardados ·{" "}
        {formatInteger(evidence.volume7d)} unidades registradas
        {confidence.deviationFromMedianPercent !== null && (
          <>
            {" "}· {formatSignedPercent(confidence.deviationFromMedianPercent)} frente
            al precio habitual de 7 días
          </>
        )}
        {confidence.spreadPercent !== null && (
          <>
            {" "}· diferencia compra/venta{" "}
            {formatSignedPercent(confidence.spreadPercent)}
          </>
        )}
      </p>
      {confidence.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-text-faint">
          {confidence.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
