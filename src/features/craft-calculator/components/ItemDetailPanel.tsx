import { lazy, Suspense, useState } from 'react'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { EnchantmentSelector } from './EnchantmentSelector'

const LazyItemRecipeCard = lazy(() =>
  import('./recipe/ItemRecipeCard').then((module) => ({
    default: module.ItemRecipeCard,
  })),
)

interface ItemDetailPanelProps {
  readonly item: Item
  readonly repository: ItemRepository
}

function RecipePanelFallback() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-surface-raised" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-surface-raised" />
          <div className="h-3 w-28 animate-pulse rounded bg-surface-raised" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
        <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
      </div>

      <p className="mt-4 text-xs text-text-faint">
        Cargando calculadora avanzada, historial y paneles secundarios…
      </p>
    </div>
  )
}

export function ItemDetailPanel({
  item,
  repository,
}: ItemDetailPanelProps) {
  const [enchantment, setEnchantment] =
    useState<EnchantmentLevel>(0)

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-0 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface/86 px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-faint">
            Nivel de encantamiento
          </p>

          <p className="text-sm text-text-muted">
            Ajusta el grado para recalcular la receta
          </p>
        </div>

        <EnchantmentSelector
          value={enchantment}
          onChange={setEnchantment}
          maxEnchantment={item.maxEnchantment}
        />
      </div>

      <Suspense fallback={<RecipePanelFallback />}>
        <LazyItemRecipeCard
          item={item}
          enchantment={enchantment}
          repository={repository}
        />
      </Suspense>
    </div>
  )
}
