import type {
  AlbionServer,
  MarketCityId,
} from './MarketPrice'

export type MarketHistoryPeriodDays = 7 | 28

export interface MarketHistoryPoint {
  /** Timestamp UTC entregado por el servicio local para el intervalo agregado. */
  readonly timestamp: string
  /** Precio promedio de órdenes de venta dentro del intervalo. */
  readonly averagePrice: number | null
  /** Cantidad de ítems registrada por el servicio local dentro del intervalo. */
  readonly itemCount: number
}

export interface MarketHistorySnapshot {
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly city: MarketCityId
  readonly quality: number
  /** Primer día UTC solicitado, en formato YYYY-MM-DD. */
  readonly rangeStart: string
  /** Último día UTC solicitado, en formato YYYY-MM-DD. */
  readonly rangeEnd: string
  readonly points: readonly MarketHistoryPoint[]
  /** Momento en que la aplicación consultó el servicio local. */
  readonly fetchedAt: string
}

export interface MarketHistorySummary {
  readonly periodDays: MarketHistoryPeriodDays
  readonly averagePrice: number | null
  /** Mediana de los precios diarios observados; se usa como referencia robusta. */
  readonly medianPrice: number | null
  readonly lowerQuartilePrice: number | null
  readonly upperQuartilePrice: number | null
  readonly minimumPrice: number | null
  readonly maximumPrice: number | null
  readonly totalVolume: number
  readonly averageDailyVolume: number
  /** Coeficiente de variación de los precios promedio diarios. */
  readonly volatilityPercent: number | null
  readonly observedPriceDays: number
  readonly activeVolumeDays: number
}

export interface MarketHistoryView {
  readonly points: readonly MarketHistoryPoint[]
  readonly summary: MarketHistorySummary
}

export interface MarketHistoryCandidate {
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly city: MarketCityId
  readonly quality: number
}

export interface MarketHistoryRefreshProgress {
  readonly completed: number
  readonly total: number
  readonly failed: number
}

export const MARKET_HISTORY_DAYS = 28
export const MARKET_HISTORY_CACHE_TTL_MS = 30 * 60 * 1000

export function buildMarketHistoryCacheKey(
  server: AlbionServer,
  city: MarketCityId,
  itemIdentifier: string,
  quality: number,
): string {
  return `${server}|${city}|${itemIdentifier}|${quality}`
}
