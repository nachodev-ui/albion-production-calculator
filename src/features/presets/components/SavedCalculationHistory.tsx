import { useCallback, useEffect, useState } from 'react'
import {
  deleteSavedCalculation,
  fetchSavedCalculations,
} from '@features/account/api/savedDataApi'
import type { SavedCalculation } from '@features/account/api/savedDataApi'
import { useAccountSession } from '@features/account/hooks/useAccountSession'
import { calculateCraftEconomicSummary } from '@features/craft-calculator/utils/profitCalculations'
import { createSharedCalculationUrl } from '@features/craft-calculator/utils/sharedCalculation'

function silver(value: number): string {
  return Math.round(value).toLocaleString('es-CL')
}

export function SavedCalculationHistory() {
  const { isAuthenticated, isLoading, getAccessToken, login } =
    useAccountSession()
  const [calculations, setCalculations] = useState<
    readonly SavedCalculation[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Sesión no disponible')
      setCalculations(await fetchSavedCalculations(token, 100))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    if (!isLoading && isAuthenticated) void load()
  }, [isAuthenticated, isLoading, load])

  async function remove(id: string) {
    const token = await getAccessToken()
    if (!token) return
    await deleteSavedCalculation(token, id)
    setCalculations((current) =>
      current.filter((calculation) => calculation.id !== id),
    )
  }

  async function share(calculation: SavedCalculation) {
    await navigator.clipboard.writeText(
      await createSharedCalculationUrl(calculation.snapshot),
    )
  }

  if (!isLoading && !isAuthenticated) {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-surface/80 p-6">
        <h2 className="font-display text-xl text-text">Historial de cálculos</h2>
        <p className="mt-2 text-sm text-text-muted">
          Inicia sesión para guardar y consultar tus cálculos desde cualquier
          dispositivo.
        </p>
        <button
          type="button"
          onClick={() => void login()}
          className="mt-5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg"
        >
          Iniciar sesión
        </button>
      </section>
    )
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-text">Historial de cálculos</h2>
          <p className="mt-1 text-xs text-text-faint">
            Capturas completas con precios, configuración y resultado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted disabled:opacity-60"
        >
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-negative/40 bg-negative-muted p-4 text-sm text-negative">
          No fue posible cargar el historial.
        </p>
      ) : calculations.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-sm text-text-muted">
          Aún no tienes cálculos guardados.
        </p>
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
                <p className="text-[10px] uppercase tracking-wider text-text-faint">
                  {new Date(calculation.createdAt).toLocaleString('es-CL')}
                </p>
                <h3 className="mt-2 font-semibold text-text">
                  {calculation.name ?? summary.itemName}
                </h3>
                <p className="mt-1 text-xs text-text-faint">
                  {summary.cityName} · {summary.quantity} u. · RRR{' '}
                  {(summary.returnRate * 100).toFixed(1)}%
                </p>
                <p className="mt-4 text-sm text-text-muted">
                  Costo {silver(summary.totalCost)} · Beneficio{' '}
                  {hasResult ? silver(economics.economicResult) : 'pendiente'} · ROI{' '}
                  {hasResult
                    ? `${(economics.economicProfitability * 100).toFixed(1)}%`
                    : 'pendiente'}
                </p>
                <div className="mt-4 flex gap-2">
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
                    className="rounded-lg border border-border px-3 py-2 text-xs text-text-faint hover:text-negative"
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
