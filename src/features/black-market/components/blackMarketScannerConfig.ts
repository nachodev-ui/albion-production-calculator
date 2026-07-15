import type {
  AlbionServer,
  BlackMarketCategory,
} from "../types";

export const BLACK_MARKET_SCANNER_MARKETS = [
  { key: "bridgewatch", name: "Bridgewatch" },
  { key: "martlock", name: "Martlock" },
  { key: "lymhurst", name: "Lymhurst" },
  { key: "fort_sterling", name: "Fort Sterling" },
  { key: "thetford", name: "Thetford" },
  { key: "caerleon", name: "Caerleon" },
  { key: "brecilien", name: "Brecilien" },
] as const;

export const BLACK_MARKET_SERVER_OPTIONS: readonly {
  readonly value: AlbionServer;
  readonly label: string;
}[] = [
  { value: "west", label: "Americas" },
  { value: "east", label: "Asia" },
  { value: "europe", label: "Europe" },
];

export const BLACK_MARKET_CATEGORY_OPTIONS: readonly {
  readonly key: BlackMarketCategory;
  readonly label: string;
}[] = [
  { key: "weapon", label: "Armas" },
  { key: "armor", label: "Armaduras" },
  { key: "offhand", label: "Mano secundaria" },
  { key: "accessory", label: "Accesorios" },
];

export const BLACK_MARKET_QUALITY_LABELS: Readonly<Record<number, string>> = {
  1: "Normal",
  2: "Buena",
  3: "Sobresaliente",
  4: "Excelente",
  5: "Obra maestra",
};

export const BLACK_MARKET_CONTROL_CLASS_NAME =
  "w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:border-accent-border focus-visible:ring-2 focus-visible:ring-accent-border/30";

export const BLACK_MARKET_SECONDARY_CONTROL_CLASS_NAME =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:border-accent-border focus-visible:ring-2 focus-visible:ring-accent-border/30";

export function formatBlackMarketSilver(value: number | null): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(
        value,
      );
}

export function formatBlackMarketPercent(value: number): string {
  return `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatBlackMarketAge(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1_440)
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${Math.floor(minutes / 1_440)} d`;
}

export function blackMarketScannerMarketName(key: string): string {
  return (
    BLACK_MARKET_SCANNER_MARKETS.find((market) => market.key === key)?.name ??
    key
  );
}

export function blackMarketScannerCategoryName(
  category: BlackMarketCategory,
): string {
  return (
    BLACK_MARKET_CATEGORY_OPTIONS.find((option) => option.key === category)
      ?.label ?? category
  );
}

export function baseBlackMarketItemIdentifier(identifier: string): string {
  return identifier.split("@", 1)[0] ?? identifier;
}
