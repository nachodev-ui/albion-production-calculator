import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '../../domain/entities/Item'
import type { RecipeOption } from '../../domain/entities/Recipe'
import { buildRoyalRecipeRequirements } from '../buildRoyalRecipeRequirements'

const BASE_JACKET = asBaseItemId('T4_ARMOR_LEATHER_SET1')
const ROYAL_SIGIL = asBaseItemId('QUESTITEM_TOKEN_ROYAL_T4')
const LEATHER = asBaseItemId('T4_LEATHER')

function buildRoyalOption(outputQuantity = 1): RecipeOption {
  return {
    ingredients: [
      {
        itemId: BASE_JACKET,
        enchantment: 3,
        quantity: 1,
      },
      {
        itemId: ROYAL_SIGIL,
        enchantment: 0,
        quantity: 4,
      },
    ],
    outputQuantity,
    silverFee: 0,
    craftingFocus: 0,
  }
}

describe('buildRoyalRecipeRequirements', () => {
  it('escala la pieza base y los Sellos Reales para el lote completo', () => {
    expect(buildRoyalRecipeRequirements(buildRoyalOption(), 3)).toEqual({
      requestedOutputQuantity: 3,
      craftsNeeded: 3,
      requirements: [
        {
          itemId: BASE_JACKET,
          enchantment: 3,
          quantity: 3,
          kind: 'base_piece',
        },
        {
          itemId: ROYAL_SIGIL,
          enchantment: 0,
          quantity: 12,
          kind: 'royal_sigil',
        },
      ],
    })
  })

  it('respeta recetas que producen más de una unidad por tirada', () => {
    const result = buildRoyalRecipeRequirements(buildRoyalOption(2), 6)

    expect(result?.craftsNeeded).toBe(3)
    expect(result?.requirements.map((requirement) => requirement.quantity)).toEqual([
      3, 12,
    ])
  })

  it('no clasifica recetas normales como Royal', () => {
    const normalOption: RecipeOption = {
      ingredients: [
        {
          itemId: LEATHER,
          enchantment: 0,
          quantity: 8,
        },
      ],
      outputQuantity: 1,
      silverFee: 0,
      craftingFocus: 0,
    }

    expect(buildRoyalRecipeRequirements(normalOption, 2)).toBeNull()
  })

  it('rechaza cantidades y rendimientos inválidos', () => {
    expect(buildRoyalRecipeRequirements(buildRoyalOption(), 0)).toBeNull()
    expect(
      buildRoyalRecipeRequirements(
        {
          ...buildRoyalOption(),
          outputQuantity: 0,
        },
        1,
      ),
    ).toBeNull()
  })
})
