import { BLACK_MARKET_QUALITY_LABELS } from "./blackMarketScannerConfig";

const QUALITY_TONES: Record<number, string> = {
  1: "border-border-strong bg-surface text-text-muted",
  2: "border-positive/35 bg-positive-muted text-positive",
  3: "border-sky-400/35 bg-sky-400/10 text-sky-300",
  4: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  5: "border-warning/45 bg-warning-muted text-warning",
};

export function BlackMarketQualityBadge({
  quality,
  compact = false,
}: {
  readonly quality: number;
  readonly compact?: boolean;
}) {
  const normalized = Math.min(5, Math.max(1, Math.floor(quality)));
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${
        compact
          ? "px-2 py-0.5 text-[9px] uppercase tracking-[0.1em]"
          : "px-3 py-1 text-xs"
      } ${QUALITY_TONES[normalized]}`}
      title={`Calidad ${BLACK_MARKET_QUALITY_LABELS[normalized]}`}
    >
      {BLACK_MARKET_QUALITY_LABELS[normalized] ?? `Calidad ${normalized}`}
    </span>
  );
}
