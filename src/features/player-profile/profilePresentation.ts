import weaponFamilyNames from './data/weaponFamilyNames.es.json'
import type { AlbionEquipment, AlbionProfileEvent } from './types'

export type EquipmentSlotKey = keyof AlbionEquipment

export interface EquipmentSlotDefinition {
  readonly key: EquipmentSlotKey
  readonly label: string
  readonly compactLabel: string
}

export const EQUIPMENT_SLOTS: readonly EquipmentSlotDefinition[] = [
  { key: 'mainHand', label: 'Arma principal', compactLabel: 'Arma' },
  { key: 'offHand', label: 'Mano secundaria', compactLabel: 'Secundaria' },
  { key: 'head', label: 'Cabeza', compactLabel: 'Cabeza' },
  { key: 'armor', label: 'Armadura', compactLabel: 'Pecho' },
  { key: 'shoes', label: 'Calzado', compactLabel: 'Botas' },
  { key: 'cape', label: 'Capa', compactLabel: 'Capa' },
  { key: 'bag', label: 'Bolsa', compactLabel: 'Bolsa' },
  { key: 'food', label: 'Comida', compactLabel: 'Comida' },
  { key: 'potion', label: 'Poción', compactLabel: 'Poción' },
  { key: 'mount', label: 'Montura', compactLabel: 'Montura' },
]

const ASSET_ID_PATTERN = /^[A-Za-z0-9_@.-]+$/
const WEAPON_ITEM_PATTERN = /^T([1-8])_([^@]+)(?:@([0-4]))?$/
const WEAPON_FAMILY_NAMES = weaponFamilyNames as Readonly<Record<string, string>>

function normalizeAssetId(value?: string | null): string | null {
  const normalized = value?.trim() ?? ''
  if (!normalized || normalized.length > 180 || !ASSET_ID_PATTERN.test(normalized)) return null
  return normalized
}

export function isTwoHandedWeapon(itemType?: string | null): boolean {
  const normalized = normalizeAssetId(itemType)
  return normalized ? /^T[1-8]_2H_/.test(normalized) : false
}

export function equipmentSlotsFor(
  equipment: AlbionEquipment,
): readonly EquipmentSlotDefinition[] {
  if (!isTwoHandedWeapon(equipment.mainHand)) return EQUIPMENT_SLOTS
  return EQUIPMENT_SLOTS.filter((slot) => slot.key !== 'offHand')
}

export function albionWeaponDisplayName(itemType?: string | null): string {
  const normalized = normalizeAssetId(itemType)
  if (!normalized) return 'Arma desconocida'

  const match = WEAPON_ITEM_PATTERN.exec(normalized)
  if (!match) return normalized

  const tier = match[1]
  const family = match[2]
  const enchantment = Number(match[3] ?? 0)
  if (!tier || !family) return normalized

  const localizedName = WEAPON_FAMILY_NAMES[family]
  if (!localizedName) return normalized

  const itemPowerLabel = enchantment > 0 ? `T${tier}.${enchantment}` : `T${tier}`
  return `${localizedName} · ${itemPowerLabel}`
}

export function albionItemImageUrls(
  itemType?: string | null,
  size = 128,
  quality = 1,
): readonly string[] {
  const normalized = normalizeAssetId(itemType)
  if (!normalized) return []
  const safeSize = Math.min(512, Math.max(32, Math.round(size)))
  const safeQuality = Math.min(5, Math.max(1, Math.round(quality)))

  // MurderLedger and Albion Online 2D request original item thumbnails from this
  // CDN. It remains reliable for large decorative artwork, where the official
  // render endpoint can reject or omit oversized images.
  return [
    `https://cdn.albiononline2d.com/thumbnails/orig/${normalized}-q${safeQuality}.png`,
    `https://render.albiononline.com/v1/item/${encodeURIComponent(normalized)}.png?quality=${safeQuality}&size=${safeSize}`,
  ]
}

