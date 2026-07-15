import { accountAuthConfig } from "../../account/config/accountAuthConfig";
import { BlackMarketApiError } from "./blackMarketApi";
import type {
  AlbionServer,
  BlackMarketCategory,
  BlackMarketOpportunitiesRequest,
  BlackMarketOpportunitiesResponse,
  BlackMarketOpportunity,
  BlackMarketOpportunityCompetition,
  BlackMarketOpportunityCoverage,
  BlackMarketOpportunityRisk,
  BlackMarketOpportunitySort,
} from "../types";

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

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new BlackMarketApiError(`Respuesta inválida: ${field}`, 502);
  }
  return value;
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new BlackMarketApiError(`Respuesta inválida: ${field}`, 502);
  }
  return value;
}

function parseServer(value: unknown): AlbionServer {
  if (value === "west" || value === "east" || value === "europe") return value;
  throw new BlackMarketApiError("Respuesta inválida: server", 502);
}

function parseSort(value: unknown): BlackMarketOpportunitySort {
  if (value === "profit" || value === "roi" || value === "freshness")
    return value;
  throw new BlackMarketApiError("Respuesta inválida: sort", 502);
}

function parseCategory(value: unknown): BlackMarketCategory {
  if (
    value === "weapon" ||
    value === "armor" ||
    value === "offhand" ||
    value === "accessory"
  ) {
    return value;
  }
  throw new BlackMarketApiError("Respuesta inválida: category", 502);
}

function parseRisk(value: unknown): BlackMarketOpportunityRisk {
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new BlackMarketApiError("Respuesta inválida: risk", 502);
}

function parseCompetition(value: unknown): BlackMarketOpportunityCompetition {
  if (!isRecord(value)) {
    throw new BlackMarketApiError(
      "Respuesta inválida: caerleonCompetition",
      502,
    );
  }
  return {
    available: requiredBoolean(value["available"], "competition.available"),
    purchaseUnitPrice: nullableNumber(
      value["purchaseUnitPrice"],
      "competition.purchaseUnitPrice",
    ),
    purchaseQuality: nullableNumber(
      value["purchaseQuality"],
      "competition.purchaseQuality",
    ),
    purchasePriceDate: nullableString(
      value["purchasePriceDate"],
      "competition.purchasePriceDate",
    ),
    ageMinutes: nullableNumber(value["ageMinutes"], "competition.ageMinutes"),
    profit: nullableNumber(value["profit"], "competition.profit"),
    canFillProfitably: requiredBoolean(
      value["canFillProfitably"],
      "competition.canFillProfitably",
    ),
  };
}

function parseOpportunity(value: unknown): BlackMarketOpportunity {
  if (!isRecord(value)) {
    throw new BlackMarketApiError("Respuesta inválida de oportunidad", 502);
  }
  return {
    id: requiredString(value["id"], "opportunity.id"),
    itemIdentifier: requiredString(
      value["itemIdentifier"],
      "opportunity.itemIdentifier",
    ),
    tier: requiredNumber(value["tier"], "opportunity.tier"),
    enchantment: requiredNumber(
      value["enchantment"],
      "opportunity.enchantment",
    ),
    category: parseCategory(value["category"]),
    purchaseMarketKey: requiredString(
      value["purchaseMarketKey"],
      "opportunity.purchaseMarketKey",
    ),
    purchaseQuality: requiredNumber(
      value["purchaseQuality"],
      "opportunity.purchaseQuality",
    ),
    purchaseUnitPrice: requiredNumber(
      value["purchaseUnitPrice"],
      "opportunity.purchaseUnitPrice",
    ),
    purchasePriceDate: requiredString(
      value["purchasePriceDate"],
      "opportunity.purchasePriceDate",
    ),
    purchaseAgeMinutes: requiredNumber(
      value["purchaseAgeMinutes"],
      "opportunity.purchaseAgeMinutes",
    ),
    blackMarketQuality: requiredNumber(
      value["blackMarketQuality"],
      "opportunity.blackMarketQuality",
    ),
    blackMarketBuyUnitPrice: requiredNumber(
      value["blackMarketBuyUnitPrice"],
      "opportunity.blackMarketBuyUnitPrice",
    ),
    blackMarketBuyPriceDate: requiredString(
      value["blackMarketBuyPriceDate"],
      "opportunity.blackMarketBuyPriceDate",
    ),
    blackMarketAgeMinutes: requiredNumber(
      value["blackMarketAgeMinutes"],
      "opportunity.blackMarketAgeMinutes",
    ),
    blackMarketSellUnitPrice: nullableNumber(
      value["blackMarketSellUnitPrice"],
      "opportunity.blackMarketSellUnitPrice",
    ),
    blackMarketSellPriceDate: nullableString(
      value["blackMarketSellPriceDate"],
      "opportunity.blackMarketSellPriceDate",
    ),
    blackMarketOrderDifference: nullableNumber(
      value["blackMarketOrderDifference"],
      "opportunity.blackMarketOrderDifference",
    ),
    estimatedSalesTax: requiredNumber(
      value["estimatedSalesTax"],
      "opportunity.estimatedSalesTax",
    ),
    transportCostPerUnit: requiredNumber(
      value["transportCostPerUnit"],
      "opportunity.transportCostPerUnit",
    ),
    netUnitRevenue: requiredNumber(
      value["netUnitRevenue"],
      "opportunity.netUnitRevenue",
    ),
    profit: requiredNumber(value["profit"], "opportunity.profit"),
    marginPercent: requiredNumber(
      value["marginPercent"],
      "opportunity.marginPercent",
    ),
    returnOnCostPercent: requiredNumber(
      value["returnOnCostPercent"],
      "opportunity.returnOnCostPercent",
    ),
    breakEvenUnitPrice: requiredNumber(
      value["breakEvenUnitPrice"],
      "opportunity.breakEvenUnitPrice",
    ),
    caerleonCompetition: parseCompetition(value["caerleonCompetition"]),
    risk: parseRisk(value["risk"]),
    riskReasons: stringArray(value["riskReasons"], "opportunity.riskReasons"),
  };
}

