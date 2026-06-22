import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import { getRecipeOptions, getRecipeTier } from '@core/domain/entities/Recipe'
import { JsonItemRepository } from './JsonItemRepository'

const repository = new JsonItemRepository()

describe('dataset de equipo real', () => {
  it('incluye tres recetas para cada pieza real T4-T8', () => {
    const slots = ['HEAD', 'ARMOR', 'SHOES'] as const
    const materials = ['CLOTH', 'LEATHER', 'PLATE'] as const

    for (let tier = 4; tier <= 8; tier += 1) {
      for (const slot of slots) {
        for (const material of materials) {
          const item = repository.getById(
            asBaseItemId(`T${tier}_${slot}_${material}_ROYAL`),
          )

          expect(item).not.toBeNull()

          for (let enchantment = 0; enchantment <= 4; enchantment += 1) {
            const recipeTier = item?.recipe
              ? getRecipeTier(item.recipe, enchantment as 0 | 1 | 2 | 3 | 4)
              : null

            expect(recipeTier).not.toBeNull()
            expect(recipeTier ? getRecipeOptions(recipeTier) : []).toHaveLength(3)
          }
        }
      }
    }
  })

  it('mantiene el encantamiento en la pieza base y el sello real en 0', () => {
    const item = repository.getById(asBaseItemId('T4_ARMOR_PLATE_ROYAL'))
    const recipeTier = item?.recipe ? getRecipeTier(item.recipe, 2) : null
    const options = recipeTier ? getRecipeOptions(recipeTier) : []

    expect(options).toHaveLength(3)

    options.forEach((option, index) => {
      expect(option.ingredients[0]).toEqual({
        itemId: asBaseItemId(`T4_ARMOR_PLATE_SET${index + 1}`),
        enchantment: 2,
        quantity: 1,
      })
      expect(option.ingredients[1]).toEqual({
        itemId: asBaseItemId('QUESTITEM_TOKEN_ROYAL_T4'),
        enchantment: 0,
        quantity: 4,
      })
    })
  })

  it('incluye los sellos reales como componentes con precio manual', () => {
    for (let tier = 4; tier <= 8; tier += 1) {
      const sigil = repository.getById(
        asBaseItemId(`QUESTITEM_TOKEN_ROYAL_T${tier}`),
      )

      expect(sigil?.category).toBe('other')
      expect(sigil?.maxEnchantment).toBe(0)
      expect(sigil?.recipe).toBeNull()
    }
  })
})
