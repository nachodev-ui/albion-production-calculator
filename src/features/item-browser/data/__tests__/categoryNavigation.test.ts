import { describe, expect, it } from 'vitest'
import type { ItemCategory } from '@core/domain/entities/Item'
import {
  CATEGORY_OPTIONS,
  DEFAULT_ITEM_CATEGORY,
} from '../../hooks/useItemSearch'

const EXPECTED_CATEGORIES: readonly ItemCategory[] = [
  'weapon',
  'armor',
  'offhand',
  'accessory',
  'resource',
  'refined_resource',
  'food',
  'potion',
  'other',
]

describe('navegación principal de categorías', () => {
  it('elimina la vista global Todos y conserva una entrada por categoría', () => {
    const values = CATEGORY_OPTIONS.map((option) => option.value)

    expect(values).toEqual(EXPECTED_CATEGORIES)
    expect(new Set(values).size).toBe(values.length)
    expect(values).not.toContain('all')
  })

  it('abre Armaduras por defecto y usa ramas en todo el equipamiento principal', () => {
    expect(DEFAULT_ITEM_CATEGORY).toBe('armor')

    for (const category of ['weapon', 'armor', 'offhand', 'accessory'] as const) {
      expect(
        CATEGORY_OPTIONS.find((option) => option.value === category)?.browserMode,
      ).toBe('branches')
    }
  })
})
