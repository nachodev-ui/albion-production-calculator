import { useEffect, useState } from 'react'
import type { CalculationSummarySnapshot } from '../../utils/calculationSummary'
import { createCalculationPrintTitle } from '../../utils/calculationSummary'
import { decodeSharedCalculation } from '../../utils/sharedCalculation'
import { CalculationPrintView } from './CalculationPrintView'

interface SharedCalculationPageProps {
  readonly token: string
}

export function SharedCalculationPage({ token }: SharedCalculationPageProps) {
  const [summary, setSummary] = useState<CalculationSummarySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    void decodeSharedCalculation(token)
      .then((decoded) => {
        if (!isActive) return
        setSummary(decoded)
        document.title = createCalculationPrintTitle(
          decoded.itemName,
          decoded.tier,
          decoded.enchantment,
        )
      })
      .catch((reason: unknown) => {
        if (!isActive) return
        setError(
          reason instanceof Error
            ? reason.message
            : 'No se pudo abrir el cálculo compartido.',
        )
      })
    return () => {
      isActive = false
    }
  }, [token])

  if (error) {
    return (
      <main className="print-page-shell">
        <section className="print-error-card">
          <h1>No se pudo abrir el cálculo</h1>
          <p>{error}</p>
          <a href="/">Volver a Albion Calculator</a>
        </section>
      </main>
    )
  }

  if (!summary) {
    return (
      <main className="print-page-shell">
        <section className="print-error-card">
          <h1>Abriendo cálculo compartido…</h1>
          <p>Validando la captura y reconstruyendo el resumen.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="print-page-shell">
      <div className="print-toolbar" role="toolbar" aria-label="Opciones del cálculo compartido">
        <div>
          <strong>Cálculo compartido</strong>
          <span>Captura de precios y configuración en la fecha indicada.</span>
        </div>
        <div className="print-toolbar-actions">
          <button type="button" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
          <a className="print-secondary-button" href="/">
            Abrir calculadora
          </a>
        </div>
      </div>
      <CalculationPrintView summary={summary} />
    </main>
  )
}
