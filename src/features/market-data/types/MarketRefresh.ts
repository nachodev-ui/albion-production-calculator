import type {
  MarketCityId,
  PurchaseStrategy,
  SaleStrategy,
} from './MarketPrice'

export type MarketRefreshOrigin = 'automatic' | 'manual'
export type MarketRefreshItemKind = 'material' | 'sale'
export type MarketRefreshOutcome = 'updated' | 'unchanged' | 'missing'

export interface MarketRefreshProgress {
  readonly origin: MarketRefreshOrigin
  readonly completedRequests: number
  readonly totalRequests: number
  readonly completedCombinations: number
  readonly totalCombinations: number
}

export interface MarketRefreshItemReport {
  readonly targetKey: string
  readonly itemIdentifier: string
  readonly label: string
  readonly kind: MarketRefreshItemKind
  readonly city: MarketCityId
  readonly cityName: string
  readonly quality: number
  readonly strategy: PurchaseStrategy | SaleStrategy
  readonly previousValue: number | null
  readonly currentValue: number | null
  readonly updatedAt: string | null
  readonly outcome: MarketRefreshOutcome
}

export interface MarketRefreshReport {
  readonly id: number
  readonly rootKey: string
  readonly startedAt: string
  readonly completedAt: string
  readonly requestedCombinations: number
  readonly requestCount: number
  readonly updated: number
  readonly unchanged: number
  readonly missing: number
  readonly manualPreserved: number
  readonly items: readonly MarketRefreshItemReport[]
}

export function classifyMarketRefreshOutcome(
  previousValue: number | null,
  currentValue: number | null,
): MarketRefreshOutcome {
  if (currentValue === null) return 'missing'
  return previousValue === currentValue ? 'unchanged' : 'updated'
}
