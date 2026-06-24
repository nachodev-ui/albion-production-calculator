import { InfoHint } from '@shared/components/InfoHint'
import { RETURN_RATE_SAVINGS_INFO } from '../content/craftInfoDescriptions'

interface ReturnRateSavingsCardProps {
  readonly totalCost: number
  readonly silverSaved: number
  readonly quantity: number
  readonly stationUsageFee?: number
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ReturnRateSavingsCard({
  totalCost,
  silverSaved,
  quantity,
  stationUsageFee = 0,
}: ReturnRateSavingsCardProps) {
  // grandTotal ya corresponde al costo después de aplicar el RRR.
  const netCost = totalCost
  const grossCost = netCost + silverSaved

  const savedPerUnit = quantity > 0 ? silverSaved / quantity : 0
  const netCostPerUnit = quantity > 0 ? netCost / quantity : 0

  const savingsPercentage = grossCost > 0 ? silverSaved / grossCost : 0

  const hasSavings = silverSaved > 0

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-text">
              Costo de producción
            </h3>

            <InfoHint
              label="Costo de producción"
              text={RETURN_RATE_SAVINGS_INFO.section}
              align="left"
            />
          </div>

          <p className="mt-1 text-xs text-text-faint">
            Compara el costo antes y después de recuperar materiales.
          </p>
        </div>

        {hasSavings && (
          <span className="shrink-0 rounded-md bg-positive-muted px-2.5 py-1 text-xs font-medium text-positive">
            -{(savingsPercentage * 100).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="text-text-faint">Costo bruto</span>

            <InfoHint
              label="Costo bruto"
              text={RETURN_RATE_SAVINGS_INFO.costWithoutReturnRate}
              align="left"
            />
          </div>

          <span className="shrink-0 tabular text-text">
            {formatSilver(grossCost)} plata
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="text-text-faint">Ahorro por RRR</span>

            <InfoHint
              label="Ahorro por RRR"
              text={RETURN_RATE_SAVINGS_INFO.silverSaved}
              align="left"
            />
          </div>

          <span
            className={`shrink-0 font-medium tabular ${
              hasSavings ? 'text-positive' : 'text-text-faint'
            }`}
          >
            {hasSavings ? '-' : ''}
            {formatSilver(silverSaved)} plata
          </span>
        </div>

        {stationUsageFee > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-faint">
              Costo de fabricación en el puesto
            </span>
            <span className="shrink-0 tabular text-text">
              {formatSilver(stationUsageFee)} plata
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="font-medium text-text">Costo neto</span>

            <InfoHint
              label="Costo neto"
              text={RETURN_RATE_SAVINGS_INFO.finalCost}
              align="left"
            />
          </div>

          <span className="shrink-0 font-semibold tabular text-text">
            {formatSilver(netCost)} plata
          </span>
        </div>

        {quantity > 1 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-text-faint">Costo neto por unidad</span>

                <InfoHint
                  label="Costo neto por unidad"
                  text="Es el costo neto total dividido por la cantidad de objetos que estás fabricando."
                  align="left"
                />
              </div>

              <span className="shrink-0 tabular text-text">
                {formatSilver(netCostPerUnit)} plata
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-text-faint">Ahorro por unidad</span>

                <InfoHint
                  label="Ahorro por unidad"
                  text={RETURN_RATE_SAVINGS_INFO.averageSavedPerUnit}
                  align="left"
                />
              </div>

              <span
                className={`shrink-0 tabular ${
                  hasSavings ? 'text-positive' : 'text-text-faint'
                }`}
              >
                {formatSilver(savedPerUnit)} plata
              </span>
            </div>
          </>
        )}
      </div>

      {!hasSavings && (
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-text-faint">
          El ahorro aparecerá cuando el RRR sea mayor que 0% y hayas ingresado
          precios para los materiales.
        </p>
      )}
    </section>
  )
}
