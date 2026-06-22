import type { CityId } from '@core/domain/entities/City'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

export type AlbionServer = 'americas' | 'europe' | 'asia'
export type MarketCityId = Exclude<CityId, 'island'>
export type PurchaseStrategy = 'buy-now' | 'buy-order'
export type SaleStrategy = 'sell-order' | 'sell-now'
export type MarketRequestStatus = 'idle' | 'loading' | 'success' | 'error'
export type MarketPriceSource = 'automatic' | 'manual' | 'missing'

export interface MarketConfig {
  readonly server: AlbionServer
  readonly purchaseCity: MarketCityId
  readonly saleCity: MarketCityId
  readonly purchaseStrategy: PurchaseStrategy
  readonly saleStrategy: SaleStrategy
  /** AODP usa 1 para calidad Normal. */
  readonly quality: number
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
  readonly buyPriceMax: number | null
  readonly buyPriceMaxDate: string | null
  /** Momento en que nuestra aplicación consultó AODP. */
  readonly fetchedAt: string
}

export interface ResolvedMarketPrice {
  readonly value: number | null
  readonly source: MarketPriceSource
  readonly snapshot: MarketPriceSnapshot | null
}

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  server: 'americas',
  purchaseCity: 'martlock',
  saleCity: 'martlock',
  purchaseStrategy: 'buy-now',
  saleStrategy: 'sell-order',
  quality: 1,
}

export const MARKET_SERVER_LABELS: Record<AlbionServer, string> = {
  americas: 'Americas',
  europe: 'Europe',
  asia: 'Asia',
}

export const PURCHASE_STRATEGY_LABELS: Record<PurchaseStrategy, string> = {
  'buy-now': 'Comprar inmediatamente',
  'buy-order': 'Colocar orden de compra',
}

export const SALE_STRATEGY_LABELS: Record<SaleStrategy, string> = {
  'sell-order': 'Vender mediante orden',
  'sell-now': 'Vender inmediatamente',
}

export const MARKET_CITY_NAMES: Record<MarketCityId, string> = {
  martlock: 'Martlock',
  bridgewatch: 'Bridgewatch',
  lymhurst: 'Lymhurst',
  fort_sterling: 'Fort Sterling',
  thetford: 'Thetford',
  caerleon: 'Caerleon',
  brecilien: 'Brecilien',
}

export const MARKET_CITIES = Object.entries(MARKET_CITY_NAMES).map(
  ([id, name]) => ({ id: id as MarketCityId, name }),
)

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

export function buildMarketCacheKey(
  server: AlbionServer,
  city: MarketCityId,
  itemIdentifier: string,
  quality: number,
): string {
  return `${server}|${city}|${itemIdentifier}|${quality}`
}

export function resolvePurchasePrice(
  snapshot: MarketPriceSnapshot | null | undefined,
  strategy: PurchaseStrategy,
): number | null {
  if (!snapshot) return null

  return strategy === 'buy-now'
    ? snapshot.sellPriceMin
    : snapshot.buyPriceMax
}

export function resolveSalePrice(
  snapshot: MarketPriceSnapshot | null | undefined,
  strategy: SaleStrategy,
): number | null {
  if (!snapshot) return null

  return strategy === 'sell-order'
    ? snapshot.sellPriceMin
    : snapshot.buyPriceMax
}
