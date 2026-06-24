import type {
  MarketCityId,
  MaterialMarketPriceComparisons,
  MaterialMarketPriceOption,
  SaleMarketPriceOption,
} from '../types/MarketPrice'
import type { MarketLiquidityAssessment } from './marketLiquidity'
import type {
  MaterialLiquidityAssessments,
  SaleLiquidityAssessments,
} from './profitabilityLiquidity'

export interface RejectedMarketCandidate {
  readonly city: MarketCityId
  readonly unitPrice: number
  readonly liquidity: MarketLiquidityAssessment | null
}

export interface MaterialProfitabilityRecommendation {
  readonly itemPriceKey: string
  readonly label: string
  readonly requiredQuantity: number
  readonly currentCity: MarketCityId
  readonly recommendedCity: MarketCityId | null
  readonly currentUnitPrice: number | null
  readonly currentLiquidity: MarketLiquidityAssessment | null
  readonly recommendedUnitPrice: number | null
  readonly unitSavings: number | null
  readonly cityChanged: boolean
  readonly liquidity: MarketLiquidityAssessment | null
  readonly theoreticalBest: RejectedMarketCandidate | null
  readonly excludedCandidateCount: number
}

export interface ProfitabilityMarketRecommendation {
  readonly materials: readonly MaterialProfitabilityRecommendation[]
  readonly materialCities: ReadonlyMap<string, MarketCityId>
  readonly automaticPurchasePrices: ReadonlyMap<string, number>
  readonly saleCity: MarketCityId | null
  readonly saleUnitPrice: number | null
  readonly saleLiquidity: MarketLiquidityAssessment | null
  readonly theoreticalBestSale: RejectedMarketCandidate | null
  readonly currentSaleUnitPrice: number | null
  readonly currentSaleLiquidity: MarketLiquidityAssessment | null
  readonly materialChangeCount: number
  readonly saleCityChanged: boolean
  readonly missingMaterialCount: number
  readonly excludedCandidateCount: number
  readonly isComplete: boolean
}

interface BuildProfitabilityMarketRecommendationParams {
  readonly materialComparisons: MaterialMarketPriceComparisons
  readonly materialLiquidity: MaterialLiquidityAssessments
  readonly requiredMaterialQuantities: ReadonlyMap<string, number>
  readonly resolvedMaterialCities: ReadonlyMap<string, MarketCityId>
  readonly currentAutomaticPurchasePrices: ReadonlyMap<string, number>
  readonly targetLabels?: ReadonlyMap<string, string>
  readonly targetKeys?: ReadonlySet<string>
  readonly saleOptions: readonly SaleMarketPriceOption[]
  readonly saleLiquidity: SaleLiquidityAssessments
  readonly defaultPurchaseCity: MarketCityId
  readonly currentSaleCity: MarketCityId
  readonly currentSaleUnitPrice: number | null
}

function availableMaterialOptions(
  options: readonly MaterialMarketPriceOption[],
): readonly MaterialMarketPriceOption[] {
  return options.filter(
    (option) =>
      option.value !== null &&
      Number.isFinite(option.value) &&
      option.value > 0,
  )
}

function availableSaleOptions(
  options: readonly SaleMarketPriceOption[],
): readonly SaleMarketPriceOption[] {
  return options.filter(
    (option) =>
      option.value !== null &&
      Number.isFinite(option.value) &&
      option.value > 0,
  )
}

function selectMinimumOption(
  options: readonly MaterialMarketPriceOption[],
  currentCity: MarketCityId,
  liquidity: ReadonlyMap<MarketCityId, MarketLiquidityAssessment>,
): MaterialMarketPriceOption | null {
  const available = availableMaterialOptions(options).filter(
    (option) =>
      liquidity.get(option.city)?.isEligibleForRecommendation === true,
  )

  if (available.length === 0) return null

  const minimum = Math.min(...available.map((option) => option.value ?? Infinity))
  return (
    available.find(
      (option) => option.city === currentCity && option.value === minimum,
    ) ?? available.find((option) => option.value === minimum) ?? null
  )
}

function selectMaximumSaleOption(
  options: readonly SaleMarketPriceOption[],
  currentCity: MarketCityId,
  liquidity: SaleLiquidityAssessments,
): SaleMarketPriceOption | null {
  const available = availableSaleOptions(options).filter(
    (option) =>
      liquidity.get(option.city)?.isEligibleForRecommendation === true,
  )

  if (available.length === 0) return null

  const maximum = Math.max(...available.map((option) => option.value ?? 0))
  return (
    available.find(
      (option) => option.city === currentCity && option.value === maximum,
    ) ?? available.find((option) => option.value === maximum) ?? null
  )
}

function getTheoreticalMinimum(
  options: readonly MaterialMarketPriceOption[],
  recommended: MaterialMarketPriceOption | null,
  liquidity: ReadonlyMap<MarketCityId, MarketLiquidityAssessment>,
): RejectedMarketCandidate | null {
  const available = availableMaterialOptions(options)
  if (available.length === 0) return null

  const minimum = Math.min(...available.map((option) => option.value ?? Infinity))
  const theoretical = available.find((option) => option.value === minimum)

  if (
    !theoretical ||
    theoretical.city === recommended?.city ||
    theoretical.value === null
  ) {
    return null
  }

  return {
    city: theoretical.city,
    unitPrice: theoretical.value,
    liquidity: liquidity.get(theoretical.city) ?? null,
  }
}

