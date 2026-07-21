import type { MarketPriceEnvelope, MarketPriceRow } from '@shared/contracts/market-api-payloads'
import type {
  AlbionServer,
  MarketCityId,
  MarketDataSource,
  MarketPriceSnapshot,
} from '../types/MarketPrice'

function readField(row: MarketPriceRow, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function normalizePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

function normalizeNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : 0
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
  const itemIdentifier = readField(row, 'itemIdentifier')
  if (typeof itemIdentifier !== 'string') return null

  const marketKeyValue = readField(row, 'marketKey')
  const marketKey =
    typeof marketKeyValue === 'string' && marketKeyValue.trim().length > 0
      ? marketKeyValue.trim()
      : fallbackCity

  if (!marketKey) return null

  const sellPriceMin = normalizePrice(readField(row, 'sellPriceMin'))
  const buyPriceMax = normalizePrice(readField(row, 'buyPriceMax'))

  if (sellPriceMin === null && buyPriceMax === null) return null

  return {
    server,
    itemIdentifier,
    city: marketKey,
    quality: normalizeQuality(readField(row, 'quality'), fallbackQuality),
    sellPriceMin,
    sellPriceMinDate: normalizeDate(readField(row, 'sellPriceMinDate')),
    sellPriceSource: sellPriceMin === null ? null : source,
    buyPriceMax,
    buyPriceMaxDate: normalizeDate(readField(row, 'buyPriceMaxDate')),
    buyPriceSource: buyPriceMax === null ? null : source,
    source,
    fetchedAt,
    historyObservations7d: normalizeNonNegativeInteger(
      readField(row, 'historyObservations7d'),
    ),
    historyVolume7d: normalizeNonNegativeInteger(
      readField(row, 'historyVolume7d'),
    ),
    medianPrice7d: normalizePrice(readField(row, 'medianPrice7d')),
  } as MarketPriceSnapshot
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
