import { useMemo, useState } from 'react'
import { buildItemIconUrl } from '@core/domain/entities/Item'
import type { BaseItemId } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'

type ItemIconPriority = 'high' | 'auto' | 'low'

interface ItemIconProps {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly name: string
  readonly size?: number
  readonly className?: string
  /**
   * Los iconos visibles de la selección activa deben usar `high` para comenzar
   * su descarga sin esperar a imágenes decorativas que estén fuera de pantalla.
   */
  readonly priority?: ItemIconPriority
}

/**
 * Ícono de ítem usando el servicio de render oficial de Albion.
 *
 * La carga de la imagen es deliberadamente independiente del mercado: cuando
 * cambia el identificador se reemplaza inmediatamente el render anterior por un
 * skeleton de tamaño estable. Así una consulta lenta de precios o un render que
 * todavía no está en caché no hace parecer que la selección anterior sigue activa.
 */
export function ItemIcon({
  itemId,
  enchantment,
  name,
  size = 40,
  className = '',
  priority = 'auto',
}: ItemIconProps) {
  const url = useMemo(
    () => buildItemIconUrl(itemId, enchantment, Math.max(size * 2, 64)),
    [enchantment, itemId, size],
  )
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  // El estado conserva la URL que terminó de cargar o fallar. Al cambiar `url`,
  // ambas comparaciones pasan a false en el mismo render, sin un efecto posterior.
  const loaded = loadedUrl === url
  const failed = failedUrl === url
  const loading = !loaded && !failed

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-raised ${className}`}
      style={{ width: size, height: size }}
      aria-busy={loading}
    >
      {loading && (
        <span
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface-raised via-border/70 to-surface-raised"
          aria-hidden="true"
        />
      )}

      {failed ? (
        <span
          className="relative z-[1] flex h-full w-full items-center justify-center font-display text-text-faint"
          style={{ fontSize: size * 0.4 }}
          aria-hidden="true"
        >
          {name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          key={url}
          src={url}
          alt={name}
          width={size}
          height={size}
          loading={priority === 'low' ? 'lazy' : 'eager'}
          fetchPriority={priority}
          decoding="async"
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailedUrl(url)}
          className={`relative z-[1] h-full w-full object-contain transition-opacity duration-150 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </span>
  )
}
