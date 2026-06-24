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
import { MarketConnectionBar } from '@features/market-data/components/MarketConnectionBar'
import { MaterialPurchaseConfigBar } from '@features/market-data/components/MaterialPurchaseConfigBar'
import { MarketHistoryCard } from '@features/market-data/components/MarketHistoryCard'
import { useCurrentMarketPrices } from '@features/market-data/hooks/useCurrentMarketPrices'
import { useMarketHistory } from '@features/market-data/hooks/useMarketHistory'
import { useMarketDataStore } from '@features/market-data/store/marketDataStore'
import type { MarketConfig } from '@features/market-data/types/MarketPrice'
import { buildItemPriceKey } from '@features/market-data/types/MarketPrice'
import { collectMarketPriceTargets } from '@features/market-data/utils/collectMarketPriceTargets'
import { buildProfitabilityMarketRecommendation } from '@features/market-data/utils/profitabilityOptimizer'
import {
  applyRecommendedProductionCity,
  getProductionCityRecommendation,
} from '../../utils/productionRecommendation'
import { ManualPricePersistenceBar } from '@features/price-input/components/ManualPricePersistenceBar'
import { ItemIcon } from '@shared/components/ItemIcon'
import { TierBadge } from '@shared/components/TierBadge'
import { useCraftCalculation } from '../../hooks/useCraftCalculation'
import { useRecipeOptionComparison } from '../../hooks/useRecipeOptionComparison'
import { useCraftTreeStore } from '../../store/craftTreeStore'
import { calculateCraftEconomicSummary } from '../../utils/profitCalculations'
import { CalculationReadinessBanner } from '../CalculationReadinessBanner'
import { CalculationSummaryActions } from '../CalculationSummaryActions'
import { CraftQuantityInput } from '../CraftQuantityInput'
import { ProfitSummaryCard } from '../ProfitSummaryCard'
import { ProfitabilityOptimizerCard } from '../ProfitabilityOptimizerCard'
import { ReturnRateSavingsCard } from '../ReturnRateSavingsCard'
import { ReturnedMaterialsCard } from '../ReturnedMaterialsCard'
import { ProductionConfigCard } from './ProductionConfigCard'
import { RecipeOptionProfitComparisonCard } from './RecipeOptionProfitComparisonCard'
import { RecipeOptionSelector } from './RecipeOptionSelector'
import { RecipeTree } from './RecipeTree'

interface ItemRecipeCardProps {
  readonly item: Item
  readonly enchantment: EnchantmentLevel
  readonly repository: ItemRepository
}

const STATUS_STYLE: Record<
  RecipeResolutionStatus,
  { label: string; className: string }
> = {
  complete: {
    label: 'Cálculo completo',
    className: 'bg-positive-muted text-positive',
  },
  partial: {
    label: 'Cálculo parcial',
    className: 'bg-accent-muted text-accent',
  },
  unresolved: {
    label: 'Sin receta',
    className: 'bg-surface-raised text-text-faint',
  },
}

