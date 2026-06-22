import type { Item } from '@core/domain/entities/Item'
import { formatEnchantment } from '@core/domain/entities/Enchantment'
import { getRecipeTier } from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import type { CraftCostNode } from '@core/domain/entities/CraftCostNode'
import type { NodePath } from '@core/usecases/calculateCraftCost'
import { recipeChildPath } from '@core/usecases/calculateCraftCost'
import { ItemIcon } from '@shared/components/ItemIcon'
import { ManualPriceInput } from '@features/price-input/components/ManualPriceInput'
import type {
  AutomaticMarketPriceDetail,
  MarketRequestStatus,
} from '@features/market-data/types/MarketPrice'
import { buildItemPriceKey } from '@features/market-data/types/MarketPrice'
import { useCraftTreeStore } from '../../store/craftTreeStore'
import { getEnchantmentColor } from '../enchantmentColors'

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 1,
  }).format(amount)
}

interface RecipeTreeNodeProps {
  readonly node: CraftCostNode
  readonly path: NodePath
  readonly item: Item | null
  readonly repository: ItemRepository
  readonly depth: number
  readonly automaticPrices: ReadonlyMap<string, number>
  readonly automaticPriceDetails: ReadonlyMap<string, AutomaticMarketPriceDetail>
  readonly automaticPriceLabel: string
  readonly marketStatus: MarketRequestStatus
}

/**
 * Un nodo del árbol de cálculo, recursivo.
 *
 * - Si el ítem tiene receta para el encantamiento del nodo, muestra
 *   un toggle de expandir/colapsar. Expandido, el costo se calcula
 *   solo de sus hijos (no editable); colapsado, vuelve a hoja con
 *   `ManualPriceInput`.
 * - Si NO tiene receta (recurso base, o ingrediente no resoluble
 *   como artefacto/blueprint), es siempre hoja: no hay toggle.
 */
