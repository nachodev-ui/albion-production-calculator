import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import type { Item } from '@core/domain/entities/Item'
import { ItemSearchResults } from '../ItemSearchResults'

function createItem(partial: Partial<Item> & Pick<Item, 'id' | 'name'>): Item {
  return {
    id: partial.id,
    name: partial.name,
    tier: partial.tier ?? 4,
    category: partial.category ?? 'resource',
    maxEnchantment: partial.maxEnchantment ?? 0,
    itemValue: partial.itemValue ?? null,
    recipe: partial.recipe ?? null,
  }
}

function countOccurrences(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0
}

describe('item browser UI integration', () => {
  it('renders selectable item rows as native buttons with pressed state', () => {
    const ore = createItem({
      id: asBaseItemId('T4_ORE'),
      name: 'Mineral de titanio',
      tier: 4,
      category: 'resource',
    })
    const plank = createItem({
      id: asBaseItemId('T4_PLANKS'),
      name: 'Tablones de pino',
      tier: 4,
      category: 'refined_resource',
    })

    const markup = renderToStaticMarkup(
      <ItemSearchResults
        items={[ore, plank]}
        selectedId={ore.id}
        onSelect={vi.fn()}
      />,
    )

    expect(countOccurrences(markup, /<button\b/g)).toBe(2)
    expect(countOccurrences(markup, /type="button"/g)).toBe(2)
    expect(countOccurrences(markup, /aria-pressed="true"/g)).toBe(1)
    expect(countOccurrences(markup, /aria-pressed="false"/g)).toBe(1)
    expect(markup).toContain('Mineral de titanio')
    expect(markup).toContain('Tablones de pino')
    expect(markup).toContain('Recursos')
    expect(markup).toContain('Refinados')
  })

  it('keeps the empty search result state explicit', () => {
    const markup = renderToStaticMarkup(
      <ItemSearchResults items={[]} selectedId={null} onSelect={vi.fn()} />,
    )

    expect(markup).toContain('No hay ítems que coincidan con la búsqueda.')
    expect(markup).not.toContain('<button')
  })
})
