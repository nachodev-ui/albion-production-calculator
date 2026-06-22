import type {
  AlbionServer,
  MarketCityId,
  MarketConfig,
  MarketRequestStatus,
  PurchaseStrategy,
  SaleStrategy,
} from '../types/MarketPrice'
import {
  MARKET_CITIES,
  MARKET_SERVER_LABELS,
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
} from '../types/MarketPrice'

interface MarketConfigCardProps {
  readonly config: MarketConfig
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly hasCachedPrice: boolean
  readonly priceCount: number
  readonly onChange: (patch: Partial<MarketConfig>) => void
  readonly onRefresh: () => void
  readonly onClearCache: () => void
}

function getStatusPresentation(
  status: MarketRequestStatus,
  hasCachedPrice: boolean,
): { label: string; className: string } {
  if (status === 'loading') {
    return {
      label: 'Consultando AODP…',
      className: 'border-border bg-surface text-text-muted',
    }
  }

  if (status === 'error') {
    return hasCachedPrice
      ? {
          label: 'Usando caché',
          className: 'border-accent-border bg-accent-muted text-accent',
        }
      : {
          label: 'Sin conexión',
          className: 'border-border bg-surface text-negative',
        }
  }

  if (status === 'success') {
    return {
      label: 'Precios actualizados',
      className: 'border-positive bg-positive-muted text-positive',
    }
  }

  return {
    label: 'Listo para consultar',
    className: 'border-border bg-surface text-text-faint',
  }
}

export function MarketConfigCard({
  config,
  status,
  error,
  hasCachedPrice,
  priceCount,
  onChange,
  onRefresh,
  onClearCache,
}: MarketConfigCardProps) {
  const statusPresentation = getStatusPresentation(status, hasCachedPrice)

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Configuración de mercado
          </h3>

          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-faint">
            Consulta precios actuales de Albion Online Data Project. Los precios
            manuales tienen prioridad y pueden volver al valor automático en
            cualquier momento.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${statusPresentation.className}`}
          >
            {statusPresentation.label}
          </span>

          <button
            type="button"
            disabled={status === 'loading'}
            onClick={onRefresh}
            className="rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong disabled:cursor-wait disabled:opacity-60"
          >
            Actualizar precios
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <span className="text-sm text-text-muted">Servidor</span>

          <select
            value={config.server}
            onChange={(event) =>
              onChange({ server: event.target.value as AlbionServer })
            }
            className="min-w-36 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {(Object.keys(MARKET_SERVER_LABELS) as AlbionServer[]).map(
              (server) => (
                <option key={server} value={server}>
                  {MARKET_SERVER_LABELS[server]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <span className="text-sm text-text-muted">Ciudad de compra</span>

          <select
            value={config.purchaseCity}
            onChange={(event) =>
              onChange({
                purchaseCity: event.target.value as MarketCityId,
              })
            }
            className="min-w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {MARKET_CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <span className="text-sm text-text-muted">Ciudad de venta</span>

          <select
            value={config.saleCity}
            onChange={(event) =>
              onChange({ saleCity: event.target.value as MarketCityId })
            }
            className="min-w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {MARKET_CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3 xl:col-span-1">
          <span className="text-sm text-text-muted">Compra de materiales</span>

          <select
            value={config.purchaseStrategy}
            onChange={(event) =>
              onChange({
                purchaseStrategy: event.target.value as PurchaseStrategy,
              })
            }
            className="min-w-48 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {(Object.keys(PURCHASE_STRATEGY_LABELS) as PurchaseStrategy[]).map(
              (strategy) => (
                <option key={strategy} value={strategy}>
                  {PURCHASE_STRATEGY_LABELS[strategy]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3 xl:col-span-1">
          <span className="text-sm text-text-muted">Venta del producto</span>

          <select
            value={config.saleStrategy}
            onChange={(event) =>
              onChange({ saleStrategy: event.target.value as SaleStrategy })
            }
            className="min-w-48 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {(Object.keys(SALE_STRATEGY_LABELS) as SaleStrategy[]).map(
              (strategy) => (
                <option key={strategy} value={strategy}>
                  {SALE_STRATEGY_LABELS[strategy]}
                </option>
              ),
            )}
          </select>
        </label>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <div>
            <p className="text-sm text-text-muted">Caché local</p>
            <p className="mt-0.5 text-[11px] text-text-faint">
              {priceCount > 0
                ? `${priceCount} precios automáticos disponibles`
                : 'Todavía no hay precios disponibles'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClearCache}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            Limpiar caché
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
          No se pudieron actualizar los precios: {error}.{' '}
          {hasCachedPrice
            ? 'Se mantienen los últimos datos guardados en este navegador.'
            : 'Puedes continuar ingresando precios manualmente.'}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
        La calidad consultada en esta primera versión es Normal. AODP depende
        de datos aportados por jugadores, por lo que siempre puedes reemplazar
        cualquier valor con un precio manual.
      </p>
    </section>
  )
}
