import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import { JsonItemRepository } from './JsonItemRepository'

const repository = new JsonItemRepository()
const ALCHEMY_INGREDIENT_PATTERN =
  /^(?:T1_ALCHEMY_COMMON|T[357]_ALCHEMY_RARE_[A-Z0-9_]+)$/

function getShapeshifterIngredientIds(): readonly string[] {
  const ids = repository
    .getAll('weapon')
    .filter((item) => item.id.includes('SHAPESHIFTER'))
    .flatMap((item) =>
      (item.recipe?.tiers ?? []).flatMap((tier) => [
        ...tier.ingredients.map((ingredient) => ingredient.itemId),
        ...(tier.alternatives ?? []).flatMap((alternative) =>
          alternative.ingredients.map((ingredient) => ingredient.itemId),
        ),
      ]),
    )

  return [...new Set(ids)]
}

describe('ingredientes de bastones cambiaformas', () => {
  it('resuelve todos los ingredientes con nombres visibles', () => {
    const ingredients = getShapeshifterIngredientIds().map((id) => ({
      id,
      item: repository.getById(asBaseItemId(id)),
    }))

    expect(
      ingredients.filter(({ item }) => item === null).map(({ id }) => id),
    ).toEqual([])
    expect(
      ingredients
        .filter(({ id, item }) => item?.name === id)
        .map(({ id }) => id),
    ).toEqual([])
  })

  it('mantiene las piezas de alquimia como componentes comprables', () => {
    const alchemyIngredients = getShapeshifterIngredientIds()
      .filter((id) => ALCHEMY_INGREDIENT_PATTERN.test(id))
      .map((id) => repository.getById(asBaseItemId(id)))

    expect(alchemyIngredients).toHaveLength(22)
    expect(
      alchemyIngredients.every(
        (item) => item?.category === 'other' && item.recipe === null,
      ),
    ).toBe(true)
  })

  it('usa las traducciones oficiales para las piezas reportadas', () => {
    expect(
      repository.getById(asBaseItemId('T5_ALCHEMY_RARE_PANTHER'))?.name,
    ).toBe('Garras sombrías finas')
    expect(
      repository.getById(asBaseItemId('T5_ALCHEMY_RARE_WEREWOLF'))?.name,
    ).toBe('Colmillos de hombre lobo finos')
  })
})
