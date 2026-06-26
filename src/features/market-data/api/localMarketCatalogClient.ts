import type { MarketDefinition, MarketType } from '../types/MarketPrice'
import { LOCAL_MARKET_API_URL } from './localMarketApi'

interface LocalMarketEnvelope {
  readonly data?: unknown
}

function isMarketType(value: unknown): value is MarketType {
  return value === 'regular' || value === 'black-market'
}

function mapMarket(value: unknown): MarketDefinition | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  if (
    typeof candidate['key'] !== 'string' ||
    candidate['key'].trim().length === 0 ||
    typeof candidate['name'] !== 'string' ||
    candidate['name'].trim().length === 0 ||
    !isMarketType(candidate['type']) ||
    typeof candidate['enabled'] !== 'boolean'
  ) {
    return null
  }

  return {
    key: candidate['key'].trim(),
    name: candidate['name'].trim(),
    type: candidate['type'],
    enabled: candidate['enabled'],
  }
}

export async function fetchLocalMarkets(
  signal?: AbortSignal,
): Promise<readonly MarketDefinition[]> {
  const response = await fetch(`${LOCAL_MARKET_API_URL}/markets`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(
      `El catálogo del receiver respondió con estado ${response.status}`,
    )
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') {
    throw new Error('El receiver local devolvió un catálogo inesperado')
  }

  const data = (payload as LocalMarketEnvelope).data
  if (!Array.isArray(data)) {
    throw new Error('El receiver local no devolvió la lista de mercados')
  }

  const markets = data.flatMap((entry) => {
    const market = mapMarket(entry)
    return market?.enabled ? [market] : []
  })

  if (markets.length === 0) {
    throw new Error('El receiver local no tiene mercados habilitados')
  }

  return markets
}
