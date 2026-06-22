import { useMemo } from 'react'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { useCraftTreeStore } from '../store/craftTreeStore'
import { compareRecipeOptions } from '../utils/compareRecipeOptions'

interface UseRecipeOptionComparisonParams {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  readonly unitSellPrice: number | null
  readonly repository: ItemRepository
  readonly automaticPrices: ReadonlyMap<string, number>
}

export function useRecipeOptionComparison({
  itemId,
  enchantment,
  quantity,
  unitSellPrice,
  repository,
  automaticPrices,
}: UseRecipeOptionComparisonParams) {
  const expandedPaths = useCraftTreeStore(
    (state) => state.expandedPaths,
  )

  const manualPrices = useCraftTreeStore(
    (state) => state.manualPrices,
  )

  const stationFeeConfig = useCraftTreeStore(
    (state) => state.stationFeeConfig,
  )

  const craftingSpecializationConfig = useCraftTreeStore(
    (state) => state.craftingSpecializationConfig,
  )

  const itemValueOverride = useCraftTreeStore(
    (state) => state.itemValueOverride,
  )

  const productionConfig = useCraftTreeStore(
    (state) => state.productionConfig,
  )

  const selectedRecipeOptions = useCraftTreeStore(
    (state) => state.selectedRecipeOptions,
  )

  const isPremium = useCraftTreeStore(
    (state) => state.isPremium,
  )

  return useMemo(
    () =>
      compareRecipeOptions({
        itemId,
        enchantment,
        quantity,
        unitSellPrice,
        isPremium,
        repository,
        config: {
          expandedPaths,
          manualPrices,
          automaticPrices,
          productionConfig,
          selectedRecipeOptions,
          stationFeeConfig,
          craftingSpecializationConfig,
          itemValueOverride,
        },
      }),
    [
      itemId,
      enchantment,
      quantity,
      unitSellPrice,
      isPremium,
      repository,
      expandedPaths,
      manualPrices,
      automaticPrices,
      productionConfig,
      stationFeeConfig,
      craftingSpecializationConfig,
      itemValueOverride,
      selectedRecipeOptions,
    ],
  )
}