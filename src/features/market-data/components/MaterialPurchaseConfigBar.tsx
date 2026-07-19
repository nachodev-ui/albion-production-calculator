import type {
  MarketCityId,
  MarketConfig,
  MarketDefinition,
  PurchaseStrategy,
} from '../types/MarketPrice'
import { PURCHASE_STRATEGY_LABELS } from '../types/MarketPrice'

interface MaterialPurchaseConfigBarProps {
  readonly config: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly materialCityOverrideCount: number
  readonly onChange: (patch: Partial<MarketConfig>) => void
  readonly onClearMaterialCities: () => void
}

export function MaterialPurchaseConfigBar({
  config,
  markets,
  materialCityOverrideCount,
  onChange,
  onClearMaterialCities,
}: MaterialPurchaseConfigBarProps) {
  const generalCityName =
    markets.find((market) => market.key === config.purchaseCity)?.name ??
    config.purchaseCity

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-medium text-text-faint">
            Ciudad para materiales
          </span>
          <select
            value={config.purchaseCity}
            onChange={(event) =>
              onChange({
                purchaseCity: event.target.value as MarketCityId,
              })
            }
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {markets.map((market) => (
              <option key={market.key} value={market.key}>
                {market.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] leading-relaxed text-text-faint">
            Se aplica a los materiales sin una selección individual.
          </span>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[11px] font-medium text-text-faint">
            Método de compra
          </span>
          <select
            value={config.purchaseStrategy}
            onChange={(event) =>
              onChange({
                purchaseStrategy: event.target.value as PurchaseStrategy,
              })
            }
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {(Object.keys(PURCHASE_STRATEGY_LABELS) as PurchaseStrategy[]).map(
              (strategy) => (
                <option key={strategy} value={strategy}>
                  {PURCHASE_STRATEGY_LABELS[strategy]}
                </option>
              ),
            )}
          </select>
          <span className="text-[10px] leading-relaxed text-text-faint">
            Define qué lado del mercado se usa para todos los materiales.
          </span>
        </label>

        <div className="flex min-h-full flex-col justify-end rounded-lg border border-border bg-surface-raised p-3 lg:min-w-56">
          <p className="text-xs text-text-muted">
            {materialCityOverrideCount > 0
              ? `${materialCityOverrideCount} ${
                  materialCityOverrideCount === 1
                    ? 'ciudad individual'
                    : 'ciudades individuales'
                }`
              : `Todos usan ${generalCityName}`}
          </p>
          <button
            type="button"
            disabled={materialCityOverrideCount === 0}
            onClick={onClearMaterialCities}
            className="mt-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Usar {generalCityName} en todos
          </button>
        </div>
      </div>
    </div>
  )
}
