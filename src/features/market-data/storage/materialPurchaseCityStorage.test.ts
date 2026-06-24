import { describe, expect, it } from 'vitest'
import {
  deserializeMaterialPurchaseCities,
  serializeMaterialPurchaseCities,
} from './materialPurchaseCityStorage'

describe('materialPurchaseCityStorage', () => {
  it('conserva las ciudades por producto raíz y material', () => {
    const source = new Map([
      [
        'T6_MAIN_CURSEDSTAFF_CRYSTAL@3',
        new Map([
          ['T6_METALBAR_LEVEL3@3', 'martlock' as const],
          ['T6_ARTEFACT_2H_CURSEDSTAFF_MORGANA@0', 'brecilien' as const],
        ]),
      ],
    ])

    const restored = deserializeMaterialPurchaseCities(
      JSON.parse(
        JSON.stringify(serializeMaterialPurchaseCities(source)),
      ) as unknown,
    )

    expect(
      restored
        .get('T6_MAIN_CURSEDSTAFF_CRYSTAL@3')
        ?.get('T6_METALBAR_LEVEL3@3'),
    ).toBe('martlock')
    expect(
      restored
        .get('T6_MAIN_CURSEDSTAFF_CRYSTAL@3')
        ?.get('T6_ARTEFACT_2H_CURSEDSTAFF_MORGANA@0'),
    ).toBe('brecilien')
  })

  it('conserva claves dinámicas e ignora entradas corruptas', () => {
    const restored = deserializeMaterialPurchaseCities({
      version: 1,
      roots: [
        {
          rootKey: 'T6_MAIN_CURSEDSTAFF_CRYSTAL@3',
          cities: [
            ['T6_METALBAR_LEVEL3@3', 'martlock'],
            ['T6_PLANKS_LEVEL3@3', 'avalon'],
            [42, 'brecilien'],
          ],
        },
      ],
    })

    const cities = restored.get('T6_MAIN_CURSEDSTAFF_CRYSTAL@3')
    expect(cities?.size).toBe(2)
    expect(cities?.get('T6_METALBAR_LEVEL3@3')).toBe('martlock')
    expect(cities?.get('T6_PLANKS_LEVEL3@3')).toBe('avalon')
  })
})
