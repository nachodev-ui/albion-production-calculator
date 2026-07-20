import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalculationSummarySnapshot } from '../../utils/calculationSummary'
import { createCalculationPrintTitle } from '../../utils/calculationSummary'
import { loadCalculationPrintSummary } from '../../utils/printSummaryStorage'
import { decodeSharedCalculation } from '../../utils/sharedCalculation'
import { CalculationPrintView } from './CalculationPrintView'

interface CalculationPrintPageProps {
  readonly token: string
  readonly shared?: boolean
}

export function CalculationPrintPage({
  token,
  shared = false,
}: CalculationPrintPageProps) {
  const hasOpenedPrintDialog = useRef(false)
  const localSummary = useMemo(
    () => (shared ? null : loadCalculationPrintSummary(token)),
    [shared, token],
  )
  const [sharedSummary, setSharedSummary] =
    useState<CalculationSummarySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const summary = shared ? sharedSummary : localSummary

  useEffect(() => {
    if (!shared) return
    let active = true
    void decodeSharedCalculation(token)
      .then((value) => active && setSharedSummary(value))
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudo abrir el cálculo compartido.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [shared, token])

  useEffect(() => {
    if (!summary) return
    document.title = createCalculationPrintTitle(
      summary.itemName,
      summary.tier,
      summary.enchantment,
    )
    if (shared || hasOpenedPrintDialog.current) return
    hasOpenedPrintDialog.current = true
    const timer = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(timer)
  }, [shared, summary])

  if (!summary) {
    return (
      <main className="print-page-shell">
        <section className="print-error-card">
          <h1>{error ? 'No se pudo abrir el cálculo' : 'Abriendo cálculo…'}</h1>
          <p>
            {error ??
              (shared
                ? 'Validando la captura y reconstruyendo el resumen.'
                : 'El enlace expiró o el resumen ya no está disponible en este navegador.')}
          </p>
          {error && <a href="/">Volver a Albion Calculator</a>}
        </section>
      </main>
    )
  }

  return (
    <main className="print-page-shell">
      <div className="print-toolbar" role="toolbar" aria-label="Opciones del resumen">
        <div>
          <strong>{shared ? 'Cálculo compartido' : 'Vista previa del resumen'}</strong>
          <span>
            {shared
              ? 'Captura de precios y configuración en la fecha indicada.'
              : 'Elige “Guardar como PDF” en el diálogo de impresión.'}
          </span>
        </div>
        <div className="print-toolbar-actions">
          <button type="button" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
          {shared ? (
            <a className="print-secondary-button" href="/">
              Abrir calculadora
            </a>
          ) : (
            <button
              type="button"
              className="print-secondary-button"
              onClick={() => window.close()}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
      <CalculationPrintView summary={summary} />
    </main>
  )
}
