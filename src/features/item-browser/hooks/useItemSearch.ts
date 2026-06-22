import { useMemo, useState } from 'react'
import type { Item, ItemCategory } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'

export type CategoryBrowserMode = 'branches' | 'list'

export interface CategoryOption {
  readonly value: ItemCategory
  readonly label: string
  readonly description: string
  readonly browserMode: CategoryBrowserMode
}

/**
 * Categorías principales del catálogo.
 *
 * No existe una opción "Todos": cada tipo de objeto tiene reglas de
 * navegación distintas y el objetivo del browser es llevar gradualmente
 * cada categoría a una estructura propia de ramas/familias.
 */
export const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  {
    value: 'weapon',
    label: 'Armas',
    description: 'Ramas y líneas de armas',
    browserMode: 'branches',
  },
  {
    value: 'armor',
    label: 'Armaduras',
    description: 'Ramas del Destiny Board',
    browserMode: 'branches',
  },
  {
    value: 'offhand',
    label: 'Offhands',
    description: 'Escudos, libros y antorchas',
    browserMode: 'branches',
  },
  {
    value: 'accessory',
    label: 'Accesorios',
    description: 'Bolsas, capas y componentes',
    browserMode: 'branches',
  },
  {
    value: 'resource',
    label: 'Recursos',
    description: 'Materiales sin refinar',
    browserMode: 'list',
  },
  {
    value: 'refined_resource',
    label: 'Refinados',
    description: 'Materiales procesados',
    browserMode: 'list',
  },
  {
    value: 'food',
    label: 'Comida',
    description: 'Platos y consumibles',
    browserMode: 'list',
  },
  {
    value: 'potion',
    label: 'Pociones',
    description: 'Pociones y brebajes',
    browserMode: 'list',
  },
  {
    value: 'other',
    label: 'Otros',
    description: 'Objetos especiales',
    browserMode: 'list',
  },
]

export const DEFAULT_ITEM_CATEGORY: ItemCategory = 'armor'

/**
 * Estado del buscador del item-browser: texto libre + categoría.
 *
 * El catálogo siempre trabaja dentro de una categoría concreta. Esto evita
 * mezclar miles de objetos con jerarquías incompatibles y permite que cada
 * categoría adopte su propio navegador por ramas de forma progresiva.
 */
export function useItemSearch(repository: ItemRepository) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ItemCategory>(DEFAULT_ITEM_CATEGORY)

  const results = useMemo<readonly Item[]>(() => {
    const normalized = query.trim().toLowerCase()
    const base = repository.getAll(category)
    if (!normalized) return base
    return base.filter((item) => item.name.toLowerCase().includes(normalized))
  }, [repository, query, category])

  return { query, setQuery, category, setCategory, results }
}
