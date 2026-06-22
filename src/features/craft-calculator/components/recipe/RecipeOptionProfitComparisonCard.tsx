import type { RecipeTier } from '@core/domain/entities/Recipe'
import {
  getRecipeOptions,
} from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import type { RecipeOptionComparison } from '../../utils/compareRecipeOptions'

interface RecipeOptionProfitComparisonCardProps {
  readonly tier: RecipeTier
  readonly comparisons: readonly RecipeOptionComparison[]
  readonly selectedOptionIndex: number
  readonly unitSellPrice: number | null
  readonly repository: ItemRepository
  readonly onSelect: (optionIndex: number) => void
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RecipeOptionProfitComparisonCard({
  tier,
  comparisons,
  selectedOptionIndex,
  unitSellPrice,
  repository,
  onSelect,
}: RecipeOptionProfitComparisonCardProps) {
  const options = getRecipeOptions(tier)

  if (options.length <= 1) return null

  const completeComparisons = comparisons.filter(
    (comparison) => comparison.isComplete,
  )

  const bestCompleteOption = completeComparisons[0]
  const hasSellPrice =
    unitSellPrice !== null && unitSellPrice > 0

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text">
          Comparación de variantes
        </h3>

        <p className="mt-1 text-xs text-text-faint">
          {hasSellPrice
            ? 'Ordenadas por ganancia neta después de costos y comisiones.'
            : 'Ingresa el precio de venta para comparar la ganancia neta. Mientras tanto, se ordenan por menor costo.'}
        </p>
      </div>

      <div className="space-y-2">
        {comparisons.map((comparison, rankingIndex) => {
          const option = options[comparison.optionIndex]
          const primaryIngredient = option?.ingredients[0]
          const primaryItem = primaryIngredient
            ? repository.getById(primaryIngredient.itemId)
            : null

          const isSelected =
            comparison.optionIndex === selectedOptionIndex

          const isBest =
            comparison.isComplete &&
            bestCompleteOption?.optionIndex ===
              comparison.optionIndex

          const differenceFromBest =
            bestCompleteOption && comparison.isComplete
              ? comparison.breakdown.profit -
                bestCompleteOption.breakdown.profit
              : 0

          return (
            <div
              key={comparison.optionIndex}
              className={`rounded-lg border p-3 ${
                isSelected
                  ? 'border-accent-border bg-accent-muted'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-text-faint">
                      #{rankingIndex + 1}
                    </span>

                    <p className="truncate text-sm font-medium text-text">
                      {primaryItem?.name ?? 'Receta alternativa'}
                    </p>

                    {isBest && (
                      <span className="rounded-md bg-positive-muted px-2 py-0.5 text-[10px] font-semibold text-positive">
                        Mejor opción
                      </span>
                    )}
                  </div>

                  {comparison.isComplete ? (
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span className="text-text-faint">
                        Costo:{' '}
                        <strong className="font-medium tabular text-text">
                          {formatSilver(
                            comparison.calculation.grandTotal,
                          )}{' '}
                          plata
                        </strong>
                      </span>

                      {hasSellPrice && (
                        <span className="text-text-faint">
                          Ganancia neta:{' '}
                          <strong
                            className={`font-medium tabular ${
                              comparison.breakdown.profit >= 0
                                ? 'text-positive'
                                : 'text-negative'
                            }`}
                          >
                            {comparison.breakdown.profit >= 0
                              ? '+'
                              : ''}
                            {formatSilver(
                              comparison.breakdown.profit,
                            )}{' '}
                            plata
                          </strong>
                        </span>
                      )}

                      {hasSellPrice &&
                        !isBest &&
                        differenceFromBest < 0 && (
                          <span className="text-text-faint">
                            {formatSilver(
                              Math.abs(differenceFromBest),
                            )}{' '}
                            menos que la mejor
                          </span>
                        )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-accent">
                      Faltan precios para calcular esta opción.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() =>
                    onSelect(comparison.optionIndex)
                  }
                  className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium ${
                    isSelected
                      ? 'cursor-default border-border text-text-faint'
                      : 'border-border-strong text-text hover:border-accent-border hover:text-accent'
                  }`}
                >
                  {isSelected ? 'Seleccionada' : 'Usar receta'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}