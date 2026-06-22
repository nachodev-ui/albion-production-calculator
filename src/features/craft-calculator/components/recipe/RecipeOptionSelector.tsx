import { formatEnchantment } from '@core/domain/entities/Enchantment'
import type { RecipeOption, RecipeTier } from '@core/domain/entities/Recipe'
import { getRecipeOptions } from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { ItemIcon } from '@shared/components/ItemIcon'

interface RecipeOptionSelectorProps {
  readonly tier: RecipeTier
  readonly selectedIndex: number
  readonly repository: ItemRepository
  readonly onChange: (optionIndex: number) => void
}

function getOptionTitle(
  option: RecipeOption,
  repository: ItemRepository,
): string {
  const primary = option.ingredients[0]
  if (!primary) return 'Receta alternativa'

  return repository.getById(primary.itemId)?.name ?? primary.itemId
}

function getOptionDetails(
  option: RecipeOption,
  repository: ItemRepository,
): string {
  return option.ingredients
    .slice(1)
    .map((ingredient) => {
      const item = repository.getById(ingredient.itemId)
      const name = item?.name ?? ingredient.itemId

      return `+ ${ingredient.quantity} ${name}${formatEnchantment(
        ingredient.enchantment,
      )}`
    })
    .join(' · ')
}

/**
 * Selector para ítems que admiten varias recetas equivalentes.
 * El caso principal son las piezas reales, que aceptan las tres primeras
 * piezas de su rama junto a Sellos Reales del mismo tier.
 */
export function RecipeOptionSelector({
  tier,
  selectedIndex,
  repository,
  onChange,
}: RecipeOptionSelectorProps) {
  const options = getRecipeOptions(tier)

  if (options.length <= 1) return null

  const normalizedSelectedIndex =
    selectedIndex >= 0 && selectedIndex < options.length
      ? selectedIndex
      : 0
  const hasRoyalSigil = options.some((option) =>
    option.ingredients.some((ingredient) =>
      String(ingredient.itemId).startsWith('QUESTITEM_TOKEN_ROYAL_T'),
    ),
  )

  return (
    <div className="mb-5 rounded-xl border border-border bg-surface p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Variante de receta
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-faint">
          Elige cuál de las piezas base usarás para fabricar este objeto.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {options.map((option, optionIndex) => {
          const primary = option.ingredients[0]
          const title = getOptionTitle(option, repository)
          const details = getOptionDetails(option, repository)
          const isSelected = optionIndex === normalizedSelectedIndex

          return (
            <button
              key={`${primary?.itemId ?? 'option'}-${optionIndex}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(optionIndex)}
              className={`flex min-w-0 items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                isSelected
                  ? 'border-accent-border bg-accent-muted'
                  : 'border-border bg-surface-raised hover:border-border-strong'
              }`}
            >
              {primary && (
                <ItemIcon
                  itemId={primary.itemId}
                  enchantment={primary.enchantment}
                  name={title}
                  size={36}
                />
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">
                  {title}
                  {primary && formatEnchantment(primary.enchantment)}
                </span>

                {details && (
                  <span className="mt-0.5 block truncate text-[11px] text-text-faint">
                    {details}
                  </span>
                )}
              </span>

              <span
                aria-hidden="true"
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected
                    ? 'border-accent bg-accent text-surface'
                    : 'border-border-strong'
                }`}
              >
                {isSelected && <span className="text-[10px]">✓</span>}
              </span>
            </button>
          )
        })}
      </div>

      {hasRoyalSigil && (
        <p className="mt-3 border-t border-border pt-2 text-[11px] leading-relaxed text-text-faint">
          El encantamiento se aplica solo a la pieza base. Los Sellos Reales
          conservan encantamiento 0.
        </p>
      )}
    </div>
  )
}
