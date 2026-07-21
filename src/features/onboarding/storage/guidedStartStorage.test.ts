import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import {
  deserializeGuidedStartState,
  serializeGuidedStartState,
} from './guidedStartStorage'

describe('guidedStartStorage', () => {
  it('conserva objetos recientes, fijados y búsquedas válidas', () => {
    const state = deserializeGuidedStartState(
      JSON.parse(
        JSON.stringify(
          serializeGuidedStartState({
            recentItemIds: [
              asBaseItemId('T4_BAG'),
              asBaseItemId('T4_MAIN_SWORD'),
            ],
            pinnedItemIds: [asBaseItemId('T4_BAG')],
            recentSearches: [
              { query: 'bolsa', category: 'accessory' },
              { query: 'espada', category: 'weapon' },
            ],
          }),
        ),
      ) as unknown,
    )

    expect(state.recentItemIds).toEqual(['T4_BAG', 'T4_MAIN_SWORD'])
    expect(state.pinnedItemIds).toEqual(['T4_BAG'])
    expect(state.recentSearches).toEqual([
      { query: 'bolsa', category: 'accessory' },
      { query: 'espada', category: 'weapon' },
    ])
  })

  it('deduplica y descarta datos corruptos', () => {
    const state = deserializeGuidedStartState({
      version: 1,
      recentItemIds: ['T4_BAG', 'T4_BAG', '', 42],
      pinnedItemIds: ['T4_MAIN_SWORD', null],
      recentSearches: [
        { query: '  bolsa  ', category: 'accessory' },
        { query: 'BOLSA', category: 'accessory' },
        { query: 'x', category: 'weapon' },
        { query: 'metal', category: 'unknown' },
      ],
    })

    expect(state.recentItemIds).toEqual(['T4_BAG'])
    expect(state.pinnedItemIds).toEqual(['T4_MAIN_SWORD'])
    expect(state.recentSearches).toEqual([
      { query: 'bolsa', category: 'accessory' },
    ])
  })
})
