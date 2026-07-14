import type { AlbionServer, BlackMarketWorkspace } from "../types";

export const BLACK_MARKET_WORKSPACE_STORAGE_KEY =
  "albion-production-calculator:black-market-workspace:v1";

const DEFAULT_WORKSPACE: BlackMarketWorkspace = {
  selectedItemId: null,
  enchantment: 0,
  server: "west",
  purchaseMarketKey: "caerleon",
  quality: 1,
  quantity: 1,
  saleUnitPriceOverride: null,
  salesTaxPercent: 4,
  transportCost: 0,
  historyDays: 28,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isServer(value: unknown): value is AlbionServer {
  return value === "west" || value === "east" || value === "europe";
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    Number.isSafeInteger(value)
    ? value
    : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    Number.isSafeInteger(value)
    ? value
    : fallback;
}

export function parseBlackMarketWorkspace(value: unknown): BlackMarketWorkspace {
  if (!isRecord(value) || value["version"] !== 1) {
    return DEFAULT_WORKSPACE;
  }
  const raw = isRecord(value["workspace"]) ? value["workspace"] : {};
  const selectedItemId =
    typeof raw["selectedItemId"] === "string" &&
    raw["selectedItemId"].trim().length > 0
      ? raw["selectedItemId"]
      : null;
  const purchaseMarketKey =
    typeof raw["purchaseMarketKey"] === "string" &&
    raw["purchaseMarketKey"].trim().length > 0
      ? raw["purchaseMarketKey"]
      : DEFAULT_WORKSPACE.purchaseMarketKey;
  const rawOverride = raw["saleUnitPriceOverride"];
  const saleUnitPriceOverride =
    typeof rawOverride === "number" &&
    Number.isSafeInteger(rawOverride) &&
    rawOverride > 0
      ? rawOverride
      : null;
  const salesTaxPercent =
    typeof raw["salesTaxPercent"] === "number" &&
    Number.isFinite(raw["salesTaxPercent"]) &&
    raw["salesTaxPercent"] >= 0 &&
    raw["salesTaxPercent"] < 100
      ? raw["salesTaxPercent"]
      : DEFAULT_WORKSPACE.salesTaxPercent;

  return {
    selectedItemId,
    enchantment: boundedInteger(raw["enchantment"], 0, 0, 4),
    server: isServer(raw["server"]) ? raw["server"] : DEFAULT_WORKSPACE.server,
    purchaseMarketKey,
    quality: boundedInteger(raw["quality"], 1, 1, 5),
    quantity: positiveInteger(raw["quantity"], 1),
    saleUnitPriceOverride,
    salesTaxPercent,
    transportCost: nonNegativeInteger(raw["transportCost"], 0),
    historyDays: boundedInteger(raw["historyDays"], 28, 1, 90),
  };
}

export function loadBlackMarketWorkspace(): BlackMarketWorkspace {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE;
  try {
    const raw = window.localStorage.getItem(BLACK_MARKET_WORKSPACE_STORAGE_KEY);
    return raw ? parseBlackMarketWorkspace(JSON.parse(raw) as unknown) : DEFAULT_WORKSPACE;
  } catch {
    return DEFAULT_WORKSPACE;
  }
}

export function saveBlackMarketWorkspace(workspace: BlackMarketWorkspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BLACK_MARKET_WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: 1, workspace }),
    );
  } catch {
    // Keep the tool operational if browser storage is unavailable.
  }
}
