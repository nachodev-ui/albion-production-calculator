  import { useEffect, useMemo, useState } from 'react'
  import { formatEnchantment } from '@core/domain/entities/Enchantment'
  import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
  import { isVanityPlaceholder } from '@core/domain/entities/Item'
  import type { Item } from '@core/domain/entities/Item'
  import {
    getRecipeOption,
    getRecipeOptions,
    getRecipeTier,
  } from '@core/domain/entities/Recipe'
  import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
  import {
    getRecipeResolutionStatus,
    resolveRecipeTierIngredients,
  } from '@core/usecases/resolveRecipeIngredient'
  import type { RecipeResolutionStatus } from '@core/usecases/resolveRecipeIngredient'
  import { ItemIcon } from '@shared/components/ItemIcon'
  import { ManualPricePersistenceBar } from '@features/price-input/components/ManualPricePersistenceBar'
  import { TierBadge } from '@shared/components/TierBadge'
  import { useCraftCalculation } from '../../hooks/useCraftCalculation'
  import { useCraftTreeStore } from '../../store/craftTreeStore'
  import { CalculationReadinessBanner } from '../CalculationReadinessBanner'
  import { CalculationSummaryActions } from '../CalculationSummaryActions'
  import { CraftQuantityInput } from '../CraftQuantityInput'
  import { ProfitSummaryCard } from '../ProfitSummaryCard'
  import { ReturnRateSavingsCard } from '../ReturnRateSavingsCard'
  import { ReturnedMaterialsCard } from '../ReturnedMaterialsCard'
  import { ProductionConfigCard } from './ProductionConfigCard'
  import { RecipeOptionSelector } from './RecipeOptionSelector'
  import { RecipeTree } from './RecipeTree'
  import { useRecipeOptionComparison } from '../../hooks/useRecipeOptionComparison'
  import { RecipeOptionProfitComparisonCard } from './RecipeOptionProfitComparisonCard'

  interface ItemRecipeCardProps {
    readonly item: Item
    readonly enchantment: EnchantmentLevel
    readonly repository: ItemRepository
  }

  const STATUS_STYLE: Record<RecipeResolutionStatus, { label: string; className: string }> = {
    complete: { label: 'Receta completa', className: 'bg-positive-muted text-positive' },
    partial: { label: 'Parcialmente calculable', className: 'bg-accent-muted text-accent' },
    unresolved: { label: 'No craftable', className: 'bg-surface-raised text-text-faint' },
  }

  function formatSilver(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      maximumFractionDigits: 0,
    }).format(amount)
  }

  export function ItemRecipeCard({ item, enchantment, repository }: ItemRecipeCardProps) {
    const [quantity, setQuantity] = useState(1)
    const [unitSellPrice, setUnitSellPrice] = useState<number | null>(null)

    const isVanity = isVanityPlaceholder(item)
    const tier = item.recipe ? getRecipeTier(item.recipe, enchantment) : null
    const selectedRootOptionIndex = useCraftTreeStore(
      (state) => state.selectedRecipeOptions.get('root') ?? 0,
    )
    const setRecipeOption = useCraftTreeStore(
      (state) => state.setRecipeOption,
    )
    const recipeOptions = tier ? getRecipeOptions(tier) : []
    const normalizedRootOptionIndex =
      selectedRootOptionIndex >= 0 &&
      selectedRootOptionIndex < recipeOptions.length
        ? selectedRootOptionIndex
        : 0
    const selectedRecipeOption = tier
      ? getRecipeOption(tier, normalizedRootOptionIndex)
      : null

    const resolvedIngredients = useMemo(() => {
      if (!selectedRecipeOption) return []
      return resolveRecipeTierIngredients(
        selectedRecipeOption.ingredients,
        repository,
      )
    }, [selectedRecipeOption, repository])

    const status: RecipeResolutionStatus =
      isVanity || resolvedIngredients.length === 0
        ? 'unresolved'
        : getRecipeResolutionStatus(resolvedIngredients)

    const statusStyle = STATUS_STYLE[status]
    const resetForItem = useCraftTreeStore((state) => state.resetForItem)
    const productionConfig = useCraftTreeStore((state) => state.productionConfig)
    const setProductionConfig = useCraftTreeStore((state) => state.setProductionConfig)
    const stationFeeConfig = useCraftTreeStore((state) => state.stationFeeConfig)
    const setStationFeeConfig = useCraftTreeStore((state) => state.setStationFeeConfig)
    const craftingSpecializationConfig = useCraftTreeStore(
      (state) => state.craftingSpecializationConfig,
    )
    const setCraftingSpecializationConfig = useCraftTreeStore(
      (state) => state.setCraftingSpecializationConfig,
    )
    const itemValueOverride = useCraftTreeStore((state) => state.itemValueOverride)
    const setItemValueOverride = useCraftTreeStore(
      (state) => state.setItemValueOverride,
    )
    const isPremium = useCraftTreeStore((state) => state.isPremium)
    const setIsPremium = useCraftTreeStore((state) => state.setIsPremium)

    const specialtyKind =
      item.category === 'refined_resource'
        ? 'refining'
        : 'crafting'

    useEffect(() => {
      resetForItem(item.id, enchantment, tier !== null)
      // resetForItem ya evita reinicios si la clave no cambió.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id, enchantment])

    useEffect(() => {
      if (productionConfig.specialtyKind === specialtyKind) return

      setProductionConfig({
        ...productionConfig,
        specialtyKind,
      })
    }, [productionConfig, specialtyKind, setProductionConfig])

    const calculation = useCraftCalculation(
      item.id,
      enchantment,
      quantity,
      repository,
    )

    const recipeOptionComparisons = useRecipeOptionComparison({
      itemId: item.id,
      enchantment,
      quantity,
      unitSellPrice,
      repository,
    })

    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ItemIcon
              itemId={item.id}
              enchantment={enchantment}
              name={item.name}
              size={48}
            />

            <div className="min-w-0">
              <p className="truncate font-display text-lg text-text">
                {item.name}
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                <TierBadge tier={item.tier} />

                {enchantment > 0 && (
                  <span className="text-xs tabular text-text-faint">
                    {formatEnchantment(enchantment)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${statusStyle.className}`}
            >
              {statusStyle.label}
            </span>

            {tier && (
              <span
                className={`text-sm tabular ${
                  calculation.isComplete ? 'text-text' : 'text-accent'
                }`}
              >
                {!calculation.isComplete && (
                  <span className="font-sans text-xs">Costo parcial: </span>
                )}
                {formatSilver(calculation.grandTotal)}{' '}
                <span className="text-text-faint">plata</span>
              </span>
            )}
          </div>
        </div>

        {isVanity ? (
          <p className="text-sm text-text-faint">
            Este ítem no tiene una receta real asociada. Se excluye del catálogo de la
            calculadora.
          </p>
        ) : resolvedIngredients.length === 0 ? (
          <p className="text-sm text-text-faint">
            No hay receta disponible para este nivel de encantamiento.
          </p>
        ) : (
          <div>
            <ProductionConfigCard
              config={productionConfig}
              isPremium={isPremium}
              station={tier?.station ?? 'unknown'}
              stationFeeConfig={stationFeeConfig}
              craftingSpecializationConfig={craftingSpecializationConfig}
              detectedItemValue={item.itemValue ?? null}
              itemValueOverride={itemValueOverride}
              stationFeeBreakdown={calculation.stationFeeBreakdown}
              focusCostBreakdown={calculation.focusCostBreakdown}
              onChange={setProductionConfig}
              onPremiumChange={setIsPremium}
              onStationFeeConfigChange={setStationFeeConfig}
              onCraftingSpecializationConfigChange={
                setCraftingSpecializationConfig
              }
              onItemValueOverrideChange={setItemValueOverride}
            />

            <CraftQuantityInput
              value={quantity}
              onChange={setQuantity}
            />

            <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-text">
                  Materiales de la receta
                </h3>

                <p className="mt-1 text-xs text-text-faint">
                  Ingresa el precio unitario de los recursos y componentes necesarios.
                </p>
              </div>

              {tier && (
                <RecipeOptionSelector
                  tier={tier}
                  selectedIndex={normalizedRootOptionIndex}
                  repository={repository}
                  onChange={(optionIndex) =>
                    setRecipeOption('root', optionIndex)
                  }
                />
              )}

              <ManualPricePersistenceBar />

              <div className="mt-5">
                <RecipeTree
                  rootNode={calculation.root}
                  repository={repository}
                />
              </div>

              {calculation.totalStationFees > 0 && (
                <div className="mt-4 space-y-1 border-t border-border pt-3 text-center text-xs tabular text-text-faint">
                  <p>
                    Tarifas totales de estación: {formatSilver(calculation.totalStationFees)} plata
                  </p>
                  {calculation.stationUsageFee > 0 && (
                    <p>
                      Uso del puesto por nutrición: {formatSilver(calculation.stationUsageFee)} plata
                    </p>
                  )}
                </div>
              )}

              {status === 'partial' && (
                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-faint">
                  Los ingredientes especiales, como artefactos o componentes, deben tener un
                  precio ingresado manualmente. Se incluyen en el costo total, pero no reciben
                  retorno de recursos.
                </p>
              )}
            </section>

            <CalculationReadinessBanner
              missingPrices={calculation.missingPriceItems}
              repository={repository}
            />

            <ReturnRateSavingsCard
              totalCost={calculation.grandTotal}
              silverSaved={calculation.totalSilverSavedByReturnRate}
              quantity={quantity}
              stationUsageFee={calculation.stationUsageFee}
            />

            <ReturnedMaterialsCard
              materials={calculation.returnedMaterials}
              repository={repository}
            />

            <ProfitSummaryCard
              totalCost={calculation.grandTotal}
              quantity={quantity}
              isCalculationComplete={calculation.isComplete}
              isPremium={isPremium}
              onPremiumChange={setIsPremium}
              unitSellPrice={unitSellPrice}
              onUnitSellPriceChange={setUnitSellPrice}
            />

            {tier && (
              <RecipeOptionProfitComparisonCard
                tier={tier}
                comparisons={recipeOptionComparisons}
                selectedOptionIndex={normalizedRootOptionIndex}
                unitSellPrice={unitSellPrice}
                repository={repository}
                onSelect={(optionIndex) =>
                  setRecipeOption('root', optionIndex)
                }
              />
            )}

            <CalculationSummaryActions
              item={item}
              enchantment={enchantment}
              quantity={quantity}
              calculation={calculation}
              productionConfig={productionConfig}
              stationFeeConfig={stationFeeConfig}
              craftingSpecializationConfig={craftingSpecializationConfig}
              isPremium={isPremium}
              unitSellPrice={unitSellPrice}
              repository={repository}
            />
          </div>
        )}
      </div>
    )
  }
