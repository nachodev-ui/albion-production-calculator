import { formatEnchantment } from '@core/domain/entities/Enchantment'
import type {
  CraftCostNode,
  ReturnedMaterial,
} from '@core/domain/entities/CraftCostNode'
import { getRecipeOption, getRecipeTier } from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { buildRoyalRecipeRequirements } from '@core/usecases/buildRoyalRecipeRequirements'
import { ItemIcon } from '@shared/components/ItemIcon'
import { InfoHint } from '@shared/components/InfoHint'
import { RETURNED_MATERIALS_INFO } from '@features/craft-calculator/content/returnedMaterialsInfo'

interface ReturnedMaterialsCardProps {
  readonly materials: readonly ReturnedMaterial[]
  readonly repository: ItemRepository
  readonly rootNode: CraftCostNode
}

function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(quantity)
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ReturnedMaterialsCard({
  materials,
  repository,
  rootNode,
}: ReturnedMaterialsCardProps) {
  const totalReturnedValue = materials.reduce(
    (sum, material) => sum + material.silverValue,
    0,
  )
  const rootItem = repository.getById(rootNode.itemId)
  const rootTier = rootItem?.recipe
    ? getRecipeTier(rootItem.recipe, rootNode.enchantment)
    : null
  const rootOption = rootTier
    ? getRecipeOption(rootTier, rootNode.recipeOptionIndex ?? 0)
    : null
  const royalRequirements = buildRoyalRecipeRequirements(
    rootOption,
    rootNode.quantity,
  )

  const hasReturnedMaterials = materials.length > 0
  const hasRoyalRequirements =
    royalRequirements !== null && royalRequirements.requirements.length > 0
  const title = hasRoyalRequirements
    ? 'Requisitos de receta Royal'
    : 'Materiales recuperados'
  const infoText = hasRoyalRequirements
    ? 'Las cantidades muestran los insumos directos necesarios para el lote completo. La pieza base y los Sellos Reales se consumen por completo en la etapa Royal y no reciben retorno de recursos.'
    : RETURNED_MATERIALS_INFO.section

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-text">{title}</h3>

            <InfoHint label={title} text={infoText} align="left" />
          </div>

          <p className="mt-1 text-xs text-text-faint">
            {hasRoyalRequirements
              ? 'La pieza base y los Sellos Reales se consumen por completo; el RRR no reduce estas cantidades.'
              : 'Solo incluye recursos retornables; los artefactos se consumen por completo.'}
          </p>
        </div>

        {hasReturnedMaterials ? (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-text-faint">
              Valor recuperado
            </p>
            <p className="mt-0.5 font-semibold tabular text-positive">
              {formatSilver(totalReturnedValue)} plata
            </p>
          </div>
        ) : (
          hasRoyalRequirements && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-text-faint">
                Lote calculado
              </p>
              <p className="mt-0.5 font-semibold tabular text-text">
                {formatQuantity(royalRequirements.requestedOutputQuantity)}{' '}
                {royalRequirements.requestedOutputQuantity === 1
                  ? 'unidad'
                  : 'unidades'}
              </p>
            </div>
          )
        )}
      </div>

      {hasRoyalRequirements && (
        <div className="mb-4 space-y-3">
          <div className="rounded-lg border border-accent-border/60 bg-accent-muted/30 p-3">
            <p className="text-sm font-medium text-accent">
              Consumo completo en la etapa Royal
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Debes disponer del total indicado antes de fabricar. El retorno de
              recursos solo puede aplicarse dentro de subrecetas expandidas, como
              la fabricación previa de la pieza base, pero nunca devuelve la pieza
              terminada ni los Sellos Reales usados para convertirla.
            </p>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <div className="grid grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)] gap-3 bg-surface px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-text-faint">
              <span>Material requerido</span>
              <span>Función</span>
              <span className="text-right">Cantidad total</span>
              <span className="text-right">Retorno Royal</span>
            </div>

            <div className="divide-y divide-border">
              {royalRequirements.requirements.map((requirement) => {
                const item = repository.getById(requirement.itemId)
                const displayName = item?.name ?? String(requirement.itemId)
                const kindLabel =
                  requirement.kind === 'royal_sigil'
                    ? 'Sello Real'
                    : 'Pieza base'

                return (
                  <div
                    key={`${requirement.itemId}@${requirement.enchantment}:${requirement.kind}`}
                    className="grid grid-cols-[minmax(220px,1.5fr)_minmax(120px,0.7fr)_minmax(110px,0.6fr)_minmax(110px,0.6fr)] items-center gap-3 bg-surface-raised px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ItemIcon
                        itemId={requirement.itemId}
                        enchantment={requirement.enchantment}
                        name={displayName}
                        size={36}
                      />

                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {displayName}
                        </p>
                        {requirement.enchantment > 0 && (
                          <p className="text-xs text-text-faint">
                            {formatEnchantment(requirement.enchantment)}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="w-fit rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-text-muted">
                      {kindLabel}
                    </span>

                    <span className="text-right font-semibold tabular text-text">
                      {formatQuantity(requirement.quantity)}
                    </span>

                    <span className="text-right text-xs font-medium text-negative">
                      No retorna
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {royalRequirements.requirements.map((requirement) => {
              const item = repository.getById(requirement.itemId)
              const displayName = item?.name ?? String(requirement.itemId)
              const kindLabel =
                requirement.kind === 'royal_sigil' ? 'Sello Real' : 'Pieza base'

              return (
                <article
                  key={`${requirement.itemId}@${requirement.enchantment}:${requirement.kind}`}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon
                      itemId={requirement.itemId}
                      enchantment={requirement.enchantment}
                      name={displayName}
                      size={40}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {displayName}
                      </p>
                      <p className="mt-0.5 text-xs text-text-faint">
                        {kindLabel}
                        {requirement.enchantment > 0
                          ? ` · ${formatEnchantment(requirement.enchantment)}`
                          : ''}
                      </p>
                    </div>

                    <span className="shrink-0 text-base font-semibold tabular text-text">
                      ×{formatQuantity(requirement.quantity)}
                    </span>
                  </div>

                  <p className="mt-3 border-t border-border pt-2 text-right text-xs font-medium text-negative">
                    Se consume por completo · sin retorno Royal
                  </p>
                </article>
              )
            })}
          </div>

          <p className="text-xs leading-relaxed text-text-faint">
            Total calculado para {formatQuantity(royalRequirements.craftsNeeded)}{' '}
            {royalRequirements.craftsNeeded === 1 ? 'tirada' : 'tiradas'} de la
            variante seleccionada.
          </p>
        </div>
      )}

      {!hasReturnedMaterials ? (
        hasRoyalRequirements ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-3 text-center">
            <p className="text-xs text-text-faint">
              No hay materiales recuperables adicionales en las subrecetas
              expandidas con la configuración actual.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-center">
            <p className="text-sm text-text-muted">
              No hay materiales recuperados con la configuración actual.
            </p>
            <p className="mt-1 text-xs text-text-faint">
              Activa un RRR mayor que 0%, expande la receta y añade precios a los
              recursos refinados.
            </p>
          </div>
        )
      ) : (
        <>
          {hasRoyalRequirements && (
            <div className="mb-3 border-t border-border pt-4">
              <h4 className="text-sm font-medium text-text">
                Materiales recuperados en subrecetas
              </h4>
              <p className="mt-1 text-xs text-text-faint">
                Este retorno proviene de etapas de fabricación expandidas y no
                reduce los requisitos Royal mostrados arriba.
              </p>
            </div>
          )}

          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <div className="grid grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(105px,0.7fr))] gap-3 bg-surface px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-text-faint">
              <span>Material</span>

              <div className="flex items-center justify-end gap-1.5">
                <span>Usados</span>
                <InfoHint
                  label="Materiales usados"
                  text={RETURNED_MATERIALS_INFO.grossQuantity}
                  align="right"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <span>Retorno</span>
                <InfoHint
                  label="Retorno estimado"
                  text={RETURNED_MATERIALS_INFO.returnedQuantity}
                  align="right"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <span>Consumo neto</span>
                <InfoHint
                  label="Consumo neto"
                  text={RETURNED_MATERIALS_INFO.netQuantity}
                  align="right"
                />
              </div>

              <div className="flex items-center justify-end gap-1.5">
                <span>Valor</span>
                <InfoHint
                  label="Valor recuperado"
                  text={RETURNED_MATERIALS_INFO.silverValue}
                  align="right"
                />
              </div>
            </div>

            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {materials.map((material) => {
                const item = repository.getById(material.itemId)
                const displayName = item?.name ?? String(material.itemId)

                return (
                  <div
                    key={`${material.itemId}@${material.enchantment}`}
                    className="grid grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(105px,0.7fr))] items-center gap-3 bg-surface-raised px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ItemIcon
                        itemId={material.itemId}
                        enchantment={material.enchantment}
                        name={displayName}
                        size={36}
                      />

                      <div className="min-w-0">
                        <p className="truncate font-medium text-text">
                          {displayName}
                        </p>

                        {material.enchantment > 0 && (
                          <p className="text-xs text-text-faint">
                            {formatEnchantment(material.enchantment)}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-right tabular text-text-muted">
                      {formatQuantity(material.grossQuantity)}
                    </span>

                    <span className="text-right font-medium tabular text-positive">
                      +{formatQuantity(material.returnedQuantity)}
                    </span>

                    <span className="text-right tabular text-text">
                      {formatQuantity(material.netQuantity)}
                    </span>

                    <span className="text-right font-medium tabular text-positive">
                      {formatSilver(material.silverValue)} plata
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {materials.map((material) => {
              const item = repository.getById(material.itemId)
              const displayName = item?.name ?? String(material.itemId)

              return (
                <article
                  key={`${material.itemId}@${material.enchantment}`}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon
                      itemId={material.itemId}
                      enchantment={material.enchantment}
                      name={displayName}
                      size={40}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {displayName}
                      </p>

                      {material.enchantment > 0 && (
                        <p className="text-xs text-text-faint">
                          {formatEnchantment(material.enchantment)}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-sm font-semibold tabular text-positive">
                      +{formatQuantity(material.returnedQuantity)}
                    </span>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-text-faint">
                        Usados
                      </dt>
                      <dd className="mt-1 text-xs tabular text-text-muted">
                        {formatQuantity(material.grossQuantity)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-text-faint">
                        Consumo
                      </dt>
                      <dd className="mt-1 text-xs tabular text-text">
                        {formatQuantity(material.netQuantity)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-text-faint">
                        Valor
                      </dt>
                      <dd className="mt-1 text-xs font-medium tabular text-positive">
                        {formatSilver(material.silverValue)}
                      </dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-text-faint">
            Las cantidades son estimadas. El resultado real puede variar
            ligeramente por el redondeo del juego, especialmente al fabricar pocas
            unidades.
          </p>
        </>
      )}
    </section>
  )
}
