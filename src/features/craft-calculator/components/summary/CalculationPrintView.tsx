import { formatEnchantment } from '@core/domain/entities/Enchantment'
import type { CalculationSummarySnapshot } from '../../utils/calculationSummary'
import { calculateCraftEconomicSummary } from '../../utils/profitCalculations'

interface CalculationPrintViewProps {
  readonly summary: CalculationSummarySnapshot
}

const silverFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
})

const quantityFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const percentageFormatter = new Intl.NumberFormat('es-CL', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'long',
  timeStyle: 'short',
})

function formatSilver(amount: number): string {
  return `${silverFormatter.format(amount)} plata`
}

function formatQuantity(amount: number): string {
  return quantityFormatter.format(amount)
}

function formatPercentage(rate: number): string {
  return percentageFormatter.format(rate)
}

function formatYesNo(value: boolean): string {
  return value ? 'Sí' : 'No'
}

function SummaryRow({
  label,
  value,
  emphasis = false,
  positive = false,
  negative = false,
}: {
  readonly label: string
  readonly value: string
  readonly emphasis?: boolean
  readonly positive?: boolean
  readonly negative?: boolean
}) {
  const valueClassName = positive
    ? 'print-value print-value-positive'
    : negative
      ? 'print-value print-value-negative'
      : 'print-value'

  return (
    <div
      className={`print-summary-row ${emphasis ? 'print-summary-row-emphasis' : ''}`}
    >
      <span>{label}</span>
      <strong className={valueClassName}>{value}</strong>
    </div>
  )
}