const EMPTY_AUTOMATIC_PRICES = new Map<string, number>()

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ItemRecipeCard({
  item,
  enchantment,
  repository,
}: ItemRecipeCardProps) {
  const [quantity, setQuantity] = useState(1)
  const [historyComparison, setHistoryComparison] = useState<Pick<
    MarketConfig,
    'saleCity' | 'quality'
  > | null>(null)

  const isVanity = isVanityPlaceholder(item)
  const tier = item.recipe ? getRecipeTier(item.recipe, enchantment) : null
  const selectedRootOptionIndex = useCraftTreeStore(
    (state) => state.selectedRecipeOptions.get('root') ?? 0,
  )
  const setRecipeOption = useCraftTreeStore((state) => state.setRecipeOption)
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
  const setProductionConfig = useCraftTreeStore(
    (state) => state.setProductionConfig,
  )
  const stationFeeConfig = useCraftTreeStore((state) => state.stationFeeConfig)
  const setStationFeeConfig = useCraftTreeStore(
    (state) => state.setStationFeeConfig,
  )
  const craftingSpecializationConfig = useCraftTreeStore(
    (state) => state.craftingSpecializationConfig,
  )
  const setCraftingSpecializationConfig = useCraftTreeStore(
    (state) => state.setCraftingSpecializationConfig,
  )
  const itemValueOverride = useCraftTreeStore(
    (state) => state.itemValueOverride,
  )
  const setItemValueOverride = useCraftTreeStore(
    (state) => state.setItemValueOverride,
  )
  const stationUsageFeeOverride = useCraftTreeStore(
    (state) => state.stationUsageFeeOverride,
  )
  const setStationUsageFeeOverride = useCraftTreeStore(
    (state) => state.setStationUsageFeeOverride,
  )
  const manualMaterialPriceCount = useCraftTreeStore(
    (state) => state.manualPrices.size,
  )
  const isPremium = useCraftTreeStore((state) => state.isPremium)
  const setIsPremium = useCraftTreeStore((state) => state.setIsPremium)

  const rootMarketKey = `${item.id}@${enchantment}`
  const hasManualSellPrice = useMarketDataStore((state) =>
    state.manualSellPrices.has(rootMarketKey),
  )
  const manualSellPrice = useMarketDataStore(
    (state) => state.manualSellPrices.get(rootMarketKey) ?? null,
  )
  const setManualSellPrice = useMarketDataStore(
    (state) => state.setManualSellPrice,
  )

  const specialtyKind =
    item.category === 'refined_resource' ? 'refining' : 'crafting'
  const productionRecommendation = useMemo(
    () => getProductionCityRecommendation(item),
    [item],
  )

  useEffect(() => {
    resetForItem(item.id, enchantment, tier !== null)
    // resetForItem ya evita reinicios si la clave no cambió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, enchantment])

  useEffect(() => {
    const currentConfig = useCraftTreeStore.getState().productionConfig

    setProductionConfig(
      applyRecommendedProductionCity(
        currentConfig,
        productionRecommendation,
        specialtyKind,
      ),
    )
  }, [item.id, productionRecommendation, setProductionConfig, specialtyKind])

  /*
   * El primer cálculo solo descubre la estructura y las hojas que necesitan
   * precio. El segundo incorpora los valores automáticos recuperados del servicio local.
   */
  const structureCalculation = useCraftCalculation(
    item.id,
    enchantment,
    quantity,
    repository,
    EMPTY_AUTOMATIC_PRICES,
  )

  const materialPriceTargets = useMemo(
    () => collectMarketPriceTargets(structureCalculation.root, tier),
    [structureCalculation.root, tier],
  )
  const activeMaterialPriceTargets = useMemo(
    () => collectMarketPriceTargets(structureCalculation.root, null),
    [structureCalculation.root],
  )

  const saleTarget = useMemo(
    () => ({
      itemId: item.id,
      enchantment,
    }),
    [item.id, enchantment],
  )

  const marketTargetLabels = useMemo(() => {
    const labels = new Map<string, string>()

    for (const target of materialPriceTargets) {
      const key = buildItemPriceKey(target.itemId, target.enchantment)
      labels.set(
        key,
        repository.getById(target.itemId)?.name ?? String(target.itemId),
      )
    }

    labels.set(rootMarketKey, item.name)
    return labels
  }, [item.name, materialPriceTargets, repository, rootMarketKey])

  const activeOptimizerTargetKeys = useMemo(
    () =>
      new Set(
        activeMaterialPriceTargets.map((target) =>
          buildItemPriceKey(target.itemId, target.enchantment),
        ),
      ),
    [activeMaterialPriceTargets],
  )

  const market = useCurrentMarketPrices({
    rootKey: rootMarketKey,
    materialTargets: materialPriceTargets,
    reportMaterialTargets: activeMaterialPriceTargets,
    saleTarget,
    targetLabels: marketTargetLabels,
    manualOverrideCount:
      manualMaterialPriceCount + (hasManualSellPrice ? 1 : 0),
  })
  const historyConfig = useMemo<MarketConfig>(
    () => ({
      ...market.config,
      ...(historyComparison ?? {}),
    }),
    [historyComparison, market.config],
  )
  const marketHistory = useMarketHistory({
    saleTarget,
    config: historyConfig,
  })

  const calculation = useCraftCalculation(
    item.id,
    enchantment,
    quantity,
    repository,
    market.automaticPurchasePrices,
  )

  const profitabilityRecommendation = useMemo(
    () =>
      buildProfitabilityMarketRecommendation({
        materialComparisons: market.materialMarketPriceComparisons,
        resolvedMaterialCities: market.resolvedMaterialPurchaseCities,
        currentAutomaticPurchasePrices: market.automaticPurchasePrices,
        targetLabels: marketTargetLabels,
        targetKeys: activeOptimizerTargetKeys,
        saleOptions: market.saleMarketPriceOptions,
        defaultPurchaseCity: market.config.purchaseCity,
        currentSaleCity: market.config.saleCity,
        currentSaleUnitPrice: market.automaticSalePrice,
      }),
    [
      market.automaticPurchasePrices,
      market.automaticSalePrice,
      market.config.purchaseCity,
      market.config.saleCity,
      market.materialMarketPriceComparisons,
      market.resolvedMaterialPurchaseCities,
      market.saleMarketPriceOptions,
      marketTargetLabels,
      activeOptimizerTargetKeys,
    ],
  )

  const optimizedCalculation = useCraftCalculation(
    item.id,
    enchantment,
    quantity,
    repository,
    profitabilityRecommendation.automaticPurchasePrices,
  )

  const currentAutomaticEconomicSummary = useMemo(() => {
    if (calculation.isComplete === false || market.automaticSalePrice === null) {
      return null
    }

    return calculateCraftEconomicSummary({
      totalCost: calculation.grandTotal,
      recoveredMaterialValue: calculation.totalSilverSavedByReturnRate,
      quantity,
      unitSellPrice: market.automaticSalePrice,
      isPremium,
    })
  }, [calculation, isPremium, market.automaticSalePrice, quantity])

  const optimizedEconomicSummary = useMemo(() => {
    if (
      optimizedCalculation.isComplete === false ||
      profitabilityRecommendation.saleUnitPrice === null
    ) {
      return null
    }

    return calculateCraftEconomicSummary({
      totalCost: optimizedCalculation.grandTotal,
      recoveredMaterialValue:
        optimizedCalculation.totalSilverSavedByReturnRate,
      quantity,
      unitSellPrice: profitabilityRecommendation.saleUnitPrice,
      isPremium,
    })
  }, [
    isPremium,
    optimizedCalculation,
    profitabilityRecommendation.saleUnitPrice,
    quantity,
  ])

  const optimizerPurchaseSavings =
    calculation.isComplete && optimizedCalculation.isComplete
      ? Math.max(0, calculation.grandTotal - optimizedCalculation.grandTotal)
      : null
  const optimizerResultImprovement =
    currentAutomaticEconomicSummary && optimizedEconomicSummary
      ? optimizedEconomicSummary.economicResult -
        currentAutomaticEconomicSummary.economicResult
      : null

  const initialInvestment =
    calculation.grandTotal + calculation.totalSilverSavedByReturnRate

  const unitSellPrice = hasManualSellPrice
    ? manualSellPrice
    : market.automaticSalePrice

  const recipeOptionComparisons = useRecipeOptionComparison({
    itemId: item.id,
    enchantment,
    quantity,
    unitSellPrice,
    repository,
    automaticPrices: market.automaticPurchasePrices,
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

        <div className="flex max-w-[18rem] flex-col items-end gap-1.5 text-right">
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${statusStyle.className}`}
          >
            {statusStyle.label}
          </span>

          {tier && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-text-faint">
                {calculation.isComplete
                  ? 'Costo neto tras RRR'
                  : 'Costo neto parcial'}
              </p>
              <p
                className={`text-sm font-medium tabular ${
                  calculation.isComplete ? 'text-text' : 'text-accent'
                }`}
              >
                {formatSilver(calculation.grandTotal)}{' '}
                <span className="font-normal text-text-faint">plata</span>
              </p>

              <p className="mt-0.5 text-[10px] leading-relaxed text-text-faint">
                Inversión inicial {formatSilver(initialInvestment)} ·{' '}
                {calculation.totalSilverSavedByReturnRate > 0
                  ? `recuperas ${formatSilver(calculation.totalSilverSavedByReturnRate)}`
                  : 'sin retornos valorados'}
              </p>
            </div>
          )}
        </div>
      </div>

      {isVanity ? (
        <p className="text-sm text-text-faint">
          Este ítem no tiene una receta real asociada. Se excluye del catálogo
          de la calculadora.
        </p>
      ) : resolvedIngredients.length === 0 ? (
        <p className="text-sm text-text-faint">
          No hay receta disponible para este nivel de encantamiento.
        </p>
      ) : (
        <div>
          <MarketConnectionBar
            config={market.config}
            markets={market.markets}
            catalogStatus={market.catalogStatus}
            catalogError={market.catalogError}
            status={market.status}
            error={market.error}
            hasCachedPrice={market.hasAnyCachedPrice}
            priceCount={
              market.automaticPurchasePrices.size +
              (market.automaticSalePrice !== null ? 1 : 0)
            }
            freshnessSummary={market.freshnessSummary}
            refreshProgress={market.refreshProgress}
            refreshReport={market.refreshReport}
            onServerChange={(server) => market.setConfig({ server })}
            onRefresh={() => {
              void market.refresh()
              void marketHistory.refresh()
            }}
            onDismissRefreshReport={market.dismissRefreshReport}
            onClearCache={() => {
              market.clearCache()
              marketHistory.clearCache()
              void market.refresh()
              void marketHistory.refresh()
            }}
          />

          <ProductionConfigCard
            config={productionConfig}
            recommendation={productionRecommendation}
            isPremium={isPremium}
            station={tier?.station ?? 'unknown'}
            quantity={quantity}
            stationFeeConfig={stationFeeConfig}
            craftingSpecializationConfig={craftingSpecializationConfig}
            detectedItemValue={item.itemValue ?? null}
            itemValueOverride={itemValueOverride}
            stationUsageFeeOverride={stationUsageFeeOverride}
            stationFeeBreakdown={calculation.stationFeeBreakdown}
            focusCostBreakdown={calculation.focusCostBreakdown}
            onChange={setProductionConfig}
            onPremiumChange={setIsPremium}
            onStationFeeConfigChange={setStationFeeConfig}
            onCraftingSpecializationConfigChange={
              setCraftingSpecializationConfig
            }
            onItemValueOverrideChange={setItemValueOverride}
            onStationUsageFeeOverrideChange={setStationUsageFeeOverride}
          />

          <CraftQuantityInput value={quantity} onChange={setQuantity} />

          <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-text">
                Materiales de la receta
              </h3>

              <p className="mt-1 text-xs text-text-faint">
                Cada material puede usar una ciudad distinta. Los precios del
                servicio local se comparan entre todos los mercados y se aplican
                según la ciudad elegida. Cualquier valor manual conserva la
                prioridad.
              </p>
            </div>

            <MaterialPurchaseConfigBar
              config={market.config}
              markets={market.markets}
              materialCityOverrideCount={market.materialCityOverrideCount}
              onChange={market.setConfig}
              onClearMaterialCities={market.clearMaterialPurchaseCities}
            />

            {tier && (
              <RecipeOptionSelector
                tier={tier}
                selectedIndex={normalizedRootOptionIndex}
                repository={repository}
                onChange={(optionIndex) => setRecipeOption('root', optionIndex)}
              />
            )}

            <ManualPricePersistenceBar />

            <div className="mt-5">
              <RecipeTree
                rootNode={calculation.root}
                repository={repository}
                automaticPrices={market.automaticPurchasePrices}
                automaticPriceDetails={market.automaticPurchasePriceDetails}
                automaticPriceLabel={market.purchasePriceLabel}
                refreshResults={market.materialRefreshResults}
                marketStatus={market.status}
                defaultPurchaseCity={market.config.purchaseCity}
                markets={market.markets}
                materialMarketPriceComparisons={
                  market.materialMarketPriceComparisons
                }
                materialPurchaseCityOverrides={
                  market.materialPurchaseCityOverrides
                }
                onMaterialPurchaseCityChange={market.setMaterialPurchaseCity}
              />
            </div>

            {calculation.totalStationFees > 0 && (
              <div className="mt-4 space-y-1 border-t border-border pt-3 text-center text-xs tabular text-text-faint">
                <p>
                  Tarifas totales de estación:{' '}
                  {formatSilver(calculation.totalStationFees)} plata
                </p>
                {calculation.stationUsageFee > 0 && (
                  <p>
                    Costo de fabricación en el puesto:{' '}
                    {formatSilver(calculation.stationUsageFee)} plata
                  </p>
                )}
              </div>
            )}

            {status === 'partial' && (
              <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-faint">
                Los ingredientes especiales, como artefactos o componentes,
                también se consultan en el servicio local. Si no existen datos,
                puedes ingresar el precio manualmente; nunca reciben retorno de
                recursos.
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

          <ProfitabilityOptimizerCard
            recommendation={profitabilityRecommendation}
            markets={market.markets}
            marketStatus={market.status}
            currentTotalCost={calculation.grandTotal}
            optimizedTotalCost={optimizedCalculation.grandTotal}
            purchaseSavings={optimizerPurchaseSavings}
            currentEconomicResult={
              currentAutomaticEconomicSummary?.economicResult ?? null
            }
            optimizedEconomicResult={
              optimizedEconomicSummary?.economicResult ?? null
            }
            resultImprovement={optimizerResultImprovement}
            isManualSellPrice={hasManualSellPrice}
            manualMaterialPriceCount={manualMaterialPriceCount}
            onApply={() =>
              market.applyMarketRecommendation(
                profitabilityRecommendation.materialCities,
                profitabilityRecommendation.saleCity,
              )
            }
          />

          <ProfitSummaryCard
            key={`${rootMarketKey}:${hasManualSellPrice ? 'manual' : 'automatic'}:${unitSellPrice ?? 'missing'}`}
            totalCost={calculation.grandTotal}
            recoveredMaterialValue={calculation.totalSilverSavedByReturnRate}
            quantity={quantity}
            isCalculationComplete={calculation.isComplete}
            isPremium={isPremium}
            onPremiumChange={setIsPremium}
            unitSellPrice={unitSellPrice}
            automaticUnitSellPrice={market.automaticSalePrice}
            isManualSellPrice={hasManualSellPrice}
            automaticPriceLabel={market.salePriceLabel}
            automaticPriceUpdatedAt={market.automaticSalePriceDetail.updatedAt}
            marketStatus={market.status}
            refreshResult={market.saleRefreshResult}
            marketConfig={market.config}
            markets={market.markets}
            onMarketConfigChange={market.setConfig}
            onUnitSellPriceChange={(price) =>
              setManualSellPrice(rootMarketKey, price)
            }
            onUseAutomaticSellPrice={() =>
              setManualSellPrice(rootMarketKey, null)
            }
          />

          <MarketHistoryCard
            itemName={item.name}
            historyConfig={historyConfig}
            saleConfig={market.config}
            markets={market.markets}
            snapshot={marketHistory.snapshot}
            status={marketHistory.status}
            error={marketHistory.error}
            hasCachedHistory={marketHistory.hasCachedHistory}
            isComparing={historyComparison !== null}
            onComparisonChange={(patch) => {
              setHistoryComparison((current) => ({
                saleCity:
                  patch.saleCity ?? current?.saleCity ?? market.config.saleCity,
                quality:
                  patch.quality ?? current?.quality ?? market.config.quality,
              }))
            }}
            onStartComparison={() => {
              setHistoryComparison({
                saleCity: market.config.saleCity,
                quality: market.config.quality,
              })
            }}
            onFollowSale={() => setHistoryComparison(null)}
            onApplyToSale={() => {
              market.setConfig({
                saleCity: historyConfig.saleCity,
                quality: historyConfig.quality,
              })
              setHistoryComparison(null)
            }}
            onRefresh={() => {
              void marketHistory.refresh()
            }}
          />

          {tier && (
            <RecipeOptionProfitComparisonCard
              tier={tier}
              comparisons={recipeOptionComparisons}
              selectedOptionIndex={normalizedRootOptionIndex}
              unitSellPrice={unitSellPrice}
              repository={repository}
              onSelect={(optionIndex) => setRecipeOption('root', optionIndex)}
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
