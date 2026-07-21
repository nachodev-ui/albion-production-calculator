import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEnchantment } from '@core/domain/entities/Enchantment'
import { MARKET_QUALITY_LABELS } from '@features/market-data/types/MarketPrice'
import { createCalculationPrintTitle } from '../../utils/calculationSummary'
import { loadCalculationPrintSummary } from '../../utils/printSummaryStorage'
import type { SavedCalculationSnapshot } from '../../utils/savedCalculationSnapshot'
import { decodeSharedCalculation } from '../../utils/sharedCalculation'
import { CalculationPrintView } from './CalculationPrintView'

interface CalculationPrintPageProps {
  readonly token: string
  readonly shared?: boolean
}

const silverFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
})
const quantityFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
})

function SnapshotAudit({ summary }: { readonly summary: SavedCalculationSnapshot }) {
  const usedPrices = summary.usedPrices ?? []
  const qualityLabel =
    summary.quality === undefined
      ? 'No registrada en esta captura'
      : MARKET_QUALITY_LABELS[summary.quality]

  return (
    <section className="print-audit-card print-card print-table-section print-avoid-break">
      <h2>Datos auditables de la captura</h2>
      <p className="print-muted">Calidad de venta: {qualityLabel}</p>

      {usedPrices.length === 0 ? (
        <p className="print-muted">
          Esta captura no incluye el desglose de precios utilizados. Puede tratarse
          de un cálculo guardado antes de añadir este detalle.
        </p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {usedPrices.map((price, index) => (
              <tr
                key={`${price.name}-${price.enchantment}-${price.unitPrice}-${price.source}-${index}`}
              >
                <td>
                  {price.name}
                  {formatEnchantment(price.enchantment)}
                </td>
                <td>{quantityFormatter.format(price.quantity)}</td>
                <td>{silverFormatter.format(price.unitPrice)} plata</td>
                <td>{silverFormatter.format(price.totalCost)} plata</td>
                <td>{price.source === 'manual' ? 'Manual' : 'Mercado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function CalculationPrintPage({
  token,
  shared = false,
}: CalculationPrintPageProps) {
  const hasOpenedPrintDialog = useRef(false)
  const localSummary = useMemo<SavedCalculationSnapshot | null>(
    () => (shared ? null : loadCalculationPrintSummary(token)),
    [shared, token],
  )
  const [sharedSummary, setSharedSummary] =
    useState<SavedCalculationSnapshot | null>(null)
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
          <button
            type="button"
            className="print-primary-button"
            onClick={() => window.print()}
          >
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
      <SnapshotAudit summary={summary} />
    </main>
  )
}
