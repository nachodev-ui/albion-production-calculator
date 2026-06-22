import { useState } from 'react'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { Item } from '@core/domain/entities/Item'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'
import { EnchantmentSelector } from './EnchantmentSelector'
import { ItemRecipeCard } from './recipe/ItemRecipeCard'

interface ItemDetailPanelProps {
  readonly item: Item
  readonly repository: ItemRepository
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

      <ItemRecipeCard
        item={item}
        enchantment={enchantment}
        repository={repository}
      />
    </div>
  )
}