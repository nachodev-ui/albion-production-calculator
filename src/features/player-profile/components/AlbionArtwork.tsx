import type { AlbionEquipment } from '../types'
import {
  albionAvatarImageUrl,
  albionItemImageUrl,
  equipmentItems,
} from '../profilePresentation'

interface ItemIconProps {
  readonly itemType?: string | null
  readonly label: string
  readonly size?: number
  readonly className?: string
  readonly imageClassName?: string
  readonly decorative?: boolean
}

function ImagePlaceholder({ label }: { readonly label: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
      {label.slice(0, 2)}
    </span>
  )
}

export function AlbionItemIcon({
  itemType,
  label,
  size = 128,
  className = '',
  imageClassName = '',
  decorative = false,
}: ItemIconProps) {
  const src = albionItemImageUrl(itemType, size)
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised/90 shadow-inner ${className}`}
      title={itemType ? `${label}: ${itemType}` : `${label}: sin información`}
    >
      <ImagePlaceholder label={label} />
      {src && (
        <img
          src={src}
          alt={decorative ? '' : `${label}: ${itemType}`}
          aria-hidden={decorative || undefined}
          loading={decorative ? 'eager' : 'lazy'}
          decoding="async"
          className={`absolute inset-0 h-full w-full object-contain ${imageClassName}`}
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
        />
      )}
    </div>
  )
}

interface AvatarProps {
  readonly avatar?: string | null
  readonly avatarRing?: string | null
  readonly playerName: string
  readonly className?: string
}

export function AlbionAvatar({
  avatar,
  avatarRing,
  playerName,
  className = '',
}: AvatarProps) {
  const src = albionAvatarImageUrl(avatar, avatarRing)
  const initial = playerName.trim().slice(0, 1).toUpperCase() || 'A'
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent-border bg-gradient-to-br from-accent-muted to-surface-raised font-display text-3xl text-accent shadow-[0_18px_50px_rgba(0,0,0,0.28)] ${className}`}
    >
      <span aria-hidden="true">{initial}</span>
      {src && (
        <img
          src={src}
          alt={`Avatar de ${playerName}`}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.hidden = true
          }}
        />
      )}
    </div>
  )
}

interface EquipmentStripProps {
  readonly equipment: AlbionEquipment
  readonly className?: string
  readonly compact?: boolean
  readonly emptyLabel?: string
}

export function EquipmentStrip({
  equipment,
  className = '',
  compact = false,
  emptyLabel = 'Equipamiento no disponible',
}: EquipmentStripProps) {
  const items = equipmentItems(equipment)
  if (items.length === 0) {
    return (
      <p className={`rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-text-faint ${className}`}>
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((item) => (
        <div key={item.key} className="space-y-1 text-center">
          <AlbionItemIcon
            itemType={item.itemType}
            label={item.label}
            size={compact ? 96 : 128}
            className={compact ? 'h-12 w-12 rounded-lg' : 'h-14 w-14'}
          />
          {!compact && (
            <p className="max-w-14 truncate text-[9px] uppercase tracking-wide text-text-faint">
              {item.compactLabel}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
