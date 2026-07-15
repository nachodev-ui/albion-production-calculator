export type AlbionServer = "west" | "east" | "europe";
export type BlackMarketCategory = "weapon" | "armor" | "offhand" | "accessory";
export type BlackMarketOpportunitySort = "profit" | "roi" | "freshness";
export type BlackMarketOpportunityRisk = "low" | "medium" | "high";

export interface BlackMarketAnalysisRequest {
  readonly server: AlbionServer;
  readonly purchaseMarketKey: string;
  readonly itemIdentifier: string;
  readonly quality: number;
  readonly quantity: number;
  readonly saleUnitPriceOverride: number | null;
  readonly salesTaxRate: number;
  readonly transportCost: number;
  readonly historyDays: number;
}

export interface BlackMarketPriceSnapshot {
  readonly marketKey: string;
  readonly unitPrice: number | null;
  readonly priceDate: string | null;
  readonly updatedAt: string | null;
  readonly freshness: "fresh" | "stale" | "missing";
}

export interface BlackMarketHistoryPoint {
  readonly timestamp: string;
  readonly itemCount: number;
  readonly averageUnitPrice: number | null;
}

export interface BlackMarketHistorySummary {
  readonly rangeDays: number;
  readonly bucketCount: number;
  readonly soldUnits: number;
  readonly weightedAverageUnitPrice: number | null;
  readonly lowestAverageUnitPrice: number | null;
  readonly highestAverageUnitPrice: number | null;
  readonly lastObservedAt: string | null;
  readonly points: readonly BlackMarketHistoryPoint[];
}

export interface BlackMarketEconomics {
  readonly ready: boolean;
  readonly quantity: number;
  readonly purchaseUnitPrice: number | null;
  readonly saleUnitPrice: number | null;
  readonly salePriceSource: "black-market-buy-order" | "manual" | "missing";
  readonly purchaseCost: number | null;
  readonly grossRevenue: number | null;
  readonly salesTax: number | null;
  readonly transportCost: number;
  readonly netRevenue: number | null;
  readonly profit: number | null;
  readonly profitPerUnit: number | null;
  readonly marginPercent: number | null;
  readonly returnOnCostPercent: number | null;
  readonly breakEvenUnitPrice: number | null;
}

export interface BlackMarketAnalysis {
  readonly requestedAt: string;
  readonly server: AlbionServer;
  readonly itemIdentifier: string;
  readonly quality: number;
  readonly purchaseMarketKey: string;
  readonly blackMarketKey: "black_market";
  readonly purchase: BlackMarketPriceSnapshot;
  readonly blackMarket: BlackMarketPriceSnapshot;
  readonly history: BlackMarketHistorySummary;
  readonly economics: BlackMarketEconomics;
  readonly warnings: readonly string[];
}

export interface BlackMarketWorkspace {
  readonly selectedItemId: string | null;
  readonly enchantment: number;
  readonly server: AlbionServer;
  readonly purchaseMarketKey: string;
  readonly quality: number;
  readonly quantity: number;
  readonly saleUnitPriceOverride: number | null;
  readonly salesTaxPercent: number;
  readonly transportCost: number;
  readonly historyDays: number;
}

export interface BlackMarketOpportunityFilters {
  readonly server: AlbionServer;
  readonly purchaseMarketKeys: readonly string[];
  readonly tiers: readonly number[];
  readonly enchantments: readonly number[];
  readonly qualities: readonly number[];
  readonly categories: readonly BlackMarketCategory[];
  readonly minimumProfit: number;
  readonly minimumReturnOnCostPercent: number;
  readonly maximumCityAgeMinutes: number;
  readonly maximumBlackMarketAgeMinutes: number;
  readonly salesTaxPercent: number;
  readonly transportCostPerUnit: number;
  readonly sort: BlackMarketOpportunitySort;
  readonly limit: number;
}

export interface BlackMarketOpportunitiesRequest {
  readonly server: AlbionServer;
  readonly purchaseMarketKeys: readonly string[];
  readonly tiers: readonly number[];
  readonly enchantments: readonly number[];
  readonly qualities: readonly number[];
  readonly categories: readonly BlackMarketCategory[];
  readonly minimumProfit: number;
  readonly minimumReturnOnCostPercent: number;
  readonly maximumCityAgeMinutes: number;
  readonly maximumBlackMarketAgeMinutes: number;
  readonly salesTaxRate: number;
  readonly transportCostPerUnit: number;
  readonly sort: BlackMarketOpportunitySort;
  readonly limit: number;
  readonly offset: number;
}

export interface BlackMarketOpportunityCompetition {
  readonly available: boolean;
  readonly purchaseUnitPrice: number | null;
  readonly purchaseQuality: number | null;
  readonly purchasePriceDate: string | null;
  readonly ageMinutes: number | null;
  readonly profit: number | null;
  readonly canFillProfitably: boolean;
}

export interface BlackMarketOpportunity {
  readonly id: string;
  readonly itemIdentifier: string;
  readonly tier: number;
  readonly enchantment: number;
  readonly category: BlackMarketCategory;
  readonly purchaseMarketKey: string;
  readonly purchaseQuality: number;
  readonly purchaseUnitPrice: number;
  readonly purchasePriceDate: string;
  readonly purchaseAgeMinutes: number;
  readonly blackMarketQuality: number;
  readonly blackMarketBuyUnitPrice: number;
  readonly blackMarketBuyPriceDate: string;
  readonly blackMarketAgeMinutes: number;
  readonly blackMarketSellUnitPrice: number | null;
  readonly blackMarketSellPriceDate: string | null;
  readonly blackMarketOrderDifference: number | null;
  readonly estimatedSalesTax: number;
  readonly transportCostPerUnit: number;
  readonly netUnitRevenue: number;
  readonly profit: number;
  readonly marginPercent: number;
  readonly returnOnCostPercent: number;
  readonly breakEvenUnitPrice: number;
  readonly caerleonCompetition: BlackMarketOpportunityCompetition;
  readonly risk: BlackMarketOpportunityRisk;
  readonly riskReasons: readonly string[];
}

export interface BlackMarketOpportunityCoverage {
  readonly blackMarketRows: number;
  readonly sourceMarketRows: number;
  readonly latestBlackMarketAt: string | null;
  readonly latestSourceMarketAt: string | null;
  readonly selectedMarketKeys: readonly string[];
}

export interface BlackMarketOpportunitiesResponse {
  readonly requestedAt: string;
  readonly server: AlbionServer;
  readonly totalMatching: number;
  readonly returned: number;
  readonly limit: number;
  readonly offset: number;
  readonly sort: BlackMarketOpportunitySort;
  readonly coverage: BlackMarketOpportunityCoverage;
  readonly data: readonly BlackMarketOpportunity[];
  readonly warnings: readonly string[];
}
