import type {
  AlbionServer,
  MarketCatalogStatus,
  MarketConfig,
  MarketDefinition,
  MarketFreshnessSummary,
  MarketRequestStatus,
} from '../types/MarketPrice'
import { MARKET_SERVER_LABELS } from '../types/MarketPrice'
import type {
  MarketRefreshProgress,
  MarketRefreshReport,
} from '../types/MarketRefresh'
import { MarketRefreshSummary } from './MarketRefreshFeedback'

interface MarketConnectionBarProps {
  readonly config: MarketConfig
  readonly markets: readonly MarketDefinition[]
  readonly catalogStatus: MarketCatalogStatus
  readonly catalogError: string | null
  readonly status: MarketRequestStatus
  readonly error: string | null
  readonly hasCachedPrice: boolean
  readonly priceCount: number
  readonly freshnessSummary: MarketFreshnessSummary
  readonly refreshProgress: MarketRefreshProgress | null
  readonly refreshReport: MarketRefreshReport | null
  readonly onServerChange: (server: AlbionServer) => void
  readonly onRefresh: () => void
  readonly onClearCache: () => void
  readonly onDismissRefreshReport: () => void
}

function getStatusPresentation(
  status: MarketRequestStatus,
  hasCachedPrice: boolean,
): { readonly label: string; readonly className: string } {
  if (status === 'loading') {
    return {
      label: 'Consultando servicio local…',
      className: 'border-border bg-surface text-text-muted',
    }
  }

  if (status === 'error') {
    return hasCachedPrice
      ? {
          label: 'Usando caché local',
          className: 'border-accent-border bg-accent-muted text-accent',
        }
      : {
          label: 'Servicio local desconectado',
          className: 'border-border bg-surface text-negative',
        }
  }

  if (status === 'success') {
    return {
      label: 'Servicio local conectado',
      className: 'border-positive bg-positive-muted text-positive',
    }
  }

  return {
    label: 'Listo para consultar',
    className: 'border-border bg-surface text-text-faint',
  }
}

export function MarketConnectionBar({
  config,
  markets,
  catalogStatus,
  catalogError,
  status,
  error,
  hasCachedPrice,
  priceCount,
  freshnessSummary,
  refreshProgress,
  refreshReport,
  onServerChange,
  onRefresh,
  onClearCache,
  onDismissRefreshReport,
}: MarketConnectionBarProps) {
  const statusPresentation = getStatusPresentation(status, hasCachedPrice)
  const isRefreshing =
    status === 'loading' || catalogStatus === 'loading'

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text">Mercado local</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-faint">
            Conexión global con el receptor local. La compra se configura junto
            a los materiales y la venta dentro del resumen económico.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2 sm:justify-start">
            <span className="text-xs text-text-faint">Servidor</span>
            <select
              value={config.server}
              onChange={(event) =>
                onServerChange(event.target.value as AlbionServer)
              }
              className="min-w-32 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
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

          <span
            className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium ${statusPresentation.className}`}
            aria-live="polite"
          >
            {statusPresentation.label}
          </span>

          <button
            type="button"
            disabled={isRefreshing || markets.length === 0}
            onClick={onRefresh}
            className="min-h-9 rounded-md border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? 'Actualizando…' : 'Actualizar todos los precios'}
          </button>
        </div>
      </div>

      <MarketRefreshSummary
        progress={refreshProgress}
        report={refreshReport}
        onDismiss={onDismissRefreshReport}
      />

      <details className="mt-3 rounded-lg border border-border bg-surface-raised">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-border">
          Diagnóstico avanzado
        </summary>

        <div className="border-t border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-[11px] text-text-faint">Receptor</p>
              <p className="mt-1 text-xs font-medium text-text">
                http://127.0.0.1:8787
              </p>
              <p className="mt-1 text-[10px] text-text-faint">
                Servicio persistente local
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-[11px] text-text-faint">
                Catálogo de mercados
              </p>
              <p className="mt-1 text-sm font-semibold tabular text-text">
                {markets.length} habilitados
              </p>
              <p className="mt-1 text-[10px] text-text-faint">
                Estado: {catalogStatus}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-[11px] text-text-faint">Caché de precios</p>
              <p className="mt-1 text-sm font-semibold tabular text-text">
                {priceCount} disponibles
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
                {freshnessSummary.recent} recientes ·{' '}
                {freshnessSummary.acceptable} aceptables ·{' '}
                {freshnessSummary.stale} antiguos ·{' '}
                {freshnessSummary.missing} sin datos
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
              <div>
                <p className="text-[11px] text-text-faint">
                  Mantenimiento local
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-text-faint">
                  Elimina precios e historial guardados en este navegador.
                </p>
              </div>

              <button
                type="button"
                onClick={onClearCache}
                className="shrink-0 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                Limpiar caché
              </button>
            </div>
          </div>

          {catalogError && (
            <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-negative">
              No se pudo cargar el catálogo de mercados: {catalogError}
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-accent-border bg-accent-muted px-3 py-2 text-xs leading-relaxed text-text-muted">
              No se pudieron actualizar los precios: {error}.{' '}
              {hasCachedPrice
                ? 'Se mantienen los últimos datos guardados en este navegador.'
                : 'Inicia scripts/receiver.ps1 o continúa con precios manuales.'}
            </p>
          )}

          {freshnessSummary.stale > 0 && (
            <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-negative">
              Hay {freshnessSummary.stale}{' '}
              {freshnessSummary.stale === 1
                ? 'precio automático antiguo'
                : 'precios automáticos antiguos'}
              . Revisa la fecha de cada precio antes de decidir.
            </p>
          )}
        </div>
      </details>
    </section>
  )
}