export function albionItemImageUrl(
  itemType?: string | null,
  size = 128,
  quality = 1,
): string | null {
  return albionItemImageUrls(itemType, size, quality)[0] ?? null
}

export function albionAvatarImageUrl(
  avatar?: string | null,
  avatarRing?: string | null,
): string | null {
  const normalizedAvatar = normalizeAssetId(avatar)
  if (!normalizedAvatar) return null
  const normalizedRing = normalizeAssetId(avatarRing)
  const query = normalizedRing ? `?ring=${encodeURIComponent(normalizedRing)}` : ''
  return `https://render.albiononline.com/v1/avatar/${encodeURIComponent(normalizedAvatar)}.png${query}`
}

export function equipmentForEvent(
  event: AlbionProfileEvent,
  side: 'player' | 'opponent',
): AlbionEquipment {
  const equipment = side === 'player' ? event.playerEquipment : event.opponentEquipment
  if (side === 'player' && !equipment?.mainHand && event.weaponType) {
    return { ...(equipment ?? {}), mainHand: event.weaponType }
  }
  return equipment ?? {}
}

export function equipmentItems(equipment: AlbionEquipment) {
  return equipmentSlotsFor(equipment).flatMap((slot) => {
    const itemType = equipment[slot.key]?.trim()
    return itemType ? [{ ...slot, itemType }] : []
  })
}

export interface FeaturedBuild {
  readonly equipment: AlbionEquipment
  readonly uses: number
  readonly victories: number
  readonly winRate: number
  readonly weaponType?: string | null
}

interface MutableBuild {
  equipment: AlbionEquipment
  uses: number
  victories: number
  weaponType?: string | null
}

export function selectFeaturedBuild(
  events: readonly AlbionProfileEvent[],
): FeaturedBuild | null {
  const builds = new Map<string, MutableBuild>()

  for (const event of events) {
    const equipment = equipmentForEvent(event, 'player')
    const items = equipmentItems(equipment)
    if (items.length === 0) continue
    const signature = EQUIPMENT_SLOTS.map((slot) => equipment[slot.key] ?? '').join('|')
    const current = builds.get(signature) ?? {
      equipment,
      uses: 0,
      victories: 0,
      weaponType: equipment.mainHand ?? event.weaponType,
    }
    current.uses += 1
    if (event.result === 'kill') current.victories += 1
    builds.set(signature, current)
  }

  let selected: MutableBuild | null = null
  for (const build of builds.values()) {
    if (
      !selected ||
      build.uses > selected.uses ||
      (build.uses === selected.uses && build.victories > selected.victories)
    ) {
      selected = build
    }
  }

  if (!selected) return null
  return {
    ...selected,
    winRate: selected.uses > 0 ? (selected.victories / selected.uses) * 100 : 0,
  }
}

export interface WeaponUsage {
  readonly weaponType: string
  readonly uses: number
  readonly victories: number
  readonly winRate: number
}

export function selectMostUsedWeapon(
  events: readonly AlbionProfileEvent[],
): WeaponUsage | null {
  const weapons = new Map<string, { uses: number; victories: number }>()
  for (const event of events) {
    const weaponType = equipmentForEvent(event, 'player').mainHand?.trim()
    if (!weaponType) continue
    const usage = weapons.get(weaponType) ?? { uses: 0, victories: 0 }
    usage.uses += 1
    if (event.result === 'kill') usage.victories += 1
    weapons.set(weaponType, usage)
  }

  let selected: [string, { uses: number; victories: number }] | null = null
  for (const entry of weapons.entries()) {
    if (
      !selected ||
      entry[1].uses > selected[1].uses ||
      (entry[1].uses === selected[1].uses && entry[1].victories > selected[1].victories)
    ) {
      selected = entry
    }
  }
  if (!selected) return null
  return {
    weaponType: selected[0],
    uses: selected[1].uses,
    victories: selected[1].victories,
    winRate: selected[1].uses > 0 ? (selected[1].victories / selected[1].uses) * 100 : 0,
  }
}
