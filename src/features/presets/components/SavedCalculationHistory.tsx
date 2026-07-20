import { useCallback, useEffect, useState } from 'react'
import {
  deleteSavedCalculation,
  fetchSavedCalculations,
} from '@features/account/api/savedDataApi'
import type { SavedCalculation } from '@features/account/api/savedDataApi'
import { useAccountSession } from '@features/account/hooks/useAccountSession'
import { calculateCraftEconomicSummary } from '@features/craft-calculator/utils/profitCalculations'
import {
  createSharedCalculationUrl,
  isCalculationSummarySnapshot,
} from '@features/craft-calculator/utils/sharedCalculation'

const silverFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
})
const percentFormatter = new Intl.NumberFormat('es-CL', {
  style: 'percent',
  maximumFractionDigits: 1,
})
const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('No fue posible copiar el enlace')
}

export function SavedCalculationHistory() {
  const { isAuthenticated, isLoading, getAccessToken, login } =
    useAccountSession()
  const [calculations, setCalculations] = useState<
    readonly SavedCalculation[]
  >([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    setStatus('loading')
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('No authentication token')
      const result = await fetchSavedCalculations(accessToken, 100)
      setCalculations(
        result.filter((calculation) =>
          isCalculationSummarySnapshot(calculation.snapshot),
        ),
      )
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [getAccessToken, isAuthenticated])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    void load()
  }, [isAuthenticated, isLoading, load])

  async function remove(calculationId: string) {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('No authentication token')
      await deleteSavedCalculation(accessToken, calculationId)
      setCalculations((current) =>
        current.filter((calculation) => calculation.id !== calculationId),
      )
      setFeedback('Cálculo eliminado.')
    } catch {
      setFeedback('No se pudo eliminar el cálculo.')
    }
  }

  async function share(calculation: SavedCalculation) {
    try {
      const url = await createSharedCalculationUrl(calculation.snapshot)
      await copyText(url)
      setFeedback('Enlace compartible copiado.')
    } catch {
      setFeedback('No se pudo crear el enlace.')
    }
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-surface/80 p-6">
        <h2 className="font-display text-xl text-text">Historial de cálculos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          Inicia sesión para guardar capturas completas, revisarlas desde otro
          dispositivo y generar nuevamente sus enlaces compartibles.
        </p>
        <button
          type="button"
          onClick={() => void login()}
          className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          Iniciar sesión
        </button>
      </section>
    )
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface/72 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-text">Historial de cálculos</h2>
          <p className="mt-1 text-xs text-text-faint">
            Cada registro conserva precios, configuración, fecha y resultado.
          </p>
          {feedback && (
            <p className="mt-1 text-xs text-text-muted" aria-live="polite">
              {feedback}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={status === 'loading'}
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text disabled:opacity-60"
        >
          {status === 'loading' ? 'Actualizando…' : 'Actualizar historial'}
        </button>
      </div>

      {status === 'error' ? (
        <p className="rounded-xl border border-negative/40 bg-negative-muted px-4 py-3 text-sm text-negative">
          No fue posible cargar el historial desde la nube.
        </p>
      ) : calculations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface/62 px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-text">
            Aún no tienes cálculos guardados
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            Usa “Guardar cálculo” desde el resumen de cualquier objeto.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calculations.map((calculation) => {
            const summary = calculation.snapshot
            const economics = calculateCraftEconomicSummary({
              totalCost: summary.totalCost,
              recoveredMaterialValue: summary.silverSaved,
              quantity: Math.max(1, summary.quantity),
              unitSellPrice: summary.unitSellPrice ?? 0,
              isPremium: summary.isPremium,
            })
            const hasResult =
              summary.isComplete && (summary.unitSellPrice ?? 0) > 0

            return (
              <article
                key={calculation.id}
                className="rounded-2xl border border-border bg-surface/86 p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
                  {dateFormatter.format(new Date(calculation.createdAt))}
                </p>
                <h3 className="mt-2 text-base font-semibold text-text">
                  {calculation.name ?? summary.itemName}
                </h3>
                <p className="mt-1 text-xs text-text-faint">
                  {summary.cityName} · {summary.quantity}{' '}
                  {summary.quantity === 1 ? 'unidad' : 'unidades'}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-4 text-xs">
                  <div>
                    <dt className="text-text-faint">Costo neto</dt>
                    <dd className="mt-1 text-text">
                      {silverFormatter.format(summary.totalCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-faint">RRR</dt>
                    <dd className="mt-1 text-text">
                      {percentFormatter.format(summary.returnRate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-faint">Beneficio</dt>
                    <dd
                      className={`mt-1 ${
                        hasResult && economics.economicResult >= 0
                          ? 'text-positive'
                          : hasResult
                            ? 'text-negative'
                            : 'text-text-faint'
                      }`}
                    >
                      {hasResult
                        ? `${economics.economicResult >= 0 ? '+' : ''}${silverFormatter.format(
                            economics.economicResult,
                          )}`
                        : 'Pendiente'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-faint">ROI económico</dt>
                    <dd className="mt-1 text-text">
                      {hasResult
                        ? percentFormatter.format(
                            economics.economicProfitability,
                          )
                        : 'Pendiente'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void share(calculation)}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(calculation.id)}
                    className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-faint hover:border-negative/50 hover:text-negative"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
