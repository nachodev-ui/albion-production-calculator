import { accountAuthConfig } from "../../account/config/accountAuthConfig";
import type {
  AlbionServer,
  BlackMarketAnalysis,
  BlackMarketAnalysisRequest,
  BlackMarketEconomics,
  BlackMarketHistoryPoint,
  BlackMarketHistorySummary,
  BlackMarketPriceSnapshot,
} from "../types";

export class BlackMarketApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BlackMarketApiError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BlackMarketApiError(`Respuesta inválida: ${field}`, 502);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return requiredString(value, field);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BlackMarketApiError(`Respuesta inválida: ${field}`, 502);
  }
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  return requiredNumber(value, field);
}

function parseServer(value: unknown): AlbionServer {
  if (value === "west" || value === "east" || value === "europe") {
    return value;
  }
  throw new BlackMarketApiError("Respuesta inválida: server", 502);
}

function parseFreshness(
  value: unknown,
): BlackMarketPriceSnapshot["freshness"] {
  if (value === "fresh" || value === "stale" || value === "missing") {
    return value;
  }
  throw new BlackMarketApiError("Respuesta inválida: freshness", 502);
}

function parsePriceSnapshot(value: unknown): BlackMarketPriceSnapshot {
  if (!isRecord(value)) {
    throw new BlackMarketApiError("Respuesta inválida de precios", 502);
  }
  return {
    marketKey: requiredString(value["marketKey"], "price.marketKey"),
    unitPrice: nullableNumber(value["unitPrice"], "price.unitPrice"),
    priceDate: nullableString(value["priceDate"], "price.priceDate"),
    updatedAt: nullableString(value["updatedAt"], "price.updatedAt"),
    freshness: parseFreshness(value["freshness"]),
  };
}

function parseHistoryPoint(value: unknown): BlackMarketHistoryPoint {
  if (!isRecord(value)) {
    throw new BlackMarketApiError("Respuesta inválida de historial", 502);
  }
  return {
    timestamp: requiredString(value["timestamp"], "history.timestamp"),
    itemCount: requiredNumber(value["itemCount"], "history.itemCount"),
    averageUnitPrice: nullableNumber(
      value["averageUnitPrice"],
      "history.averageUnitPrice",
    ),
  };
}

function parseHistory(value: unknown): BlackMarketHistorySummary {
  if (!isRecord(value)) {
    throw new BlackMarketApiError("Respuesta inválida de historial", 502);
  }
  const rawPoints = value["points"];
  if (!Array.isArray(rawPoints)) {
    throw new BlackMarketApiError("Respuesta inválida: history.points", 502);
  }
  return {
    rangeDays: requiredNumber(value["rangeDays"], "history.rangeDays"),
    bucketCount: requiredNumber(value["bucketCount"], "history.bucketCount"),
    soldUnits: requiredNumber(value["soldUnits"], "history.soldUnits"),
    weightedAverageUnitPrice: nullableNumber(
      value["weightedAverageUnitPrice"],
      "history.weightedAverageUnitPrice",
    ),
    lowestAverageUnitPrice: nullableNumber(
      value["lowestAverageUnitPrice"],
      "history.lowestAverageUnitPrice",
    ),
    highestAverageUnitPrice: nullableNumber(
      value["highestAverageUnitPrice"],
      "history.highestAverageUnitPrice",
    ),
    lastObservedAt: nullableString(
      value["lastObservedAt"],
      "history.lastObservedAt",
    ),
    points: rawPoints.map(parseHistoryPoint),
  };
}

function parseSalePriceSource(
  value: unknown,
): BlackMarketEconomics["salePriceSource"] {
  if (
    value === "black-market-buy-order" ||
    value === "manual" ||
    value === "missing"
  ) {
    return value;
  }
  throw new BlackMarketApiError("Respuesta inválida: salePriceSource", 502);
}

function parseEconomics(value: unknown): BlackMarketEconomics {
  if (!isRecord(value) || typeof value["ready"] !== "boolean") {
    throw new BlackMarketApiError("Respuesta económica inválida", 502);
  }
  return {
    ready: value["ready"],
    quantity: requiredNumber(value["quantity"], "economics.quantity"),
    purchaseUnitPrice: nullableNumber(
      value["purchaseUnitPrice"],
      "economics.purchaseUnitPrice",
    ),
    saleUnitPrice: nullableNumber(
      value["saleUnitPrice"],
      "economics.saleUnitPrice",
    ),
    salePriceSource: parseSalePriceSource(value["salePriceSource"]),
    purchaseCost: nullableNumber(value["purchaseCost"], "economics.purchaseCost"),
    grossRevenue: nullableNumber(value["grossRevenue"], "economics.grossRevenue"),
    salesTax: nullableNumber(value["salesTax"], "economics.salesTax"),
    transportCost: requiredNumber(
      value["transportCost"],
      "economics.transportCost",
    ),
    netRevenue: nullableNumber(value["netRevenue"], "economics.netRevenue"),
    profit: nullableNumber(value["profit"], "economics.profit"),
    profitPerUnit: nullableNumber(
      value["profitPerUnit"],
      "economics.profitPerUnit",
    ),
    marginPercent: nullableNumber(
      value["marginPercent"],
      "economics.marginPercent",
    ),
    returnOnCostPercent: nullableNumber(
      value["returnOnCostPercent"],
      "economics.returnOnCostPercent",
    ),
    breakEvenUnitPrice: nullableNumber(
      value["breakEvenUnitPrice"],
      "economics.breakEvenUnitPrice",
    ),
  };
}

export function parseBlackMarketAnalysis(value: unknown): BlackMarketAnalysis {
  if (!isRecord(value)) {
    throw new BlackMarketApiError("Respuesta inválida del Black Market", 502);
  }
  const rawWarnings = value["warnings"];
  if (!Array.isArray(rawWarnings) || !rawWarnings.every((item) => typeof item === "string")) {
    throw new BlackMarketApiError("Respuesta inválida: warnings", 502);
  }
  const blackMarketKey = requiredString(
    value["blackMarketKey"],
    "blackMarketKey",
  );
  if (blackMarketKey !== "black_market") {
    throw new BlackMarketApiError("Respuesta inválida: blackMarketKey", 502);
  }
  return {
    requestedAt: requiredString(value["requestedAt"], "requestedAt"),
    server: parseServer(value["server"]),
    itemIdentifier: requiredString(value["itemIdentifier"], "itemIdentifier"),
    quality: requiredNumber(value["quality"], "quality"),
    purchaseMarketKey: requiredString(
      value["purchaseMarketKey"],
      "purchaseMarketKey",
    ),
    blackMarketKey,
    purchase: parsePriceSnapshot(value["purchase"]),
    blackMarket: parsePriceSnapshot(value["blackMarket"]),
    history: parseHistory(value["history"]),
    economics: parseEconomics(value["economics"]),
    warnings: rawWarnings,
  };
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload["error"] === "string") {
      if (response.status === 403) {
        return "Esta herramienta requiere un plan Pro activo.";
      }
      return payload["error"];
    }
  } catch {
    // Preserve the generic status message for a non-JSON response.
  }
  return `La consulta del Black Market falló con estado ${response.status}.`;
}

export async function analyzeBlackMarket(
  request: BlackMarketAnalysisRequest,
  accessToken: string,
  signal?: AbortSignal,
): Promise<BlackMarketAnalysis> {
  const response = await fetch(
    `${accountAuthConfig.centralApiBaseUrl}/black-market/analysis`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    throw new BlackMarketApiError(await responseMessage(response), response.status);
  }
  return parseBlackMarketAnalysis(await response.json());
}
