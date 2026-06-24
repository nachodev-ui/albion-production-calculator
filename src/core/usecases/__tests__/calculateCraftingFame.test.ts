import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import { calculateCraftingFame } from '@core/usecases/calculateCraftingFame'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'

const repository = new JsonItemRepository()

describe('calculateCraftingFame', () => {
  it('calcula cinco túnicas de escamas feéricas 4.4 con Premium', () => {
    const result = calculateCraftingFame({
      itemId: asBaseItemId('T4_ARMOR_CLOTH_FEY'),
      enchantment: 4,
      quantity: 5,
      isPremium: true,
      repository,
    })

    expect(result).toEqual({
      famePerFinalItem: 5760,
      requestedQuantity: 5,
      craftsNeeded: 5,
      producedQuantity: 5,
      baseFame: 28800,
      premiumBonus: 14400,
      totalFame: 43200,
      journalFame: 28800,
      isPremium: true,
    })
  })

  it('no agrega fama extra por artefactos', () => {
    const result = calculateCraftingFame({
      itemId: asBaseItemId('T4_MAIN_FIRESTAFF_KEEPER'),
      enchantment: 0,
      quantity: 1,
      isPremium: false,
      repository,
    })

    expect(result?.famePerFinalItem).toBe(540)
    expect(result?.baseFame).toBe(540)
    expect(result?.premiumBonus).toBe(0)
  })

  it('conserva la fama del objeto base en una capa de facción', () => {
    const result = calculateCraftingFame({
      itemId: asBaseItemId('T4_CAPEITEM_FW_BRIDGEWATCH'),
      enchantment: 2,
      quantity: 1,
      isPremium: false,
      repository,
    })

    expect(result?.famePerFinalItem).toBe(720)
    expect(result?.journalFame).toBe(720)
  })

  it('resuelve el equipo real desde la alternativa elegida', () => {
    const result = calculateCraftingFame({
      itemId: asBaseItemId('T4_ARMOR_PLATE_ROYAL'),
      enchantment: 4,
      quantity: 1,
      isPremium: true,
      repository,
      recipeOptionIndex: 2,
    })

    expect(result?.famePerFinalItem).toBe(5760)
    expect(result?.totalFame).toBe(8640)
  })

  it('admite fama fraccionaria para recursos refinados', () => {
    const result = calculateCraftingFame({
      itemId: asBaseItemId('T4_CLOTH'),
      enchantment: 0,
      quantity: 1,
      isPremium: true,
      repository,
    })

    expect(result?.famePerFinalItem).toBe(22.5)
    expect(result?.premiumBonus).toBe(11.25)
    expect(result?.totalFame).toBe(33.75)
  })


  it.each([
    ['T2_ARMOR_CLOTH_SET1', 0, 24],
    ['T3_ARMOR_CLOTH_SET1', 0, 120],
    ['T4_ARMOR_CLOTH_SET1', 0, 360],
    ['T4_ARMOR_CLOTH_SET1', 1, 720],
    ['T4_ARMOR_CLOTH_SET1', 2, 1440],
    ['T4_ARMOR_CLOTH_SET1', 3, 2880],
    ['T4_ARMOR_CLOTH_SET1', 4, 5760],
    ['T5_ARMOR_CLOTH_SET1', 0, 1440],
    ['T5_ARMOR_CLOTH_SET1', 4, 23040],
    ['T6_ARMOR_CLOTH_SET1', 0, 4320],
    ['T6_ARMOR_CLOTH_SET1', 4, 69120],
    ['T7_ARMOR_CLOTH_SET1', 0, 10320],
    ['T7_ARMOR_CLOTH_SET1', 4, 165120],
    ['T8_ARMOR_CLOTH_SET1', 0, 22320],
    ['T8_ARMOR_CLOTH_SET1', 4, 357120],
  ] as const)(
    'cubre la progresión de tier y encantamiento para %s@%s',
    (itemId, enchantment, expectedFame) => {
      const result = calculateCraftingFame({
        itemId: asBaseItemId(itemId),
        enchantment,
        quantity: 1,
        isPremium: false,
        repository,
      })

      expect(result?.famePerFinalItem).toBe(expectedFame)
      expect(result?.baseFame).toBe(expectedFame)
      expect(result?.journalFame).toBe(expectedFame)
    },
  )

  it('devuelve null para componentes que no entregan fama de fabricación', () => {
    const result = calculateCraftingFame({
      itemId: asBaseItemId('T4_ARTEFACT_MAIN_FIRESTAFF_KEEPER'),
      enchantment: 0,
      quantity: 1,
      isPremium: true,
      repository,
    })

    expect(result).toBeNull()
  })
})