function getTheoreticalMaximum(
  options: readonly SaleMarketPriceOption[],
  recommended: SaleMarketPriceOption | null,
  liquidity: SaleLiquidityAssessments,
): RejectedMarketCandidate | null {
  const available = availableSaleOptions(options)
  if (available.length === 0) return null

  const maximum = Math.max(...available.map((option) => option.value ?? 0))
  const theoretical = available.find((option) => option.value === maximum)

  if (
    !theoretical ||
    theoretical.city === recommended?.city ||
    theoretical.value === null
  ) {
    return null
  }

  return {
    city: theoretical.city,
    unitPrice: theoretical.value,
    liquidity: liquidity.get(theoretical.city) ?? null,
  }
}

export function buildProfitabilityMarketRecommendation({
  materialComparisons,
  materialLiquidity,
  requiredMaterialQuantities,
  resolvedMaterialCities,
  currentAutomaticPurchasePrices,
  targetLabels = new Map(),
  targetKeys,
  saleOptions,
  saleLiquidity,
  defaultPurchaseCity,
  currentSaleCity,
  currentSaleUnitPrice,
}: BuildProfitabilityMarketRecommendationParams): ProfitabilityMarketRecommendation {
  const materials: MaterialProfitabilityRecommendation[] = []
  const materialCities = new Map<string, MarketCityId>()
  const automaticPurchasePrices = new Map<string, number>()

  const materialEntries: readonly [string, readonly MaterialMarketPriceOption[]][] =
    targetKeys
      ? Array.from(targetKeys, (itemPriceKey) => [
          itemPriceKey,
          materialComparisons.get(itemPriceKey) ?? [],
        ])
      : Array.from(materialComparisons.entries())

  for (const [itemPriceKey, options] of materialEntries) {
    const currentCity =
      resolvedMaterialCities.get(itemPriceKey) ??
      options[0]?.city ??
      defaultPurchaseCity
    const currentOption = options.find((option) => option.city === currentCity)
    const currentUnitPrice =
      currentOption?.value ?? currentAutomaticPurchasePrices.get(itemPriceKey) ?? null
    const assessments = materialLiquidity.get(itemPriceKey) ?? new Map()
    const recommendedOption = selectMinimumOption(
      options,
      currentCity,
      assessments,
    )
    const recommendedUnitPrice = recommendedOption?.value ?? null
    const recommendedCity = recommendedOption?.city ?? null
    const theoreticalBest = getTheoreticalMinimum(
      options,
      recommendedOption,
      assessments,
    )

    if (recommendedCity !== null) {
      materialCities.set(itemPriceKey, recommendedCity)
    }

    if (recommendedUnitPrice !== null) {
      automaticPurchasePrices.set(itemPriceKey, recommendedUnitPrice)
    }

    const excludedCandidateCount = availableMaterialOptions(options).filter(
      (option) =>
        assessments.get(option.city)?.isEligibleForRecommendation !== true,
    ).length

    materials.push({
      itemPriceKey,
      label: targetLabels.get(itemPriceKey) ?? itemPriceKey,
      requiredQuantity: Math.max(
        1,
        Math.ceil(requiredMaterialQuantities.get(itemPriceKey) ?? 1),
      ),
      currentCity,
      recommendedCity,
      currentUnitPrice,
      currentLiquidity: assessments.get(currentCity) ?? null,
      recommendedUnitPrice,
      unitSavings:
        currentUnitPrice !== null && recommendedUnitPrice !== null
          ? Math.max(0, currentUnitPrice - recommendedUnitPrice)
          : null,
      cityChanged:
        recommendedCity !== null && recommendedCity !== currentCity,
      liquidity:
        recommendedCity !== null
          ? assessments.get(recommendedCity) ?? null
          : null,
      theoreticalBest,
      excludedCandidateCount,
    })
  }

  const recommendedSale = selectMaximumSaleOption(
    saleOptions,
    currentSaleCity,
    saleLiquidity,
  )
  const theoreticalBestSale = getTheoreticalMaximum(
    saleOptions,
    recommendedSale,
    saleLiquidity,
  )
  const materialChangeCount = materials.filter((material) => material.cityChanged).length
  const missingMaterialCount = materials.filter(
    (material) => material.recommendedUnitPrice === null,
  ).length
  const excludedSaleCandidates = availableSaleOptions(saleOptions).filter(
    (option) =>
      saleLiquidity.get(option.city)?.isEligibleForRecommendation !== true,
  ).length

  return {
    materials,
    materialCities,
    automaticPurchasePrices,
    saleCity: recommendedSale?.city ?? null,
    saleUnitPrice: recommendedSale?.value ?? null,
    saleLiquidity:
      recommendedSale !== null
        ? saleLiquidity.get(recommendedSale.city) ?? null
        : null,
    theoreticalBestSale,
    currentSaleUnitPrice,
    currentSaleLiquidity: saleLiquidity.get(currentSaleCity) ?? null,
    materialChangeCount,
    saleCityChanged:
      recommendedSale !== null && recommendedSale.city !== currentSaleCity,
    missingMaterialCount,
    excludedCandidateCount:
      materials.reduce(
        (sum, material) => sum + material.excludedCandidateCount,
        0,
      ) + excludedSaleCandidates,
    isComplete:
      materials.length > 0 &&
      missingMaterialCount === 0 &&
      recommendedSale !== null &&
      recommendedSale.value !== null,
  }
}
