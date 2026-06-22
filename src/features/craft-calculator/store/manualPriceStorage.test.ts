import { describe, expect, it } from 'vitest'
import {
  deserializeManualPrices,
  serializeManualPrices,
} from './manualPriceStorage'

describe('manualPriceStorage', () => {
  it('serializa y restaura precios por receta y path', () => {
    const source = new Map([
      [
        'SWORD@0',
        new Map([
          ['root-0', 1250],
          ['root-1', 0],
        ]),
      ],
    ])

    const restored = deserializeManualPrices(
      JSON.parse(JSON.stringify(serializeManualPrices(source))) as unknown,
    )

    expect(restored.get('SWORD@0')?.get('root-0')).toBe(1250)
    expect(restored.get('SWORD@0')?.has('root-1')).toBe(true)
    expect(restored.get('SWORD@0')?.get('root-1')).toBe(0)
  })

  it('ignora datos corruptos y precios negativos', () => {
    const restored = deserializeManualPrices({
      version: 1,
      roots: [
        {
          rootKey: 'SWORD@0',
          prices: [
            ['root-0', 100],
            ['root-1', -1],
            [42, 200],
          ],
        },
      ],
    })

    expect(restored.get('SWORD@0')?.get('root-0')).toBe(100)
    expect(restored.get('SWORD@0')?.has('root-1')).toBe(false)
    expect(restored.get('SWORD@0')?.size).toBe(1)
  })
})
