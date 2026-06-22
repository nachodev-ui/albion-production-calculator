import { useEffect, useMemo, useRef } from 'react'
import { createCalculationPrintTitle } from '../../utils/calculationSummary'
import { loadCalculationPrintSummary } from '../../utils/printSummaryStorage'
import { CalculationPrintView } from './CalculationPrintView'

interface CalculationPrintPageProps {
  readonly token: string
}

export function CalculationPrintPage({ token }: CalculationPrintPageProps) {
  const hasOpenedPrintDialog = useRef(false)
  const summary = useMemo(
    () => loadCalculationPrintSummary(token),
    [token],
  )

  useEffect(() => {
    if (!summary) return

    document.title = createCalculationPrintTitle(
      summary.itemName,
      summary.tier,
      summary.enchantment,
    )

    if (hasOpenedPrintDialog.current) return
    hasOpenedPrintDialog.current = true

    const timer = window.setTimeout(() => {
      window.print()
    }, 400)

    return () => window.clearTimeout(timer)
  }, [summary])

  if (!summary) {
    return (
      <main className="print-page-shell">
        <section className="print-error-card">
          <h1>No se pudo cargar el resumen</h1>
          <p>
            El enlace puede haber expirado o los datos del cálculo ya no están
            disponibles en este navegador.
          </p>
          <button type="button" onClick={() => window.close()}>
            Cerrar pestaña
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="print-page-shell">
      <div className="print-toolbar" role="toolbar" aria-label="Opciones de impresión">
        <div>
          <strong>Vista previa del resumen</strong>
          <span>Elige “Guardar como PDF” en el diálogo de impresión.</span>
        </div>

        <div className="print-toolbar-actions">
          <button type="button" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
          <button type="button" className="print-secondary-button" onClick={() => window.close()}>
            Cerrar
          </button>
        </div>
      </div>

      <CalculationPrintView summary={summary} />
    </main>
  )
}
