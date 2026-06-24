import type {
  AlbionServer,
  MarketDefinition,
  MarketPriceSnapshot,
  SaleMarketPriceOption,
  SaleStrategy,
} from '../types/MarketPrice'
import {
  buildMarketCacheKey,
  resolveSalePriceDetail,
} from '../types/MarketPrice'

interface BuildSaleMarketPriceOptionsParams {
  readonly markets: readonly MarketDefinition[]
  readonly snapshots: ReadonlyMap<string, MarketPriceSnapshot>
  readonly server: AlbionServer
  readonly itemIdentifier: string
  readonly quality: number
  readonly saleStrategy: SaleStrategy
  readonly now?: number
}

export function buildSaleMarketPriceOptions({
  markets,
  snapshots,
  server,
  itemIdentifier,
  quality,
  saleStrategy,
  now = Date.now(),
}: BuildSaleMarketPriceOptionsParams): readonly SaleMarketPriceOption[] {
  return markets.map((market) => {
    const snapshot = snapshots.get(
      buildMarketCacheKey(server, market.key, itemIdentifier, quality),
    )
    const detail = resolveSalePriceDetail(snapshot, saleStrategy, now)

    return {
      city: market.key,
      value: detail.value,
      updatedAt: detail.updatedAt,
      freshness: detail.freshness,
    }
  })
}
