import { useState } from 'react'
import { asBaseItemId } from '@core/domain/entities/Item'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import { ItemRecipeCard } from './recipe/ItemRecipeCard'

const repository = new JsonItemRepository()

/**
 * Ejemplos reales que ilustran cada estado posible, elegidos a partir
 * de la investigación de los 791 ingredientes faltantes:
 * - normal: arma base, sin variante de facción.
 * - faction: arma de facción Undead, pide artefacto en todos los
 *   niveles de encantamiento.
 * - cape: capa de facción Avalon, pide blueprint de reputación.
 * - vanity: cosmético sin receta real, debería excluirse del catálogo
 *   (por eso se busca acá con getById, no con getAll/searchByName).
 */
const EXAMPLES = [
  { key: 'normal', label: 'Arma estándar', itemId: 'T8_2H_BOW' },
  { key: 'faction', label: 'Arma de facción', itemId: 'T8_2H_LONGBOW_UNDEAD' },
  { key: 'cape', label: 'Capa de facción', itemId: 'T8_CAPEITEM_AVALON' },
  { key: 'vanity', label: 'Cosmético', itemId: 'UNIQUE_ARMOR_VANITY_SKELETON_UNDEAD' },
] as const

type ExampleKey = (typeof EXAMPLES)[number]['key']

export function RecipeStatesDemo() {
  const [selectedKey, setSelectedKey] = useState<ExampleKey>('normal')
  const example = EXAMPLES.find((entry) => entry.key === selectedKey)!
  const item = repository.getById(asBaseItemId(example.itemId))

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex gap-2 mb-4 flex-wrap">
        {EXAMPLES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setSelectedKey(entry.key)}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              entry.key === selectedKey
                ? 'border-purple-400 text-purple-700 bg-purple-50'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {item ? (
        <ItemRecipeCard item={item} enchantment={0} repository={repository} />
      ) : (
        <p className="text-sm text-gray-400">No se encontró {example.itemId} en el dataset.</p>
      )}
    </div>
  )
}
