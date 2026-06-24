import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import { groupMaterialPriceTargetsByCity } from './groupMaterialPriceTargets'

describe('groupMaterialPriceTargetsByCity', () => {
  it('separa cada material por su ciudad y conserva el fallback', () => {
    const targets = [
      { itemId: asBaseItemId('T6_METALBAR_LEVEL3'), enchantment: 3 as const },
      {
        itemId: asBaseItemId('T6_ARTEFACT_2H_CURSEDSTAFF_MORGANA'),
        enchantment: 0 as const,
      },
      { itemId: asBaseItemId('T6_PLANKS_LEVEL3'), enchantment: 3 as const },
    ]
    const overrides = new Map([
      ['T6_METALBAR_LEVEL3@3', 'martlock' as const],
      ['T6_ARTEFACT_2H_CURSEDSTAFF_MORGANA@0', 'brecilien' as const],
    ])

    const groups = groupMaterialPriceTargetsByCity(
      targets,
      overrides,
      'thetford',
    )

    expect(groups).toEqual(
      expect.arrayContaining([
        {
          city: 'martlock',
          itemIdentifiers: ['T6_METALBAR_LEVEL3@3'],
        },
        {
          city: 'brecilien',
          itemIdentifiers: ['T6_ARTEFACT_2H_CURSEDSTAFF_MORGANA'],
        },
        {
          city: 'thetford',
          itemIdentifiers: ['T6_PLANKS_LEVEL3@3'],
        },
      ]),
    )
  })

  it('deduplica materiales repetidos dentro de la misma ciudad', () => {
    const itemId = asBaseItemId('T6_METALBAR_LEVEL3')

    const groups = groupMaterialPriceTargetsByCity(
      [
        { itemId, enchantment: 3 },
        { itemId, enchantment: 3 },
      ],
      undefined,
      'martlock',
    )

    expect(groups).toEqual([
      {
        city: 'martlock',
        itemIdentifiers: ['T6_METALBAR_LEVEL3@3'],
      },
    ])
  })
})
