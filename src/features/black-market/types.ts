export type AlbionServer = "west" | "east" | "europe";

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
