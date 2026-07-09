import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

export type AlbionServer = 'americas' | 'europe' | 'asia'
export type MarketKey = string
/** @deprecated Use MarketKey. Conservado para compatibilidad interna. */
export type MarketCityId = MarketKey
export type PurchaseStrategy = 'buy-now' | 'buy-order'
export type SaleStrategy = 'sell-order' | 'sell-now'
export type MarketQuality = 1 | 2 | 3 | 4 | 5
export type MarketRequestStatus = 'idle' | 'loading' | 'success' | 'error'
export type MarketType = 'regular' | 'black-market'

/** Fuente efectiva de un precio automático. */
export type MarketDataSource =
  | 'central-api'
  | 'local-receiver'
  | 'browser-cache'

export type MarketLastAttemptKind = 'catalog' | 'prices' | 'history'
export type MarketLastAttemptStatus = 'running' | 'success' | 'error'

export interface MarketLastAttempt {
  readonly kind: MarketLastAttemptKind
  readonly status: MarketLastAttemptStatus
  readonly startedAt: string
  readonly finishedAt: string | null
  readonly message: string
}

export interface MarketDefinition {
  readonly key: MarketKey
  readonly name: string
  readonly type: MarketType
  readonly enabled: boolean
}

export type MarketCatalogStatus = 'idle' | 'loading' | 'success' | 'error'

export type MarketPriceSource = 'automatic' | 'manual' | 'missing'
export type MaterialPurchaseCityOverrides = ReadonlyMap<string, MarketCityId>
export type MaterialPurchaseCitiesByRoot = ReadonlyMap<
  string,
  MaterialPurchaseCityOverrides
>
export type MarketPriceFreshness = 'recent' | 'acceptable' | 'stale' | 'missing'

export interface MarketConfig {
  readonly server: AlbionServer
  /** Fallback para materiales que no poseen una ciudad individual. */
  readonly purchaseCity: MarketCityId
  /** Mercado utilizado exclusivamente para el producto terminado. */
  readonly saleCity: MarketCityId
  readonly purchaseStrategy: PurchaseStrategy
  readonly saleStrategy: SaleStrategy
  /** Calidad del producto terminado consultado para venta e historial. */
  readonly quality: MarketQuality
}

export interface MarketPriceTarget {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
}

export interface MarketPriceSnapshot {
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly city: MarketCityId
  readonly quality: number
  readonly sellPriceMin: number | null
  readonly sellPriceMinDate: string | null
  /** Fuente del lado de venta; permite mezclar API central y receiver por campo. */
  readonly sellPriceSource?: MarketDataSource | null
  readonly buyPriceMax: number | null
  readonly buyPriceMaxDate: string | null
  /** Fuente del lado de compra; permite mezclar API central y receiver por campo. */
  readonly buyPriceSource?: MarketDataSource | null
  /** Fuente efectiva desde la que se obtuvo este snapshot. */
  readonly source: MarketDataSource
  /** Momento en que la aplicación obtuvo o restauró este snapshot. */
  readonly fetchedAt: string
}

export interface ResolvedMarketPrice {
  readonly value: number | null
  readonly source: MarketPriceSource
  readonly snapshot: MarketPriceSnapshot | null
}

export interface AutomaticMarketPriceDetail {
  readonly value: number | null
  /** Fecha de captura informada por el proveedor para el precio seleccionado. */
  readonly updatedAt: string | null
  readonly freshness: MarketPriceFreshness
  readonly source: MarketDataSource | null
  readonly snapshot: MarketPriceSnapshot | null
}

export type MaterialMarketPriceBadge =
  | 'best'
  | 'highest'
  | 'same'
  | 'only'
  | null

export interface MaterialMarketPriceOption {
  readonly city: MarketCityId
  readonly value: number | null
  readonly updatedAt: string | null
  readonly freshness: MarketPriceFreshness
  readonly source: MarketDataSource | null
  readonly badge: MaterialMarketPriceBadge
}

export interface SaleMarketPriceOption {
  readonly city: MarketCityId
  readonly value: number | null
  readonly updatedAt: string | null
  readonly freshness: MarketPriceFreshness
  readonly source: MarketDataSource | null
}

export type MaterialMarketPriceComparisons = ReadonlyMap<
  string,
  readonly MaterialMarketPriceOption[]
>

export interface MarketFreshnessSummary {
  readonly recent: number
  readonly acceptable: number
  readonly stale: number
  readonly missing: number
}

export interface MarketSourceSummary {
  centralApi: number
  localReceiver: number
  browserCache: number
  missing: number
}

export const MARKET_RECENT_MAX_AGE_MS = 30 * 60 * 1000
export const MARKET_ACCEPTABLE_MAX_AGE_MS = 6 * 60 * 60 * 1000

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  server: 'americas',
  purchaseCity: 'martlock',
  saleCity: 'martlock',
  purchaseStrategy: 'buy-now',
  saleStrategy: 'sell-order',
  quality: 1,
}

export const MARKET_QUALITIES: readonly MarketQuality[] = [1, 2, 3, 4, 5]

export const MARKET_QUALITY_LABELS: Record<MarketQuality, string> = {
  1: 'Normal',
  2: 'Bueno',
  3: 'Sobresaliente',
  4: 'Excelente',
  5: 'Obra maestra',
}

/** Los materiales de crafteo no poseen calidad en el mercado. */
export const MATERIAL_MARKET_QUALITY: MarketQuality = 1

export function formatMarketQuality(quality: number): string {
  return MARKET_QUALITY_LABELS[quality as MarketQuality] ?? `Calidad ${quality}`
}

export const MARKET_SERVER_LABELS: Record<AlbionServer, string> = {
  americas: 'Americas',
  europe: 'Europe',
  asia: 'Asia',
}

export const MARKET_DATA_SOURCE_LABELS: Record<MarketDataSource, string> = {
  'central-api': 'API central',
  'local-receiver': 'Receiver local',
  'browser-cache': 'Caché del navegador',
}

export const PURCHASE_STRATEGY_LABELS: Record<PurchaseStrategy, string> = {
  'buy-now': 'Comprar inmediatamente',
  'buy-order': 'Colocar orden de compra',
}

export const SALE_STRATEGY_LABELS: Record<SaleStrategy, string> = {
  'sell-order': 'Vender mediante orden',
  'sell-now': 'Vender inmediatamente',
}

export function getMarketName(
  markets: readonly MarketDefinition[],
  marketKey: MarketKey,
): string {
  return markets.find((market) => market.key === marketKey)?.name ?? marketKey
}

export function isUsableMarket(market: MarketDefinition): boolean {
  return market.enabled
}

export const EMPTY_MARKET_FRESHNESS_SUMMARY: MarketFreshnessSummary = {
  recent: 0,
  acceptable: 0,
  stale: 0,
  missing: 0,
}

export function buildMarketItemIdentifier(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
): string {
  return enchantment > 0 ? `${itemId}@${enchantment}` : String(itemId)
}

export function buildItemPriceKey(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
): string {
  return `${itemId}@${enchantment}`
}

export function resolveMaterialPurchaseCity(
  overrides: MaterialPurchaseCityOverrides | undefined,
  itemPriceKey: string,
  defaultCity: MarketCityId,
): MarketCityId {
  return overrides?.get(itemPriceKey) ?? defaultCity
}
