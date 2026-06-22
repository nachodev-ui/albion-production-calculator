import type { CityId } from '@core/domain/entities/City'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

export type AlbionServer = 'americas' | 'europe' | 'asia'
export type MarketCityId = Exclude<CityId, 'island'>
export type PurchaseStrategy = 'buy-now' | 'buy-order'
export type SaleStrategy = 'sell-order' | 'sell-now'
export type MarketRequestStatus = 'idle' | 'loading' | 'success' | 'error'
export type MarketPriceSource = 'automatic' | 'manual' | 'missing'
export type MarketPriceFreshness =
  | 'recent'
  | 'acceptable'
  | 'stale'
  | 'missing'

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

export interface AutomaticMarketPriceDetail {
  readonly value: number | null
  /** Fecha informada por AODP para el precio seleccionado. */
  readonly updatedAt: string | null
  readonly freshness: MarketPriceFreshness
  readonly snapshot: MarketPriceSnapshot | null
}

export interface MarketFreshnessSummary {
  readonly recent: number
  readonly acceptable: number
  readonly stale: number
  readonly missing: number
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

export function resolvePurchasePriceDate(
  snapshot: MarketPriceSnapshot | null | undefined,
  strategy: PurchaseStrategy,
): string | null {
  if (!snapshot) return null

  return strategy === 'buy-now'
    ? snapshot.sellPriceMinDate
    : snapshot.buyPriceMaxDate
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

export function resolveSalePriceDate(
  snapshot: MarketPriceSnapshot | null | undefined,
  strategy: SaleStrategy,
): string | null {
  if (!snapshot) return null

  return strategy === 'sell-order'
    ? snapshot.sellPriceMinDate
    : snapshot.buyPriceMaxDate
}

function parseMarketDate(updatedAt: string | null | undefined): number | null {
  if (!updatedAt) return null

  const timestamp = Date.parse(updatedAt)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function classifyMarketPriceFreshness(
  updatedAt: string | null | undefined,
  now = Date.now(),
): MarketPriceFreshness {
  const timestamp = parseMarketDate(updatedAt)
  if (timestamp === null) return 'missing'

  const age = Math.max(0, now - timestamp)

  if (age <= MARKET_RECENT_MAX_AGE_MS) return 'recent'
  if (age <= MARKET_ACCEPTABLE_MAX_AGE_MS) return 'acceptable'
  return 'stale'
}

export function formatMarketPriceRelativeAge(
  updatedAt: string | null | undefined,
  now = Date.now(),
): string {
  const timestamp = parseMarketDate(updatedAt)
  if (timestamp === null) return 'sin fecha de actualización'

  const age = Math.max(0, now - timestamp)
  if (age < 60 * 1000) return 'actualizado hace menos de 1 minuto'

  const relativeFormatter = new Intl.RelativeTimeFormat('es-CL', {
    numeric: 'always',
  })

  if (age < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(age / (60 * 1000)))
    return `actualizado ${relativeFormatter.format(-minutes, 'minute')}`
  }

  if (age < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.floor(age / (60 * 60 * 1000)))
    return `actualizado ${relativeFormatter.format(-hours, 'hour')}`
  }

  const days = Math.max(1, Math.floor(age / (24 * 60 * 60 * 1000)))
  return `actualizado ${relativeFormatter.format(-days, 'day')}`
}

export function formatMarketPriceExactDate(
  updatedAt: string | null | undefined,
): string {
  const timestamp = parseMarketDate(updatedAt)
  if (timestamp === null) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function resolvePurchasePriceDetail(
  snapshot: MarketPriceSnapshot | null | undefined,
  strategy: PurchaseStrategy,
  now = Date.now(),
): AutomaticMarketPriceDetail {
  const value = resolvePurchasePrice(snapshot, strategy)
  const updatedAt = value === null
    ? null
    : resolvePurchasePriceDate(snapshot, strategy)

  return {
    value,
    updatedAt,
    freshness: classifyMarketPriceFreshness(updatedAt, now),
    snapshot: snapshot ?? null,
  }
}

export function resolveSalePriceDetail(
  snapshot: MarketPriceSnapshot | null | undefined,
  strategy: SaleStrategy,
  now = Date.now(),
): AutomaticMarketPriceDetail {
  const value = resolveSalePrice(snapshot, strategy)
  const updatedAt = value === null
    ? null
    : resolveSalePriceDate(snapshot, strategy)

  return {
    value,
    updatedAt,
    freshness: classifyMarketPriceFreshness(updatedAt, now),
    snapshot: snapshot ?? null,
  }
}
