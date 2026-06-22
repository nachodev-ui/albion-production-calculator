import { useMemo } from 'react'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import type { CraftTreeConfig } from '@core/usecases/calculateCraftCost'
import { calculateCraftCost } from '@core/usecases/calculateCraftCost'
import { useCraftTreeStore } from '../store/craftTreeStore'

/**
 * Conecta el estado interactivo del store (qué está expandido, qué
 * precios se ingresaron y qué configuración global de producción se
 * eligió) con el usecase puro
 * `calculateCraftCost`, devolviendo el árbol de costo ya calculado
 * para el ítem raíz indicado.
 *
 * Recalcula con `useMemo` solo cuando cambia algo relevante — el
 * store puede tener estado de OTROS ítems vistos antes en la sesión
 * (si en el futuro se cachea por rootKey), así que no basta con
 * "cualquier cambio en el store" como dependencia.
 */
export function useCraftCalculation(
  itemId: BaseItemId,
  enchantment: EnchantmentLevel,
  quantity: number,
  repository: ItemRepository,
) {
  const expandedPaths = useCraftTreeStore((s) => s.expandedPaths)
  const manualPrices = useCraftTreeStore((s) => s.manualPrices)
  const productionConfig = useCraftTreeStore((s) => s.productionConfig)

  return useMemo(() => {
    const config: CraftTreeConfig = { expandedPaths, manualPrices, productionConfig }
    return calculateCraftCost(itemId, enchantment, quantity, repository, config)
  }, [itemId, enchantment, quantity, repository, expandedPaths, manualPrices, productionConfig])
}
