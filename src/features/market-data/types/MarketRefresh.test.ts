import { describe, expect, it } from 'vitest'
import { classifyMarketRefreshOutcome } from './MarketRefresh'

describe('classifyMarketRefreshOutcome', () => {
  it('marca un precio nuevo o modificado como actualizado', () => {
    expect(classifyMarketRefreshOutcome(null, 1200)).toBe('updated')
    expect(classifyMarketRefreshOutcome(1200, 1250)).toBe('updated')
  })

  it('marca un precio idéntico como sin cambios', () => {
    expect(classifyMarketRefreshOutcome(1200, 1200)).toBe('unchanged')
  })

  it('marca la ausencia de precio actual como sin datos', () => {
    expect(classifyMarketRefreshOutcome(1200, null)).toBe('missing')
    expect(classifyMarketRefreshOutcome(null, null)).toBe('missing')
  })
})
