import type {
  AlbionServer,
  MarketCatalogStatus,
  MarketCityId,
  MarketConfig,
  MarketDefinition,
  MarketFreshnessSummary,
  MarketRequestStatus,
  MarketQuality,
  PurchaseStrategy,
  SaleStrategy,
} from '../types/MarketPrice'
import {
  MARKET_QUALITIES,
  MARKET_QUALITY_LABELS,
  MARKET_SERVER_LABELS,
  PURCHASE_STRATEGY_LABELS,
  SALE_STRATEGY_LABELS,
} from '../types/MarketPrice'

interface MarketConfigCardProps {
  readonly config: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly catalogStatus: MarketCatalogStatus
  readonly catalogError: string | null
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly hasCachedPrice: boolean
  readonly priceCount: number
  readonly freshnessSummary: MarketFreshnessSummary
  readonly materialCityOverrideCount: number
  readonly onChange: (patch: Partial<MarketConfig>) => void
  readonly onRefresh: () => void
  readonly onClearCache: () => void
  readonly onClearMaterialCities: () => void
}

function getStatusPresentation(
  status: MarketRequestStatus,
  hasCachedPrice: boolean,
): { label: string; className: string } {
  if (status === 'loading') {
    return {
      label: 'Consultando fuentes de mercado…',
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
          label: 'Fuentes automáticas no disponibles',
          className: 'border-border bg-surface text-negative',
        }
  }

  if (status === 'success') {
    return {
      label: 'Datos automáticos disponibles',
      className: 'border-positive bg-positive-muted text-positive',
    }
  }

  return {
    label: 'Listo para consultar mercados',
    className: 'border-border bg-surface text-text-faint',
  }
}

export function MarketConfigCard({
  config,
  markets,
  catalogStatus,
  catalogError,
  status,
  error,
  hasCachedPrice,
  priceCount,
  freshnessSummary,
  materialCityOverrideCount,
  onChange,
  onRefresh,
  onClearCache,
  onClearMaterialCities,
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
            Consulta primero la API central y usa el receiver local como
            respaldo. Si ambos fallan, conserva la caché del navegador; los
            precios manuales mantienen prioridad sobre cualquier valor
            automático.
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
            disabled={
              status === 'loading' ||
              catalogStatus === 'loading' ||
              markets.length === 0
            }
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
          <div>
            <span className="text-sm text-text-muted">
              Ciudad predeterminada
            </span>
            <p className="mt-0.5 text-[10px] text-text-faint">
              Para materiales sin ciudad individual
            </p>
          </div>

          <select
            value={config.purchaseCity}
            onChange={(event) =>
              onChange({
                purchaseCity: event.target.value as MarketCityId,
              })
            }
            className="min-w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {markets.map((market) => (
              <option key={market.key} value={market.key}>
                {market.name}
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
            {markets.map((market) => (
              <option key={market.key} value={market.key}>
                {market.name}
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

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <div>
            <span className="text-sm text-text-muted">
              Calidad del producto
            </span>
            <p className="mt-0.5 text-[10px] text-text-faint">
              Se aplica al objeto vendido y a su historial
            </p>
          </div>

          <select
            value={config.quality}
            onChange={(event) =>
              onChange({
                quality: Number(event.target.value) as MarketQuality,
              })
            }
            className="min-w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            {MARKET_QUALITIES.map((quality) => (
              <option key={quality} value={quality}>
                {MARKET_QUALITY_LABELS[quality]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <div>
            <p className="text-sm text-text-muted">Ciudades por material</p>
            <p className="mt-0.5 text-[11px] text-text-faint">
              {materialCityOverrideCount > 0
                ? `${materialCityOverrideCount} asignaciones individuales`
                : 'Todos usan la ciudad predeterminada'}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
              Se configuran directamente en cada hoja de la receta.
            </p>
          </div>

          <button
            type="button"
            disabled={materialCityOverrideCount === 0}
            onClick={onClearMaterialCities}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restablecer
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-3">
          <div>
            <p className="text-sm text-text-muted">Caché local</p>
            <p className="mt-0.5 text-[11px] text-text-faint">
              {priceCount > 0
                ? `${priceCount} precios automáticos disponibles`
                : 'Todavía no hay precios disponibles'}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
              {freshnessSummary.recent} recientes ·{' '}
              {freshnessSummary.acceptable} aceptables ·{' '}
              {freshnessSummary.stale} antiguos · {freshnessSummary.missing} sin
              datos
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

      {catalogError && (
        <p className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs leading-relaxed text-negative">
          No se pudo cargar el catálogo de mercados: {catalogError}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
          No se pudieron actualizar los precios: {error}.{' '}
          {hasCachedPrice
            ? 'Se mantienen los últimos datos guardados en este navegador.'
            : 'Inicia scripts/receiver.ps1 o continúa ingresando precios manualmente.'}
        </p>
      )}

      {freshnessSummary.stale > 0 && (
        <p className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs leading-relaxed text-negative">
          Hay {freshnessSummary.stale}{' '}
          {freshnessSummary.stale === 1
            ? 'precio automático antiguo'
            : 'precios automáticos antiguos'}
          . Las hojas sin override manual seguirán utilizándolos, así que revisa
          la fecha mostrada junto a cada precio antes de decidir.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-text-faint">
        La ciudad de venta y la calidad se aplican únicamente al producto
        terminado. Cada material puede consultar una ciudad distinta desde su
        propia tarjeta; si no tiene una selección individual, usa la ciudad
        predeterminada. Los materiales siempre se consultan como Normal porque
        los recursos de crafteo no tienen calidad.
      </p>
    </section>
  )
}
