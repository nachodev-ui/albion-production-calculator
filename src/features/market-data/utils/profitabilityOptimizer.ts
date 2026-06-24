import type {
  MarketCityId,
  MaterialMarketPriceComparisons,
  MaterialMarketPriceOption,
  SaleMarketPriceOption,
} from '../types/MarketPrice'

export interface MaterialProfitabilityRecommendation {
  readonly itemPriceKey: string
  readonly label: string
  readonly currentCity: MarketCityId
  readonly recommendedCity: MarketCityId | null
  readonly currentUnitPrice: number | null
  readonly recommendedUnitPrice: number | null
  readonly unitSavings: number | null
  readonly cityChanged: boolean
}

export interface ProfitabilityMarketRecommendation {
  readonly materials: readonly MaterialProfitabilityRecommendation[]
  readonly materialCities: ReadonlyMap<string, MarketCityId>
  readonly automaticPurchasePrices: ReadonlyMap<string, number>
  readonly saleCity: MarketCityId | null
  readonly saleUnitPrice: number | null
  readonly currentSaleUnitPrice: number | null
  readonly materialChangeCount: number
  readonly saleCityChanged: boolean
  readonly missingMaterialCount: number
  readonly isComplete: boolean
}

interface BuildProfitabilityMarketRecommendationParams {
  readonly materialComparisons: MaterialMarketPriceComparisons
  readonly resolvedMaterialCities: ReadonlyMap<string, MarketCityId>
  readonly currentAutomaticPurchasePrices: ReadonlyMap<string, number>
  readonly targetLabels?: ReadonlyMap<string, string>
  readonly targetKeys?: ReadonlySet<string>
  readonly saleOptions: readonly SaleMarketPriceOption[]
  readonly defaultPurchaseCity: MarketCityId
  readonly currentSaleCity: MarketCityId
  readonly currentSaleUnitPrice: number | null
}

function selectMinimumOption(
  options: readonly MaterialMarketPriceOption[],
  currentCity: MarketCityId,
): MaterialMarketPriceOption | null {
  const available = options.filter(
    (option) =>
      option.value !== null &&
      Number.isFinite(option.value) &&
      option.value > 0,
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
): SaleMarketPriceOption | null {
  const available = options.filter(
    (option) =>
      option.value !== null &&
      Number.isFinite(option.value) &&
      option.value > 0,
  )

  if (available.length === 0) return null

  const maximum = Math.max(...available.map((option) => option.value ?? 0))
  return (
    available.find(
      (option) => option.city === currentCity && option.value === maximum,
    ) ?? available.find((option) => option.value === maximum) ?? null
  )
}

export function buildProfitabilityMarketRecommendation({
  materialComparisons,
  resolvedMaterialCities,
  currentAutomaticPurchasePrices,
  targetLabels = new Map(),
  targetKeys,
  saleOptions,
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
    const recommendedOption = selectMinimumOption(options, currentCity)
    const recommendedUnitPrice = recommendedOption?.value ?? null
    const recommendedCity = recommendedOption?.city ?? null

    if (recommendedCity !== null) {
      materialCities.set(itemPriceKey, recommendedCity)
    }

    if (recommendedUnitPrice !== null) {
      automaticPurchasePrices.set(itemPriceKey, recommendedUnitPrice)
    }

    materials.push({
      itemPriceKey,
      label: targetLabels.get(itemPriceKey) ?? itemPriceKey,
      currentCity,
      recommendedCity,
      currentUnitPrice,
      recommendedUnitPrice,
      unitSavings:
        currentUnitPrice !== null && recommendedUnitPrice !== null
          ? Math.max(0, currentUnitPrice - recommendedUnitPrice)
          : null,
      cityChanged:
        recommendedCity !== null && recommendedCity !== currentCity,
    })
  }

  const recommendedSale = selectMaximumSaleOption(saleOptions, currentSaleCity)
  const materialChangeCount = materials.filter((material) => material.cityChanged).length
  const missingMaterialCount = materials.filter(
    (material) => material.recommendedUnitPrice === null,
  ).length

  return {
    materials,
    materialCities,
    automaticPurchasePrices,
    saleCity: recommendedSale?.city ?? null,
    saleUnitPrice: recommendedSale?.value ?? null,
    currentSaleUnitPrice,
    materialChangeCount,
    saleCityChanged:
      recommendedSale !== null && recommendedSale.city !== currentSaleCity,
    missingMaterialCount,
    isComplete:
      materials.length > 0 &&
      missingMaterialCount === 0 &&
      recommendedSale !== null &&
      recommendedSale.value !== null,
  }
}
