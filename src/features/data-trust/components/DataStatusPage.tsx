import { useCallback, useEffect, useState } from 'react'
import { CENTRAL_MARKET_API_URL } from '@features/market-data/api/localMarketApi'

interface CoverageRow {
  readonly key: string
  readonly name: string
  readonly total_objects: number
  readonly recent_objects: number
  readonly recent_objects_percent: number
  readonly last_updated_at: string | null
}

interface DataTrustStatus {
  readonly status: 'ok' | 'unavailable'
  readonly generated_at: string
  readonly recent_window_minutes: number
  readonly last_price_reception_at: string | null
  readonly last_history_reception_at: string | null
  readonly total_objects: number
  readonly recent_objects: number
  readonly recent_objects_percent: number
  readonly servers: readonly CoverageRow[]
  readonly markets: readonly CoverageRow[]
}

interface ApiStatusResponse {
  readonly status: 'ok' | 'degraded'
  readonly service: string
  readonly now: string
  readonly database: { readonly status: string }
  readonly data_trust: DataTrustStatus
}

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'success'; readonly value: ApiStatusResponse }

function formatInteger(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function formatExactDate(value: string | null): string {
  if (!value) return 'Sin actualización registrada'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function formatAge(value: string | null): string {
  if (!value) return 'sin datos'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'fecha inválida'
  const age = Math.max(0, Date.now() - timestamp)
  if (age < 60_000) return 'hace menos de 1 minuto'
  if (age < 3_600_000) return `hace ${Math.floor(age / 60_000)} min`
  if (age < 86_400_000) return `hace ${Math.floor(age / 3_600_000)} h`
  return `hace ${Math.floor(age / 86_400_000)} días`
}

function coverageClass(percent: number): string {
  if (percent >= 80) return 'text-positive'
  if (percent >= 50) return 'text-accent'
  return 'text-negative'
}

function CoverageTable({
  title,
  rows,
}: {
  readonly title: string
  readonly rows: readonly CoverageRow[]
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5">
      <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
            <tr className="border-b border-border">
              <th className="pb-3 pr-4">Servidor o mercado</th>
              <th className="pb-3 pr-4 text-right">Con precio reciente</th>
              <th className="pb-3 pr-4 text-right">Precios guardados</th>
              <th className="pb-3 pr-4 text-right">% reciente</th>
              <th className="pb-3 text-right">Última actualización</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/70 last:border-0">
                <td className="py-3 pr-4 font-medium text-text">{row.name}</td>
                <td className="py-3 pr-4 text-right font-mono tabular text-text-muted">
                  {formatInteger(row.recent_objects)}
                </td>
                <td className="py-3 pr-4 text-right font-mono tabular text-text-muted">
                  {formatInteger(row.total_objects)}
                </td>
                <td
                  className={`py-3 pr-4 text-right font-mono font-semibold tabular ${coverageClass(
                    row.recent_objects_percent,
                  )}`}
                >
                  {formatPercent(row.recent_objects_percent)}
                </td>
                <td
                  className="py-3 text-right text-xs text-text-faint"
                  title={formatExactDate(row.last_updated_at)}
                >
                  {formatAge(row.last_updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function DataStatusPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8_000)
    try {
      const response = await fetch(`${CENTRAL_MARKET_API_URL}/status`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      const payload = (await response.json()) as ApiStatusResponse
      if (!response.ok || !payload?.data_trust) {
        throw new Error('El servicio no pudo entregar el estado de los precios.')
      }
      setState({ kind: 'success', value: payload })
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof DOMException && error.name === 'AbortError'
            ? 'La consulta tardó demasiado tiempo.'
            : error instanceof Error
              ? error.message
              : 'No fue posible consultar el estado de los precios.',
      })
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void load()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [load])

  const status = state.kind === 'success' ? state.value : null
  const trust = status?.data_trust ?? null

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised/55 shadow-xl shadow-black/10">
        <div className="border-b border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <nav aria-label="Migas de pan" className="text-xs text-text-faint">
            <a className="transition-colors hover:text-accent" href="/">
              Calculadora
            </a>
            <span aria-hidden="true" className="px-2">/</span>
            <span aria-current="page">Estado de los precios</span>
          </nav>

          <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                Calidad de los precios
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-text sm:text-4xl lg:text-5xl">
                Qué tan confiables son los precios
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-text-muted sm:text-lg">
                Revisa cuándo se actualizaron los precios, cuánta información hay
                disponible y si conviene usarlos como referencia antes de fabricar,
                comprar o vender.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={state.kind === 'loading'}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-border hover:text-accent disabled:cursor-wait disabled:opacity-60"
            >
              {state.kind === 'loading' ? 'Actualizando…' : 'Actualizar estado'}
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          {state.kind === 'error' && (
            <div className="rounded-2xl border border-negative/40 bg-negative-muted p-5 text-sm text-negative">
              <p className="font-semibold">Estado no disponible</p>
              <p className="mt-1 text-text-muted">{state.message}</p>
            </div>
          )}

          {state.kind === 'loading' && (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          )}

          {status && trust && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    Servicio de precios
                  </p>
                  <p className={`mt-3 text-2xl font-semibold ${status.status === 'ok' ? 'text-positive' : 'text-negative'}`}>
                    {status.status === 'ok' ? 'Funcionando' : 'Con problemas'}
                  </p>
                  <p className="mt-2 text-xs text-text-faint">
                    Guardado de precios:{' '}
                    {status.database.status === 'ok' ? 'funcionando' : 'con problemas'}
                  </p>
                </article>

                <article className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    Última actualización
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-text">
                    {formatAge(trust.last_price_reception_at)}
                  </p>
                  <p className="mt-2 text-xs text-text-faint">
                    {formatExactDate(trust.last_price_reception_at)}
                  </p>
                </article>

                <article className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    Últimos precios guardados
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-text">
                    {formatAge(trust.last_history_reception_at)}
                  </p>
                  <p className="mt-2 text-xs text-text-faint">
                    {formatExactDate(trust.last_history_reception_at)}
                  </p>
                </article>

                <article className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                    Precios recientes
                  </p>
                  <p className={`mt-3 text-2xl font-semibold ${coverageClass(trust.recent_objects_percent)}`}>
                    {formatPercent(trust.recent_objects_percent)}
                  </p>
                  <p className="mt-2 text-xs text-text-faint">
                    {formatInteger(trust.recent_objects)} de{' '}
                    {formatInteger(trust.total_objects)} precios de objetos y calidades
                  </p>
                </article>
              </div>

              {trust.status === 'unavailable' ? (
                <div className="rounded-2xl border border-accent-border bg-accent-muted p-5 text-sm text-text-muted">
                  El servicio funciona, pero no pudimos calcular cuántos precios están
                  actualizados en este momento.
                </div>
              ) : (
                <>
                  <CoverageTable title="Precios recientes por servidor" rows={trust.servers} />
                  <CoverageTable title="Precios recientes por mercado" rows={trust.markets} />
                </>
              )}
            </>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold text-text">
                Cómo obtenemos los precios
              </h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                <li><strong className="text-text">1.</strong> Jugadores que tienen abierto Albion Data Client visitan los mercados del juego.</li>
                <li><strong className="text-text">2.</strong> La herramienta lee las órdenes públicas y las envía automáticamente. Si falla la conexión, vuelve a intentarlo.</li>
                <li><strong className="text-text">3.</strong> Guardamos el precio más reciente y los precios anteriores, evitando contar dos veces la misma información.</li>
                <li><strong className="text-text">4.</strong> La calculadora usa el dato más nuevo disponible y siempre muestra hace cuánto fue actualizado.</li>
              </ol>
            </article>

            <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold text-text">
                Cómo decidimos la confianza
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                <p><strong className="text-positive">Alta:</strong> el precio es reciente, hay varios precios guardados y se parece a lo que normalmente se ha visto.</p>
                <p><strong className="text-accent">Media:</strong> el precio todavía puede servir, pero es algo antiguo o hay menos actividad registrada.</p>
                <p><strong className="text-negative">Baja:</strong> hay muy pocos datos, el precio es antiguo o está muy alejado de lo habitual. Conviene actualizarlo o usar un precio manual.</p>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-accent-border/45 bg-bg p-5 sm:p-7">
            <h2 className="font-display text-2xl font-semibold text-text">
              Por qué dos cálculos pueden ser distintos
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-text-muted">
              Los precios cambian durante el día y no todas las ciudades o calidades se
              actualizan al mismo tiempo. Dos personas también pueden usar distintas
              ciudades, calidades o formas de comprar y vender. Por eso mostramos hace
              cuánto se actualizó cada precio, cuántos precios se han guardado, cuántas
              unidades se registraron y si el valor está lejos de lo habitual.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
