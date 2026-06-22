import { useState } from 'react'
import { buildItemIconUrl } from '@core/domain/entities/Item'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

interface ItemIconProps {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly name: string
  readonly size?: number
  readonly className?: string
}

/**
 * Ícono de ítem usando el servicio de render oficial de Albion
 * (`buildItemIconUrl`). Algunos ítems del dataset (vanity raros,
 * blueprints) no tienen render disponible — en vez de mostrar un
 * ícono roto del navegador, cae a una inicial sobre fondo sólido.
 */
export function ItemIcon({ itemId, enchantment, name, size = 40, className = '' }: ItemIconProps) {
  const [failed, setFailed] = useState(false)
  const url = buildItemIconUrl(itemId, enchantment, Math.max(size * 2, 64))

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 rounded-md bg-surface-raised border border-border text-text-faint font-display ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {name.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-md bg-surface-raised border border-border object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
