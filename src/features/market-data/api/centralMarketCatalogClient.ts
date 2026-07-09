import type { CentralMarketCatalogEnvelope } from '@shared/contracts/market-api-payloads'
import { fetchJson } from '@shared/http/fetchJson'
import type { MarketDefinition, MarketType } from '../types/MarketPrice'
import {
  CENTRAL_MARKET_API_URL,
  MARKET_REQUEST_TIMEOUT_MS,
} from './localMarketApi'
import { runWithMarketSourceCooldown } from './marketSourceCooldown'

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

export async function fetchCentralMarkets(
  signal?: AbortSignal,
): Promise<readonly MarketDefinition[]> {
  return runWithMarketSourceCooldown('central-api', async () => {
    const payload = await fetchJson<CentralMarketCatalogEnvelope>(
      `${CENTRAL_MARKET_API_URL}/markets`,
      {
        signal,
        timeoutMs: MARKET_REQUEST_TIMEOUT_MS,
        retryAttempts: 1,
        headers: { Accept: 'application/json' },
      },
    )

    const data = payload.data

    if (!Array.isArray(data)) {
      throw new Error('La API central no devolvió la lista de mercados')
    }

    const markets = data.flatMap((entry) => {
      const market = mapMarket(entry)
      return market?.enabled ? [market] : []
    })

    if (markets.length === 0) {
      throw new Error('La API central no tiene mercados habilitados')
    }

    return markets
  })
}
