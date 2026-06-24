import { describe, expect, it } from 'vitest'
import type { CraftCostNode } from '@core/domain/entities/CraftCostNode'
import { asBaseItemId } from '@core/domain/entities/Item'
import type { Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { collectMarketQuantityRequirements } from './collectMarketQuantityRequirements'

const parentId = asBaseItemId('T4_TEST_WEAPON')
const plankId = asBaseItemId('T4_PLANKS')
const artefactId = asBaseItemId('T4_ARTEFACT')

const parent: Item = {
  id: parentId,
  name: 'Arma de prueba',
  tier: 4,
  category: 'weapon',
  maxEnchantment: 0,
  recipe: {
    tiers: [
      {
        enchantment: 0,
        station: 'warrior_forge',
        outputQuantity: 1,
        silverFee: 0,
        craftingFocus: 0,
        ingredients: [
          { itemId: plankId, quantity: 16, enchantment: 0 },
          { itemId: artefactId, quantity: 1, enchantment: 0 },
        ],
        upgradeFrom: null,
      },
    ],
  },
}

const plank: Item = {
  id: plankId,
  name: 'Tablones',
  tier: 4,
  category: 'refined_resource',
  maxEnchantment: 0,
  recipe: null,
}

const artefact: Item = {
  id: artefactId,
  name: 'Artefacto',
  tier: 4,
  category: 'other',
  maxEnchantment: 0,
  recipe: null,
}

const items = [parent, plank, artefact]
const repository: ItemRepository = {
  getById(id) {
    return items.find((item) => item.id === id) ?? null
  },
  getAll() {
    return items
  },
  searchByName(query) {
    return items.filter((item) =>
      item.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
    )
  },
}

const root: CraftCostNode = {
  itemId: parent.id,
  enchantment: 0,
  quantity: 2,
  totalCost: 0,
  unitCost: 0,
  isManualPrice: false,
  priceSource: null,
  hasValidPrice: true,
  returnRate: {
    grossQuantity: 0,
    returnRate: 0.25,
    returnedQuantity: 0,
    netQuantity: 0,
  },
  recipeOptionIndex: 0,
  children: [
    {
      itemId: plank.id,
      enchantment: 0,
      quantity: 16,
      totalCost: 0,
      unitCost: 0,
      isManualPrice: true,
      priceSource: 'automatic',
      hasValidPrice: true,
      returnRate: null,
      recipeOptionIndex: null,
      children: [],
    },
    {
      itemId: artefact.id,
      enchantment: 0,
      quantity: 1,
      totalCost: 0,
      unitCost: 0,
      isManualPrice: true,
      priceSource: 'automatic',
      hasValidPrice: true,
      returnRate: null,
      recipeOptionIndex: null,
      children: [],
    },
  ],
}

describe('collectMarketQuantityRequirements', () => {
  it('escala el lote y descuenta RRR solo a materiales elegibles', () => {
    const result = collectMarketQuantityRequirements(root, repository)

    expect(result.get('T4_PLANKS@0')).toBe(24)
    expect(result.get('T4_ARTEFACT@0')).toBe(2)
  })
})
