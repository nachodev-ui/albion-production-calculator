import type {
  AlbionServer,
  MarketCityId,
  MarketDataSource,
  MarketPriceSnapshot,
} from '../types/MarketPrice'

export interface MarketPriceRow {
  readonly server?: unknown
  readonly itemIdentifier?: unknown
  readonly marketKey?: unknown
  readonly location?: unknown
  readonly quality?: unknown
  readonly sellPriceMin?: unknown
  readonly sellPriceMinDate?: unknown
  readonly buyPriceMax?: unknown
  readonly buyPriceMaxDate?: unknown
}

export interface MarketPriceEnvelope {
  readonly data?: unknown
}

function normalizePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? value : null
}

function normalizeQuality(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : fallback
}

export function mapMarketPriceRow({
  server,
  fallbackCity,
  fallbackQuality,
  row,
  source,
  fetchedAt,
}: {
  readonly server: AlbionServer
  readonly fallbackCity?: MarketCityId
  readonly fallbackQuality: number
  readonly row: MarketPriceRow
  readonly source: MarketDataSource
  readonly fetchedAt: string
}): MarketPriceSnapshot | null {
  if (typeof row.itemIdentifier !== 'string') return null

  const marketKey =
    typeof row.marketKey === 'string' && row.marketKey.trim().length > 0
      ? row.marketKey.trim()
      : fallbackCity

  if (!marketKey) return null

  const sellPriceMin = normalizePrice(row.sellPriceMin)
  const buyPriceMax = normalizePrice(row.buyPriceMax)
  if (sellPriceMin === null && buyPriceMax === null) return null

  return {
    server,
    itemIdentifier: row.itemIdentifier,
    city: marketKey,
    quality: normalizeQuality(row.quality, fallbackQuality),
    sellPriceMin,
    sellPriceMinDate: normalizeDate(row.sellPriceMinDate),
    sellPriceSource: sellPriceMin === null ? null : source,
    buyPriceMax,
    buyPriceMaxDate: normalizeDate(row.buyPriceMaxDate),
    buyPriceSource: buyPriceMax === null ? null : source,
    source,
    fetchedAt,
  }
}

export function parsePriceRows(payload: unknown): readonly MarketPriceRow[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('El servicio de mercado devolvió una respuesta inesperada')
  }

  const rows = (payload as MarketPriceEnvelope).data
  if (!Array.isArray(rows)) {
    throw new Error(
      'El servicio de mercado no devolvió la lista de precios esperada',
    )
  }

  return rows.flatMap((candidate) =>
    candidate && typeof candidate === 'object'
      ? [candidate as MarketPriceRow]
      : [],
  )
}
