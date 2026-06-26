import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadMarketHistoryCache,
  saveMarketHistoryCache,
} from './marketHistoryStorage'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('marketHistoryStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('migra la caché anterior y marca el snapshot restaurado como browser-cache', () => {
    const storage = new MemoryStorage()
    const cacheKey = 'americas|martlock|T4_BAG|1'
    storage.setItem(
      'albion-production-calculator.local-market-history-cache.v2',
      JSON.stringify({
        version: 2,
        snapshots: [
          [
            cacheKey,
            {
              server: 'americas',
              city: 'martlock',
              itemIdentifier: 'T4_BAG',
              quality: 1,
              rangeStart: '2026-05-30',
              rangeEnd: '2026-06-26',
              points: [
                {
                  timestamp: '2026-06-25T00:00:00Z',
                  itemCount: 12,
                  averagePrice: 4500,
                },
              ],
              fetchedAt: new Date().toISOString(),
            },
          ],
        ],
      }),
    )
    vi.stubGlobal('window', { localStorage: storage })

    const restored = loadMarketHistoryCache()

    expect(restored.get(cacheKey)?.source).toBe('browser-cache')
    expect(
      storage.getItem('albion-production-calculator.market-history-cache.v3'),
    ).not.toBeNull()
  })

  it('persiste la versión vigente', () => {
    const storage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage: storage })

    saveMarketHistoryCache(
      new Map([
        [
          'americas|martlock|T4_BAG|1',
          {
            server: 'americas' as const,
            city: 'martlock',
            itemIdentifier: 'T4_BAG',
            quality: 1,
            rangeStart: '2026-05-30',
            rangeEnd: '2026-06-26',
            points: [],
            source: 'central-api' as const,
            fetchedAt: new Date().toISOString(),
          },
        ],
      ]),
    )

    const raw = storage.getItem(
      'albion-production-calculator.market-history-cache.v3',
    )
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: 3 })
  })
})
