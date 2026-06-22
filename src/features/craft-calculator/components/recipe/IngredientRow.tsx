import { formatEnchantment } from '@core/domain/entities/Enchantment'
import type { ResolvedRecipeIngredient } from '@core/usecases/resolveRecipeIngredient'
import { ItemIcon } from '@shared/components/ItemIcon'

const UNRESOLVED_KIND_LABEL: Record<'artifact' | 'faction_blueprint' | 'unknown', string> = {
  artifact: 'Artefacto',
  faction_blueprint: 'Blueprint',
  unknown: 'Ingrediente desconocido',
}

interface IngredientRowProps {
  readonly resolved: ResolvedRecipeIngredient
}

/**
 * Una fila por ingrediente. Los ingredientes especiales (artefacto o
 * blueprint, ver `resolveRecipeIngredient`) se destacan en dorado con
 * un badge que dice de qué tipo son, en vez de mezclarse con los
 * recursos refinados normales o desaparecer silenciosamente.
 */
export function IngredientRow({ resolved }: IngredientRowProps) {
  if (resolved.status === 'unresolved') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-accent-muted px-2.5 py-2 my-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-accent truncate font-mono">{resolved.itemId}</span>
          <span className="shrink-0 text-[11px] text-accent border border-accent-border rounded-md px-1.5 py-0.5">
            {UNRESOLVED_KIND_LABEL[resolved.kind]}
          </span>
        </div>
        <span className="shrink-0 text-sm text-accent tabular">x{resolved.quantity}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
      <ItemIcon
        itemId={resolved.item.id}
        enchantment={resolved.enchantment}
        name={resolved.item.name}
        size={28}
      />
      <span className="text-sm text-text flex-1 min-w-0 truncate">
        {resolved.item.name}
        <span className="text-text-faint">{formatEnchantment(resolved.enchantment)}</span>
      </span>
      <span className="text-sm text-text-muted tabular shrink-0">x{resolved.quantity}</span>
    </div>
  )
}
