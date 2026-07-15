import type {
  AlbionServer,
  BlackMarketCategory,
  BlackMarketOpportunityFilters,
  BlackMarketOpportunitySort,
} from "../types";

export const BLACK_MARKET_SCANNER_STORAGE_KEY =
  "albion-production-calculator:black-market-scanner:v1";

export const DEFAULT_BLACK_MARKET_SCANNER_FILTERS: BlackMarketOpportunityFilters =
  {
    server: "west",
    purchaseMarketKeys: [
      "bridgewatch",
      "martlock",
      "lymhurst",
      "fort_sterling",
      "thetford",
      "caerleon",
    ],
    tiers: [4, 5, 6, 7, 8],
    enchantments: [0, 1, 2, 3, 4],
    qualities: [1, 2, 3, 4, 5],
    categories: ["weapon", "armor", "offhand", "accessory"],
    minimumProfit: 10_000,
    minimumReturnOnCostPercent: 5,
    maximumCityAgeMinutes: 30,
    maximumBlackMarketAgeMinutes: 20,
    salesTaxPercent: 4,
    transportCostPerUnit: 0,
    sort: "profit",
    limit: 100,
  };

const MARKET_KEYS = new Set([
  "bridgewatch",
  "martlock",
  "lymhurst",
  "fort_sterling",
  "thetford",
  "caerleon",
  "brecilien",
]);
const CATEGORIES = new Set<BlackMarketCategory>([
  "weapon",
  "armor",
  "offhand",
  "accessory",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isServer(value: unknown): value is AlbionServer {
  return value === "west" || value === "east" || value === "europe";
}

function isSort(value: unknown): value is BlackMarketOpportunitySort {
  return value === "profit" || value === "roi" || value === "freshness";
}

function numberArray(
  value: unknown,
  allowed: ReadonlySet<number>,
  fallback: readonly number[],
): readonly number[] {
  if (!Array.isArray(value)) return fallback;
  const result = [
    ...new Set(
      value.filter(
        (item): item is number =>
          typeof item === "number" &&
          Number.isInteger(item) &&
          allowed.has(item),
      ),
    ),
  ];
  return result.length > 0 ? result.sort((a, b) => a - b) : fallback;
}

function stringArray<T extends string>(
  value: unknown,
  allowed: ReadonlySet<T> | ReadonlySet<string>,
  fallback: readonly T[],
): readonly T[] {
  if (!Array.isArray(value)) return fallback;
  const result = [
    ...new Set(
      value.filter(
        (item): item is T => typeof item === "string" && allowed.has(item),
      ),
    ),
  ];
  return result.length > 0 ? result : fallback;
}

function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

export function parseBlackMarketScannerFilters(
  value: unknown,
): BlackMarketOpportunityFilters {
  if (
    !isRecord(value) ||
    value["version"] !== 1 ||
    !isRecord(value["filters"])
  ) {
    return DEFAULT_BLACK_MARKET_SCANNER_FILTERS;
  }
  const raw = value["filters"];
  return {
    server: isServer(raw["server"])
      ? raw["server"]
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS.server,
    purchaseMarketKeys: stringArray(
      raw["purchaseMarketKeys"],
      MARKET_KEYS,
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.purchaseMarketKeys,
    ),
    tiers: numberArray(
      raw["tiers"],
      new Set([4, 5, 6, 7, 8]),
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.tiers,
    ),
    enchantments: numberArray(
      raw["enchantments"],
      new Set([0, 1, 2, 3, 4]),
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.enchantments,
    ),
    qualities: numberArray(
      raw["qualities"],
      new Set([1, 2, 3, 4, 5]),
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.qualities,
    ),
    categories: stringArray(
      raw["categories"],
      CATEGORIES,
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.categories,
    ),
    minimumProfit: Math.floor(
      boundedNumber(raw["minimumProfit"], 10_000, 0, 1_000_000_000_000),
    ),
    minimumReturnOnCostPercent: boundedNumber(
      raw["minimumReturnOnCostPercent"],
      5,
      0,
      100_000,
    ),
    maximumCityAgeMinutes: Math.floor(
      boundedNumber(raw["maximumCityAgeMinutes"], 30, 1, 10_080),
    ),
    maximumBlackMarketAgeMinutes: Math.floor(
      boundedNumber(raw["maximumBlackMarketAgeMinutes"], 20, 1, 10_080),
    ),
    salesTaxPercent: boundedNumber(raw["salesTaxPercent"], 4, 0, 99.99),
    transportCostPerUnit: Math.floor(
      boundedNumber(raw["transportCostPerUnit"], 0, 0, 1_000_000_000_000),
    ),
    sort: isSort(raw["sort"])
      ? raw["sort"]
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS.sort,
    limit: Math.floor(boundedNumber(raw["limit"], 100, 25, 500)),
  };
}

export function loadBlackMarketScannerFilters(): BlackMarketOpportunityFilters {
  if (typeof window === "undefined")
    return DEFAULT_BLACK_MARKET_SCANNER_FILTERS;
  try {
    const value = window.localStorage.getItem(BLACK_MARKET_SCANNER_STORAGE_KEY);
    return value
      ? parseBlackMarketScannerFilters(JSON.parse(value) as unknown)
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS;
  } catch {
    return DEFAULT_BLACK_MARKET_SCANNER_FILTERS;
  }
}

export function saveBlackMarketScannerFilters(
  filters: BlackMarketOpportunityFilters,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BLACK_MARKET_SCANNER_STORAGE_KEY,
      JSON.stringify({ version: 1, filters }),
    );
  } catch {
    // Keep scanner available if browser storage is unavailable.
  }
}