function parseCoverage(value: unknown): BlackMarketOpportunityCoverage {
  if (!isRecord(value)) {
    throw new BlackMarketApiError("Respuesta inválida de cobertura", 502);
  }
  return {
    blackMarketRows: requiredNumber(
      value["blackMarketRows"],
      "coverage.blackMarketRows",
    ),
    sourceMarketRows: requiredNumber(
      value["sourceMarketRows"],
      "coverage.sourceMarketRows",
    ),
    latestBlackMarketAt: nullableString(
      value["latestBlackMarketAt"],
      "coverage.latestBlackMarketAt",
    ),
    latestSourceMarketAt: nullableString(
      value["latestSourceMarketAt"],
      "coverage.latestSourceMarketAt",
    ),
    selectedMarketKeys: stringArray(
      value["selectedMarketKeys"],
      "coverage.selectedMarketKeys",
    ),
  };
}

export function parseBlackMarketOpportunities(
  value: unknown,
): BlackMarketOpportunitiesResponse {
  if (!isRecord(value) || !Array.isArray(value["data"])) {
    throw new BlackMarketApiError("Respuesta inválida del escáner", 502);
  }
  return {
    requestedAt: requiredString(value["requestedAt"], "requestedAt"),
    server: parseServer(value["server"]),
    totalMatching: requiredNumber(value["totalMatching"], "totalMatching"),
    returned: requiredNumber(value["returned"], "returned"),
    limit: requiredNumber(value["limit"], "limit"),
    offset: requiredNumber(value["offset"], "offset"),
    sort: parseSort(value["sort"]),
    coverage: parseCoverage(value["coverage"]),
    data: value["data"].map(parseOpportunity),
    warnings: stringArray(value["warnings"], "warnings"),
  };
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && typeof payload["error"] === "string") {
      return response.status === 403
        ? "El escáner comparativo requiere un plan Pro activo."
        : payload["error"];
    }
  } catch {
    // Preserve the generic message for non-JSON responses.
  }
  return `El escáner del Black Market falló con estado ${response.status}.`;
}

export async function scanBlackMarketOpportunities(
  request: BlackMarketOpportunitiesRequest,
  accessToken: string,
  signal?: AbortSignal,
): Promise<BlackMarketOpportunitiesResponse> {
  const response = await fetch(
    `${accountAuthConfig.centralApiBaseUrl}/black-market/opportunities`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        server: request.server,
        purchaseMarketKeys: request.purchaseMarketKeys,
        tiers: request.tiers,
        enchantments: request.enchantments,
        qualities: request.qualities,
        categories: request.categories,
        minimumProfit: request.minimumProfit,
        minimumReturnOnCostPercent: request.minimumReturnOnCostPercent,
        maximumCityAgeMinutes: request.maximumCityAgeMinutes,
        maximumBlackMarketAgeMinutes: request.maximumBlackMarketAgeMinutes,
        salesTaxRate: request.salesTaxRate,
        transportCostPerUnit: request.transportCostPerUnit,
        sort: request.sort,
        limit: request.limit,
        offset: request.offset,
      }),
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) {
    throw new BlackMarketApiError(
      await responseMessage(response),
      response.status,
    );
  }
  return parseBlackMarketOpportunities(await response.json());
}
