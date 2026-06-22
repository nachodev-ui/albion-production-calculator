import { formatEnchantment } from '@core/domain/entities/Enchantment'
import type { MissingPriceItem } from '@core/domain/entities/CraftCostNode'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { ItemIcon } from '@shared/components/ItemIcon'

interface CalculationReadinessBannerProps {
  readonly missingPrices: readonly MissingPriceItem[]
  readonly repository: ItemRepository
}

const MAX_VISIBLE_ITEMS = 6

export function CalculationReadinessBanner({
  missingPrices,
  repository,
}: CalculationReadinessBannerProps) {
  if (missingPrices.length === 0) return null

  const visibleItems = missingPrices.slice(0, MAX_VISIBLE_ITEMS)
  const hiddenCount = missingPrices.length - visibleItems.length
  const priceLabel = missingPrices.length === 1 ? 'precio' : 'precios'

  function scrollToRecipeTree() {
    document.getElementById('recipe-tree')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="mt-4 rounded-xl border border-accent-border bg-accent-muted p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-border text-sm font-semibold text-accent"
            >
              !
            </span>

            <div>
              <h3 className="text-sm font-semibold text-text">
                Cálculo incompleto
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                Faltan {missingPrices.length} {priceLabel}. Los costos, el ahorro,
                el precio mínimo y la ganancia son provisionales hasta completar
                todos los materiales.
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {visibleItems.map((missing) => {
              const item = repository.getById(missing.itemId)
              const displayName = item?.name ?? (missing.itemId as unknown as string)

              return (
                <div
                  key={`${missing.itemId}@${missing.enchantment}`}
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-accent-border bg-surface/70 px-2.5 py-2"
                >
                  <ItemIcon
                    itemId={missing.itemId}
                    enchantment={missing.enchantment}
                    name={displayName}
                    size={28}
                  />

                  <div className="min-w-0">
                    <p className="max-w-48 truncate text-xs font-medium text-text">
                      {displayName}
                    </p>

                    <p className="text-[10px] text-text-faint">
                      {missing.enchantment > 0
                        ? formatEnchantment(missing.enchantment)
                        : 'Sin encantamiento'}
                      {missing.paths.length > 1
                        ? ` · ${missing.paths.length} ramas`
                        : ''}
                    </p>
                  </div>
                </div>
              )
            })}

            {hiddenCount > 0 && (
              <span className="inline-flex items-center rounded-lg border border-accent-border bg-surface/70 px-3 py-2 text-xs text-text-muted">
                +{hiddenCount} más
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToRecipeTree}
          className="shrink-0 rounded-lg border border-accent-border bg-surface px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          Revisar precios
        </button>
      </div>
    </aside>
  )
}
