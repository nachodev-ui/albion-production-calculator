import type {
  MarketCityId,
  MarketDefinition,
  MaterialMarketPriceOption,
  SaleMarketPriceOption,
} from '@features/market-data/types/MarketPrice'

export type RefiningMarketOperation = 'purchase' | 'sale'
export type RefiningMarketCityBadge = 'best' | 'worst' | 'same' | 'only' | null
export type RefiningMarketCoverage = 'complete' | 'partial' | 'missing'

type ComparablePriceOption = MaterialMarketPriceOption | SaleMarketPriceOption

export interface RefiningMarketPriceGroup {
  readonly label: string
  readonly weight: number
  readonly options: readonly ComparablePriceOption[]
}

export interface RefiningMarketPriceRow {
  readonly label: string
  readonly value: number | null
  readonly updatedAt: string | null
}

export interface RefiningMarketCityOption {
  readonly city: MarketCityId
  readonly marketName: string
  readonly rows: readonly RefiningMarketPriceRow[]
  readonly aggregateValue: number | null
  readonly coverage: RefiningMarketCoverage
  readonly badge: RefiningMarketCityBadge
}

interface BuildRefiningMarketCityOptionsParams {
  readonly markets: readonly MarketDefinition[]
  readonly groups: readonly RefiningMarketPriceGroup[]
  readonly operation: RefiningMarketOperation
}

function withBadges(
  options: readonly RefiningMarketCityOption[],
  operation: RefiningMarketOperation,
): readonly RefiningMarketCityOption[] {
  const available = options.filter(
    (option): option is RefiningMarketCityOption & { aggregateValue: number } =>
      option.aggregateValue !== null,
  )

  if (available.length === 0) return options
  if (available.length === 1) {
    return options.map((option) =>
      option.city === available[0]?.city ? { ...option, badge: 'only' } : option,
    )
  }

  const values = available.map((option) => option.aggregateValue)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)

  if (minimum === maximum) {
    return options.map((option) =>
      option.aggregateValue === null ? option : { ...option, badge: 'same' },
    )
  }

  const best = operation === 'purchase' ? minimum : maximum
  const worst = operation === 'purchase' ? maximum : minimum

  return options.map((option) => {
    if (option.aggregateValue === best) return { ...option, badge: 'best' }
    if (option.aggregateValue === worst) return { ...option, badge: 'worst' }
    return option
  })
}

export function buildRefiningMarketCityOptions({
  markets,
  groups,
  operation,
}: BuildRefiningMarketCityOptionsParams): readonly RefiningMarketCityOption[] {
  const options = markets.map((market) => {
    const rows = groups.map((group) => {
      const source = group.options.find((option) => option.city === market.key)
      return {
        label: group.label,
        value: source?.value ?? null,
        updatedAt: source?.updatedAt ?? null,
      }
    })
    const availableRows = rows.filter((row) => row.value !== null)
    const coverage: RefiningMarketCoverage =
      availableRows.length === 0
        ? 'missing'
        : availableRows.length === rows.length
          ? 'complete'
          : 'partial'
    const aggregateValue =
      coverage === 'complete'
        ? groups.reduce((total, group, index) => {
            const value = rows[index]?.value ?? 0
            return total + value * Math.max(0, group.weight)
          }, 0)
        : null

    return {
      city: market.key,
      marketName: market.name,
      rows,
      aggregateValue,
      coverage,
      badge: null,
    } satisfies RefiningMarketCityOption
  })

  return withBadges(options, operation)
}