export function CalculationPrintView({ summary }: CalculationPrintViewProps) {
  const safeQuantity = Math.max(1, summary.quantity)
  const grossCost = summary.totalCost + summary.silverSaved
  const netCostPerUnit = summary.totalCost / safeQuantity
  const savingsPerUnit = summary.silverSaved / safeQuantity
  const unitSellPrice = summary.unitSellPrice ?? 0
  const hasSellPrice = unitSellPrice > 0
  const usesDirectStationCost = summary.stationFeeSource === 'manual_total'

  const economics = calculateCraftEconomicSummary({
    totalCost: summary.totalCost,
    recoveredMaterialValue: summary.silverSaved,
    quantity: safeQuantity,
    unitSellPrice,
    isPremium: summary.isPremium,
  })
  const { cashBreakdown } = economics

  const priceDifference = unitSellPrice - cashBreakdown.breakEvenUnitPrice
  const canShowResult = summary.isComplete && hasSellPrice
  const generatedAt = new Date(summary.generatedAt)

  return (
    <article className="print-document">
      <header className="print-report-header">
        <div>
          <p className="print-eyebrow">Albion Craft Calculator</p>
          <h1>Resumen de crafteo</h1>
          <p className="print-muted">
            Generado el {dateFormatter.format(generatedAt)}
          </p>
        </div>

        <div
          className={`print-status ${
            summary.isComplete
              ? 'print-status-complete'
              : 'print-status-incomplete'
          }`}
        >
          {summary.isComplete
            ? 'Cálculo completo'
            : `Cálculo incompleto · ${summary.missingPrices.length} ${
                summary.missingPrices.length === 1
                  ? 'precio pendiente'
                  : 'precios pendientes'
              }`}
        </div>
      </header>

      <section className="print-hero print-avoid-break">
        <div>
          <p className="print-section-kicker">Objeto</p>
          <h2>{summary.itemName}</h2>
          <p className="print-muted">
            T{summary.tier}
            {formatEnchantment(summary.enchantment)} · {safeQuantity}{' '}
            {safeQuantity === 1 ? 'unidad' : 'unidades'}
          </p>
        </div>

        <div className="print-hero-cost">
          <span>
            {summary.isComplete ? 'Costo neto tras RRR' : 'Costo neto parcial'}
          </span>
          <strong>{formatSilver(summary.totalCost)}</strong>
          <small>{formatSilver(netCostPerUnit)} por unidad</small>
        </div>
      </section>

      {!summary.isComplete && (
        <section className="print-warning print-avoid-break">
          <h2>Cálculo incompleto</h2>
          <p>
            Los costos y resultados económicos son parciales hasta ingresar los
            precios de todos los materiales indicados más abajo.
          </p>
        </section>
      )}

      <div className="print-two-columns">
        <section className="print-card print-avoid-break">
          <h2>Configuración de producción</h2>
          <SummaryRow label="Ciudad" value={summary.cityName} />
          <SummaryRow
            label="Bono de especialidad"
            value={formatYesNo(summary.hasSpecialtyBonus)}
          />
          <SummaryRow
            label="Uso de foco"
            value={formatYesNo(summary.useFocus)}
          />
          <SummaryRow
            label="Bono diario"
            value={
              summary.hasDailyBonus
                ? `Sí (+${formatPercentage(summary.dailyBonusAmount)})`
                : 'No'
            }
          />
          <SummaryRow
            label="RRR resultante"
            value={formatPercentage(summary.returnRate)}
            emphasis
          />
        </section>

        <section className="print-card print-avoid-break">
          <h2>Costos de producción</h2>
          <SummaryRow
            label="Inversión inicial"
            value={formatSilver(grossCost)}
          />
          <SummaryRow
            label="Valor recuperado por RRR"
            value={`-${formatSilver(summary.silverSaved)}`}
            positive
          />
          <SummaryRow
            label={
              summary.isComplete
                ? 'Costo económico neto'
                : 'Costo económico parcial'
            }
            value={formatSilver(summary.totalCost)}
            emphasis
          />
          <SummaryRow
            label="Ahorro por unidad"
            value={formatSilver(savingsPerUnit)}
          />
          <SummaryRow
            label="Tarifas de estación incluidas"
            value={formatSilver(summary.stationFees)}
          />
        </section>
      </div>

      <div className="print-two-columns">
        <section className="print-card print-avoid-break">
          <h2>Puesto y costo de fabricación</h2>
          <SummaryRow label="Puesto" value={summary.stationName} />
          <SummaryRow
            label="Fuente"
            value={
              usesDirectStationCost
                ? 'Total Cost ingresado desde Albion'
                : 'Estimación por nutrición'
            }
          />
          {!usesDirectStationCost && (
            <>
              <SummaryRow label="Acceso" value={summary.stationAccessLabel} />
              <SummaryRow
                label="Item Value"
                value={formatQuantity(summary.itemValue)}
              />
              <SummaryRow
                label="Nutrición por tirada"
                value={formatQuantity(summary.nutritionPerCraft)}
              />
              <SummaryRow
                label="Nutrición total"
                value={formatQuantity(summary.nutritionTotal)}
              />
              <SummaryRow
                label="Tarifa / 100 nutrición"
                value={formatSilver(summary.appliedFeePer100Nutrition)}
              />
            </>
          )}
          {usesDirectStationCost &&
            summary.estimatedStationUsageFee !== undefined && (
              <SummaryRow
                label="Estimación avanzada de referencia"
                value={formatSilver(summary.estimatedStationUsageFee)}
              />
            )}
          <SummaryRow
            label="Costo aplicado al cálculo"
            value={formatSilver(summary.stationUsageFee)}
            emphasis
          />
        </section>

        <section className="print-card print-avoid-break">
          <h2>Especialización y foco</h2>
          <SummaryRow
            label="Focus Cost Efficiency"
            value={formatQuantity(summary.focusCostEfficiency)}
          />
          <SummaryRow
            label="Foco disponible"
            value={formatQuantity(summary.availableFocus)}
          />
          <SummaryRow
            label="Increase in Quality"
            value={formatQuantity(summary.qualityIncrease)}
          />
          <SummaryRow
            label="Foco base por tirada"
            value={formatQuantity(summary.baseFocusPerCraft)}
          />
          <SummaryRow
            label="Foco efectivo por tirada"
            value={formatQuantity(summary.effectiveFocusPerCraft)}
          />
          <SummaryRow
            label="Foco para este lote"
            value={
              summary.useFocus
                ? formatQuantity(summary.totalFocusRequired)
                : 'Foco desactivado'
            }
            emphasis={summary.useFocus}
          />
          <SummaryRow
            label="Objetos posibles"
            value={formatQuantity(summary.maxItemsWithAvailableFocus)}
          />
        </section>
      </div>

      <section className="print-card print-avoid-break">
        <h2>Venta y comisiones</h2>
        <div className="print-two-columns print-two-columns-compact">
          <div>
            <SummaryRow
              label="Cuenta Premium"
              value={formatYesNo(summary.isPremium)}
            />
            <SummaryRow
              label="Tax de venta"
              value={formatPercentage(cashBreakdown.taxRate)}
            />
            <SummaryRow
              label="Setup Fee"
              value={formatPercentage(cashBreakdown.setupFeeRate)}
            />
            <SummaryRow
              label="Comisiones totales"
              value={formatPercentage(cashBreakdown.totalFeeRate)}
            />
          </div>

          <div>
            <SummaryRow
              label="Precio de venta unitario"
              value={
                hasSellPrice ? formatSilver(unitSellPrice) : 'No ingresado'
              }
            />
            <SummaryRow
              label="Precio mínimo por unidad"
              value={
                summary.isComplete
                  ? formatSilver(cashBreakdown.breakEvenUnitPrice)
                  : 'Pendiente'
              }
              emphasis
            />
            {summary.isComplete && hasSellPrice && (
              <SummaryRow
                label="Diferencia frente al mínimo"
                value={
                  priceDifference === 0
                    ? 'Sin diferencia'
                    : `${priceDifference > 0 ? '+' : '-'}${formatSilver(
                        Math.abs(priceDifference),
                      )}`
                }
                positive={priceDifference >= 0}
                negative={priceDifference < 0}
              />
            )}
          </div>
        </div>

        {summary.isComplete && (
          <div className="print-target-grid">
            {cashBreakdown.targetPrices.map(({ target, unitPrice }) => (
              <div key={target} className="print-target-card">
                <span>Objetivo {formatPercentage(target)}</span>
                <strong>{formatSilver(unitPrice)}</strong>
                <small>por unidad</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {hasSellPrice && (
        <section className="print-card print-avoid-break">
          <h2>Resultado económico</h2>
          <div className="print-metric-grid">
            <div className="print-metric">
              <span>Venta bruta</span>
              <strong>{formatSilver(cashBreakdown.grossRevenue)}</strong>
            </div>
            <div className="print-metric">
              <span>Venta neta</span>
              <strong>{formatSilver(cashBreakdown.netRevenue)}</strong>
            </div>
            <div className="print-metric">
              <span>Inversión inicial</span>
              <strong>{formatSilver(economics.initialInvestment)}</strong>
            </div>
            <div className="print-metric">
              <span>Valor recuperado</span>
              <strong className="print-value-positive">
                +{formatSilver(economics.recoveredMaterialValue)}
              </strong>
            </div>
            <div className="print-metric print-metric-highlight">
              <span>Resultado en plata</span>
              <strong
                className={
                  canShowResult
                    ? economics.cashResult >= 0
                      ? 'print-value-positive'
                      : 'print-value-negative'
                    : ''
                }
              >
                {canShowResult
                  ? `${economics.cashResult >= 0 ? '+' : '-'}${formatSilver(
                      Math.abs(economics.cashResult),
                    )}`
                  : 'Pendiente'}
              </strong>
            </div>
            <div className="print-metric print-metric-highlight">
              <span>Resultado económico total</span>
              <strong
                className={
                  canShowResult
                    ? economics.economicResult >= 0
                      ? 'print-value-positive'
                      : 'print-value-negative'
                    : ''
                }
              >
                {canShowResult
                  ? `${economics.economicResult >= 0 ? '+' : '-'}${formatSilver(
                      Math.abs(economics.economicResult),
                    )}`
                  : 'Pendiente'}
              </strong>
            </div>
            <div className="print-metric">
              <span>Rentabilidad en plata</span>
              <strong
                className={
                  canShowResult
                    ? economics.cashProfitability >= 0
                      ? 'print-value-positive'
                      : 'print-value-negative'
                    : ''
                }
              >
                {canShowResult
                  ? `${economics.cashProfitability > 0 ? '+' : ''}${formatPercentage(
                      economics.cashProfitability,
                    )}`
                  : 'Pendiente'}
              </strong>
            </div>
            <div className="print-metric">
              <span>Rentabilidad económica total</span>
              <strong
                className={
                  canShowResult
                    ? economics.economicProfitability >= 0
                      ? 'print-value-positive'
                      : 'print-value-negative'
                    : ''
                }
              >
                {canShowResult
                  ? `${economics.economicProfitability > 0 ? '+' : ''}${formatPercentage(
                      economics.economicProfitability,
                    )}`
                  : 'Pendiente'}
              </strong>
            </div>
            <div className="print-metric">
              <span>Tax descontado</span>
              <strong className="print-value-negative">
                -{formatSilver(cashBreakdown.taxAmount)}
              </strong>
            </div>
            <div className="print-metric">
              <span>Setup Fee descontado</span>
              <strong className="print-value-negative">
                -{formatSilver(cashBreakdown.setupFeeAmount)}
              </strong>
            </div>
          </div>
        </section>
      )}

      <section className="print-card print-table-section">
        <h2>Materiales recuperados</h2>

        {summary.returnedMaterials.length === 0 ? (
          <p className="print-muted">
            No hay materiales recuperados con valor calculado.
          </p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Usados</th>
                <th>Retorno</th>
                <th>Consumo neto</th>
                <th>Valor recuperado</th>
              </tr>
            </thead>
            <tbody>
              {summary.returnedMaterials.map((material) => (
                <tr key={`${material.name}-${material.enchantment}`}>
                  <td>
                    {material.name}
                    {formatEnchantment(material.enchantment)}
                  </td>
                  <td>{formatQuantity(material.grossQuantity)}</td>
                  <td className="print-value-positive">
                    +{formatQuantity(material.returnedQuantity)}
                  </td>
                  <td>{formatQuantity(material.netQuantity)}</td>
                  <td>{formatSilver(material.silverValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {!summary.isComplete && (
        <section className="print-card print-avoid-break">
          <h2>Precios pendientes</h2>
          <ul className="print-missing-list">
            {summary.missingPrices.map((missing) => (
              <li key={`${missing.name}-${missing.enchantment}`}>
                {missing.name}
                {formatEnchantment(missing.enchantment)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="print-report-footer">
        <p>
          Los retornos son estimaciones y pueden variar ligeramente por el
          redondeo aplicado por el juego.
        </p>
        <p>Generado con Albion Craft Calculator.</p>
      </footer>
    </article>
  )
}
