import { InfoHint } from '@shared/components/InfoHint'
import { useCraftTreeStore } from '@features/craft-calculator/store/craftTreeStore'
import { countSavedManualPrices } from '@features/craft-calculator/store/manualPriceStorage'

export function ManualPricePersistenceBar() {
  const currentPriceCount = useCraftTreeStore(
    (state) => state.manualPrices.size,
  )
  const pricesByRoot = useCraftTreeStore(
    (state) => state.manualPricesByRoot,
  )
  const clearCurrentManualPrices = useCraftTreeStore(
    (state) => state.clearCurrentManualPrices,
  )
  const clearAllManualPrices = useCraftTreeStore(
    (state) => state.clearAllManualPrices,
  )

  const totalSavedPriceCount = countSavedManualPrices(pricesByRoot)

  function handleClearCurrent() {
    if (currentPriceCount === 0) return

    const confirmed = window.confirm(
      '¿Borrar todos los precios guardados para esta receta?',
    )

    if (confirmed) {
      clearCurrentManualPrices()
    }
  }

  function handleClearAll() {
    if (totalSavedPriceCount === 0) return

    const confirmed = window.confirm(
      '¿Borrar todos los precios manuales guardados en este navegador?',
    )

    if (confirmed) {
      clearAllManualPrices()
    }
  }

  return (
    <section className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-positive"
          />

          <p className="text-sm font-medium text-text">
            Guardado local automático
          </p>

          <InfoHint
            label="Guardado local de precios"
            text="Cada precio se guarda en este navegador al salir del campo o presionar Enter. Al volver a abrir la misma receta y encantamiento, los valores se restauran automáticamente. No se envían a ningún servidor."
            align="left"
          />
        </div>

        <p className="mt-1 text-xs text-text-faint">
          {currentPriceCount === 0
            ? 'Esta receta todavía no tiene precios guardados.'
            : `${currentPriceCount} ${
                currentPriceCount === 1 ? 'precio guardado' : 'precios guardados'
              } para esta receta.`}
          {totalSavedPriceCount > currentPriceCount && (
            <>
              {' '}
              {totalSavedPriceCount} en total en este navegador.
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          disabled={currentPriceCount === 0}
          onClick={handleClearCurrent}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Borrar esta receta
        </button>

        <button
          type="button"
          disabled={totalSavedPriceCount === 0}
          onClick={handleClearAll}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-negative transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          Borrar todos
        </button>
      </div>
    </section>
  )
}