function RecipeTreeNode({
  node,
  path,
  item,
  repository,
  depth,
  automaticPrices,
  automaticPriceDetails,
  automaticPriceLabel,
  marketStatus,
}: RecipeTreeNodeProps) {
  const isExpanded = useCraftTreeStore((state) =>
    state.expandedPaths.has(path),
  )

  const rootKey = useCraftTreeStore((state) => state.rootKey)

  const toggleExpanded = useCraftTreeStore(
    (state) => state.toggleExpanded,
  )

  const setManualPrice = useCraftTreeStore(
    (state) => state.setManualPrice,
  )

  const clearManualPrice = useCraftTreeStore(
    (state) => state.clearManualPrice,
  )

  const manualPrice = useCraftTreeStore(
    (state) => state.manualPrices.get(path),
  )

  const itemPriceKey = buildItemPriceKey(
    node.itemId,
    node.enchantment,
  )
  const automaticPrice = automaticPrices.get(itemPriceKey)
  const automaticPriceDetail = automaticPriceDetails.get(itemPriceKey)

  const tier = item?.recipe
    ? getRecipeTier(item.recipe, node.enchantment)
    : null

  const isExpandable = tier !== null
  const enchantmentColor = getEnchantmentColor(node.enchantment)
  const displayName = item?.name ?? (node.itemId as unknown as string)
  const hasMissingPrice =
    !isExpanded &&
    manualPrice === undefined &&
    automaticPrice === undefined

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex min-h-[204px] w-[320px] max-w-full flex-col rounded-xl border bg-surface-raised p-3 transition-colors ${
          isExpandable ? 'hover:border-border-strong' : ''
        }`}
        data-missing-price={hasMissingPrice ? 'true' : undefined}
        style={{
          borderColor: hasMissingPrice
            ? 'var(--color-accent)'
            : node.enchantment > 0
              ? enchantmentColor.ring
              : undefined,
        }}
      >
        <button
          type="button"
          disabled={!isExpandable}
          onClick={() => {
            if (isExpandable) {
              toggleExpanded(path)
            }
          }}
          aria-expanded={isExpandable ? isExpanded : undefined}
          className={`flex h-12 w-full items-center gap-3 text-left ${
            isExpandable
              ? 'cursor-pointer'
              : 'cursor-default'
          }`}
        >
          <ItemIcon
            itemId={node.itemId}
            enchantment={node.enchantment}
            name={displayName}
            size={36}
          />

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium text-text"
              title={displayName}
            >
              {displayName}
            </p>

            <div className="flex items-center gap-1.5">
              <p className="text-xs tabular text-text-muted">
                x{node.quantity}
              </p>

              {node.enchantment > 0 && (
                <span
                  className="rounded px-1 font-mono text-[10px] tabular"
                  style={{
                    color: enchantmentColor.solid,
                    background: enchantmentColor.tint,
                  }}
                >
                  {formatEnchantment(node.enchantment)}
                </span>
              )}
            </div>
          </div>

          {isExpandable && (
            <span
              className="shrink-0 text-xs text-text-faint"
              aria-hidden="true"
            >
              {isExpanded ? '▾' : '▸'}
            </span>
          )}
        </button>

        <div className="mt-auto min-h-[124px] border-t border-border pt-2">
          {isExpanded ? (
            <span className="text-sm tabular text-text">
              {formatSilver(node.totalCost)}
              <span className="text-text-faint"> plata</span>
            </span>
          ) : (
            <ManualPriceInput
              key={`${rootKey ?? 'uninitialized'}:${path}:${manualPrice ?? 'manual-missing'}:${automaticPrice ?? 'automatic-missing'}`}
              value={manualPrice}
              automaticValue={automaticPrice}
              automaticLabel={automaticPriceLabel}
              automaticUpdatedAt={automaticPriceDetail?.updatedAt ?? null}
              isAutomaticLoading={marketStatus === 'loading'}
              quantity={node.quantity}
              onChange={(unitPrice) =>
                setManualPrice(path, unitPrice)
              }
              onClear={() => clearManualPrice(path)}
              placeholder="0"
            />
          )}
        </div>
      </div>

      {isExpanded && node.children.length > 0 && (
        <>
          <div className="h-6 w-px bg-border" />

          <div className="relative flex flex-wrap items-start justify-center gap-6">
            <div className="absolute left-0 right-0 top-0 h-px bg-border" />

            {node.children.map((child, index) => {
              const childItem = repository.getById(child.itemId)

              return (
                <div
                  key={`${child.itemId}-${index}`}
                  className="flex flex-col items-center"
                >
                  <div className="h-6 w-px bg-border" />

                  <RecipeTreeNode
                    node={child}
                    path={recipeChildPath(
                      path,
                      node.recipeOptionIndex ?? 0,
                      index,
                    )}
                    item={childItem}
                    repository={repository}
                    depth={depth + 1}
                    automaticPrices={automaticPrices}
                    automaticPriceDetails={automaticPriceDetails}
                    automaticPriceLabel={automaticPriceLabel}
                    marketStatus={marketStatus}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

interface RecipeTreeProps {
  readonly rootNode: CraftCostNode
  readonly repository: ItemRepository
  readonly automaticPrices: ReadonlyMap<string, number>
  readonly automaticPriceDetails: ReadonlyMap<string, AutomaticMarketPriceDetail>
  readonly automaticPriceLabel: string
  readonly marketStatus: MarketRequestStatus
}

/**
 * Árbol de cálculo de costo, recursivo y expandible.
 *
 * No renderiza el nodo raíz como card propia: el ítem raíz ya se
 * muestra en el header de `ItemRecipeCard`, así que acá se muestran
 * directamente sus ingredientes.
 */
export function RecipeTree({
  rootNode,
  repository,
  automaticPrices,
  automaticPriceDetails,
  automaticPriceLabel,
  marketStatus,
}: RecipeTreeProps) {
  if (rootNode.children.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-faint">
        Expande el ítem para ver sus ingredientes.
      </p>
    )
  }

  return (
    <div
      id="recipe-tree"
      className="flex scroll-mt-6 flex-wrap items-start justify-center gap-6 overflow-x-auto py-2"
    >
      {rootNode.children.map((child, index) => {
        const childItem = repository.getById(child.itemId)

        return (
          <RecipeTreeNode
            key={`${child.itemId}-${index}`}
            node={child}
            path={recipeChildPath(
              'root',
              rootNode.recipeOptionIndex ?? 0,
              index,
            )}
            item={childItem}
            repository={repository}
            depth={1}
            automaticPrices={automaticPrices}
            automaticPriceDetails={automaticPriceDetails}
            automaticPriceLabel={automaticPriceLabel}
            marketStatus={marketStatus}
          />
        )
      })}
    </div>
  )
}

