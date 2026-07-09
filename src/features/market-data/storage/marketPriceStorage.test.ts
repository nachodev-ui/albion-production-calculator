import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadMarketCache,
  saveMarketCache,
} from './marketPriceStorage'

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

describe('marketPriceStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('migra la caché legacy y elimina las claves antiguas', () => {
    const storage = new MemoryStorage()
    const cacheKey = 'americas|martlock|T4_BAG|1'
    storage.setItem(
      'albion-production-calculator.local-market-cache.v2',
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
              sellPriceMin: 4500,
              sellPriceMinDate: '2026-06-25T00:00:00Z',
              buyPriceMax: null,
              buyPriceMaxDate: null,
              fetchedAt: new Date().toISOString(),
            },
          ],
        ],
      }),
    )
    vi.stubGlobal('window', { localStorage: storage })

    const restored = loadMarketCache()

    expect(restored.get(cacheKey)?.source).toBe('browser-cache')
    expect(storage.getItem('albion-production-calculator.market-cache.v3')).not.toBeNull()
    expect(
      storage.getItem('albion-production-calculator.local-market-cache.v2'),
    ).toBeNull()
  })

  it('descarta snapshots vencidos', () => {
    const storage = new MemoryStorage()
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    storage.setItem(
      'albion-production-calculator.market-cache.v3',
      JSON.stringify({
        version: 3,
        snapshots: [
          [
            'americas|martlock|T4_BAG|1',
            {
              server: 'americas',
              city: 'martlock',
              itemIdentifier: 'T4_BAG',
              quality: 1,
              sellPriceMin: 4500,
              sellPriceMinDate: '2026-06-25T00:00:00Z',
              buyPriceMax: null,
              buyPriceMaxDate: null,
              fetchedAt: oldDate,
            },
          ],
        ],
      }),
    )
    vi.stubGlobal('window', { localStorage: storage })

    expect(loadMarketCache().size).toBe(0)
  })

  it('persiste la versión vigente', () => {
    const storage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage: storage })

    saveMarketCache(
      new Map([
        [
          'americas|martlock|T4_BAG|1',
          {
            server: 'americas' as const,
            city: 'martlock',
            itemIdentifier: 'T4_BAG',
            quality: 1,
            sellPriceMin: 4500,
            sellPriceMinDate: '2026-06-25T00:00:00Z',
            sellPriceSource: 'central-api' as const,
            buyPriceMax: null,
            buyPriceMaxDate: null,
            buyPriceSource: null,
            source: 'central-api' as const,
            fetchedAt: new Date().toISOString(),
          },
        ],
      ]),
    )

    const raw = storage.getItem('albion-production-calculator.market-cache.v3')
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: 3 })
  })
})
