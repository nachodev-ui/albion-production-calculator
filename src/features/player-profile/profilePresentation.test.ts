import { describe, expect, it } from 'vitest'
import {
  albionAvatarImageUrl,
  albionItemImageUrl,
  albionItemImageUrls,
  equipmentForEvent,
  selectFeaturedBuild,
  selectMostUsedWeapon,
} from './profilePresentation'
import type { AlbionProfileEvent } from './types'

const event = (
  eventId: number,
  result: 'kill' | 'death',
  weaponType: string,
  armor = 'T6_ARMOR_CLOTH_SET1',
): AlbionProfileEvent => ({
  eventId,
  occurredAt: `2026-07-${String(eventId).padStart(2, '0')}T00:00:00Z`,
  result,
  opponentName: `Opponent ${eventId}`,
  killFame: 1000,
  playerItemPower: 1200,
  opponentItemPower: 1100,
  weaponType,
  playerEquipment: { mainHand: weaponType, armor },
  opponentEquipment: { mainHand: 'T5_MAIN_AXE' },
  participantCount: 2,
  groupMemberCount: 1,
})

describe('player profile presentation', () => {
  it('builds the Albion 2D source used by ledger images and a render fallback', () => {
    expect(albionItemImageUrl('T6_MAIN_SWORD@2', 96)).toBe(
      'https://cdn.albiononline2d.com/thumbnails/orig/T6_MAIN_SWORD@2-q1.png',
    )
    expect(albionItemImageUrls('T6_MAIN_SWORD@2', 96)).toEqual([
      'https://cdn.albiononline2d.com/thumbnails/orig/T6_MAIN_SWORD@2-q1.png',
      'https://render.albiononline.com/v1/item/T6_MAIN_SWORD%402.png?quality=1&size=96',
    ])
    expect(albionAvatarImageUrl('AVATAR_01', 'RING_01')).toBe(
      'https://render.albiononline.com/v1/avatar/AVATAR_01.png?ring=RING_01',
    )
    expect(albionItemImageUrl('../unsafe')).toBeNull()
  })

  it('keeps legacy weapon-only events visible', () => {
    const legacy: AlbionProfileEvent = {
      ...event(1, 'kill', 'T7_MAIN_SPEAR'),
      playerEquipment: undefined,
    }
    expect(equipmentForEvent(legacy, 'player').mainHand).toBe('T7_MAIN_SPEAR')
  })

  it('selects the most frequent build and weapon', () => {
    const events = [
      event(1, 'kill', 'T6_MAIN_SWORD'),
      event(2, 'death', 'T6_MAIN_SWORD'),
      event(3, 'kill', 'T7_MAIN_SPEAR'),
    ]
    const build = selectFeaturedBuild(events)
    const weapon = selectMostUsedWeapon(events)

    expect(build?.uses).toBe(2)
    expect(build?.victories).toBe(1)
    expect(build?.weaponType).toBe('T6_MAIN_SWORD')
    expect(weapon).toMatchObject({
      weaponType: 'T6_MAIN_SWORD',
      uses: 2,
      victories: 1,
      winRate: 50,
    })
  })
})
