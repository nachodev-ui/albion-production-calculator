import { formatEnchantment } from '@core/domain/entities/Enchantment'
import type { ReturnedMaterial } from '@core/domain/entities/CraftCostNode'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { ItemIcon } from '@shared/components/ItemIcon'
import { InfoHint } from '@shared/components/InfoHint'
import { RETURNED_MATERIALS_INFO } from '@features/craft-calculator/content/returnedMaterialsInfo'

interface ReturnedMaterialsCardProps {
  readonly materials: readonly ReturnedMaterial[]
  readonly repository: ItemRepository
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
}: ReturnedMaterialsCardProps) {
  const totalReturnedValue = materials.reduce(
    (sum, material) => sum + material.silverValue,
    0,
  )

  const hasReturnedMaterials = materials.length > 0

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-text">
              Materiales recuperados
            </h3>

            <InfoHint
              label="Materiales recuperados"
              text={RETURNED_MATERIALS_INFO.section}
              align="left"
            />
          </div>

          <p className="mt-1 text-xs text-text-faint">
            Solo incluye recursos retornables; los artefactos se consumen por completo.
          </p>
        </div>

        {hasReturnedMaterials && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-text-faint">
              Valor recuperado
            </p>
            <p className="mt-0.5 font-semibold tabular text-positive">
              {formatSilver(totalReturnedValue)} plata
            </p>
          </div>
        )}
      </div>

      {!hasReturnedMaterials ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-center">
          <p className="text-sm text-text-muted">
            No hay materiales recuperados con la configuración actual.
          </p>
          <p className="mt-1 text-xs text-text-faint">
            Activa un RRR mayor que 0%, expande la receta y añade precios a los recursos refinados.
          </p>
        </div>
      ) : (
        <>
          {/* Tabla para pantallas medianas y grandes. */}
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

          {/* Tarjetas compactas para móvil. */}
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
            Las cantidades son estimadas. El resultado real puede variar ligeramente
            por el redondeo del juego, especialmente al fabricar pocas unidades.
          </p>
        </>
      )}
    </section>
  )
}
