import type {
  AlbionServer,
  BlackMarketCategory,
  BlackMarketOpportunityFilters,
  BlackMarketOpportunitySort,
  BlackMarketSaleMode,
  BlackMarketStrategyFilter,
  BlackMarketStrategySort,
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
    saleMode: "direct",
    isPremium: true,
    salesTaxPercent: 4,
    setupFeePercent: 2.5,
    transportCostPerUnit: 0,
    focusValuePerPoint: 0,
    lowerQualityFallbackPercent: 0,
    materialTransportCostPerBatch: 0,
    finishedTransportCostPerUnit: 0,
    escortCostPerBatch: 0,
    deathProbabilityPercent: 0,
    timeCostPerBatch: 0,
    strategyFilter: "all",
    strategySort: "best-profit",
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

function isSaleMode(value: unknown): value is BlackMarketSaleMode {
  return value === "direct" || value === "sell-order";
}

function isStrategyFilter(value: unknown): value is BlackMarketStrategyFilter {
  return (
    value === "all" ||
    value === "buy-finished" ||
    value === "craft-without-focus" ||
    value === "craft-with-focus"
  );
}

function isStrategySort(value: unknown): value is BlackMarketStrategySort {
  return (
    value === "api" ||
    value === "best-profit" ||
    value === "best-roi" ||
    value === "advantage"
  );
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
  allowed: ReadonlySet<string>,
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
    ![1, 2, 3].includes(Number(value["version"])) ||
    !isRecord(value["filters"])
  ) {
    return DEFAULT_BLACK_MARKET_SCANNER_FILTERS;
  }
  const raw = value["filters"];
  const salesTaxPercent = boundedNumber(raw["salesTaxPercent"], 4, 0, 99.99);
  return {
    server: isServer(raw["server"])
      ? raw["server"]
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS.server,
    purchaseMarketKeys: stringArray(
      raw["purchaseMarketKeys"],
      MARKET_KEYS,
      DEFAULT_BLACK_MARKET_SCANNER_FILTERS.purchaseMarketKeys,
    ),
    tiers: numberArray(raw["tiers"], new Set([4, 5, 6, 7, 8]), DEFAULT_BLACK_MARKET_SCANNER_FILTERS.tiers),
    enchantments: numberArray(raw["enchantments"], new Set([0, 1, 2, 3, 4]), DEFAULT_BLACK_MARKET_SCANNER_FILTERS.enchantments),
    qualities: numberArray(raw["qualities"], new Set([1, 2, 3, 4, 5]), DEFAULT_BLACK_MARKET_SCANNER_FILTERS.qualities),
    categories: stringArray(raw["categories"], CATEGORIES, DEFAULT_BLACK_MARKET_SCANNER_FILTERS.categories),
    minimumProfit: Math.floor(boundedNumber(raw["minimumProfit"], 10_000, 0, 1_000_000_000_000)),
    minimumReturnOnCostPercent: boundedNumber(raw["minimumReturnOnCostPercent"], 5, 0, 100_000),
    maximumCityAgeMinutes: Math.floor(boundedNumber(raw["maximumCityAgeMinutes"], 30, 1, 10_080)),
    maximumBlackMarketAgeMinutes: Math.floor(boundedNumber(raw["maximumBlackMarketAgeMinutes"], 20, 1, 10_080)),
    saleMode: isSaleMode(raw["saleMode"]) ? raw["saleMode"] : "direct",
    isPremium:
      typeof raw["isPremium"] === "boolean"
        ? raw["isPremium"]
        : salesTaxPercent <= 4,
    salesTaxPercent,
    setupFeePercent: boundedNumber(raw["setupFeePercent"], 2.5, 0, 99.99),
    transportCostPerUnit: Math.floor(boundedNumber(raw["transportCostPerUnit"], 0, 0, 1_000_000_000_000)),
    focusValuePerPoint: boundedNumber(raw["focusValuePerPoint"], 0, 0, 1_000_000),
    lowerQualityFallbackPercent: boundedNumber(raw["lowerQualityFallbackPercent"], 0, 0, 100),
    materialTransportCostPerBatch: Math.floor(boundedNumber(raw["materialTransportCostPerBatch"], 0, 0, 1_000_000_000_000)),
    finishedTransportCostPerUnit: Math.floor(boundedNumber(raw["finishedTransportCostPerUnit"], 0, 0, 1_000_000_000_000)),
    escortCostPerBatch: Math.floor(boundedNumber(raw["escortCostPerBatch"], 0, 0, 1_000_000_000_000)),
    deathProbabilityPercent: boundedNumber(raw["deathProbabilityPercent"], 0, 0, 100),
    timeCostPerBatch: Math.floor(boundedNumber(raw["timeCostPerBatch"], 0, 0, 1_000_000_000_000)),
    strategyFilter: isStrategyFilter(raw["strategyFilter"])
      ? raw["strategyFilter"]
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS.strategyFilter,
    strategySort: isStrategySort(raw["strategySort"])
      ? raw["strategySort"]
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS.strategySort,
    sort: isSort(raw["sort"])
      ? raw["sort"]
      : DEFAULT_BLACK_MARKET_SCANNER_FILTERS.sort,
    limit: Math.floor(boundedNumber(raw["limit"], 100, 25, 100)),
  };
}

export function loadBlackMarketScannerFilters(): BlackMarketOpportunityFilters {
  if (typeof window === "undefined") return DEFAULT_BLACK_MARKET_SCANNER_FILTERS;
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
      JSON.stringify({ version: 3, filters }),
    );
  } catch {
    // Keep scanner available if browser storage is unavailable.
  }
}
