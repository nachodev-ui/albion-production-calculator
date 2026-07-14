import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import {
  deserializeCraftWorkspace,
  serializeCraftWorkspace,
} from './craftWorkspaceStorage'

const itemId = asBaseItemId('T4_MAIN_SWORD')

describe('craftWorkspaceStorage', () => {
  it('restaura selección, cantidad y configuración por receta', () => {
    const source = {
      selectedItemId: itemId,
      enchantmentsByItem: new Map([[itemId, 2 as const]]),
      quantitiesByRoot: new Map([['T4_MAIN_SWORD@2', 25]]),
      expandedPathsByRoot: new Map([
        ['T4_MAIN_SWORD@2', new Set(['root', 'root-0'])],
      ]),
      selectedRecipeOptionsByRoot: new Map([
        ['T4_MAIN_SWORD@2', new Map([['root', 1]])],
      ]),
      productionConfig: {
        cityId: 'martlock',
        hasSpecialtyBonus: true,
        specialtyKind: 'crafting' as const,
        useFocus: true,
        hasDailyBonus: true,
        dailyBonusAmount: 0.1 as const,
        isIsland: false,
      },
      stationFeeConfig: {
        accessType: 'associate' as const,
        userFeePer100Nutrition: 350,
        associateFeePer100Nutrition: 250,
      },
      craftingSpecializationConfig: {
        focusCostEfficiency: 12000,
        availableFocus: 30000,
        qualityIncrease: 150,
        hideoutSpecialistBonus: 0,
      },
      itemValueOverridesByRoot: new Map([['T4_MAIN_SWORD@2', 64]]),
      stationUsageFeeOverridesByRoot: new Map([
        [
          'T4_MAIN_SWORD@2',
          { totalFee: 1800, quantity: 25, craftsNeeded: 25 },
        ],
      ]),
      isPremium: false,
    }

    const restored = deserializeCraftWorkspace(
      JSON.parse(JSON.stringify(serializeCraftWorkspace(source))) as unknown,
    )

    expect(restored.selectedItemId).toBe(itemId)
    expect(restored.enchantmentsByItem.get(itemId)).toBe(2)
    expect(restored.quantitiesByRoot.get('T4_MAIN_SWORD@2')).toBe(25)
    expect(restored.expandedPathsByRoot.get('T4_MAIN_SWORD@2')).toEqual(
      new Set(['root', 'root-0']),
    )
    expect(
      restored.selectedRecipeOptionsByRoot
        .get('T4_MAIN_SWORD@2')
        ?.get('root'),
    ).toBe(1)
    expect(restored.productionConfig?.cityId).toBe('martlock')
    expect(restored.stationFeeConfig?.accessType).toBe('associate')
    expect(restored.craftingSpecializationConfig?.availableFocus).toBe(30000)
    expect(restored.itemValueOverridesByRoot.get('T4_MAIN_SWORD@2')).toBe(64)
    expect(
      restored.stationUsageFeeOverridesByRoot.get('T4_MAIN_SWORD@2')
        ?.totalFee,
    ).toBe(1800)
    expect(restored.isPremium).toBe(false)
  })

  it('ignora valores corruptos sin impedir la restauración segura', () => {
    const restored = deserializeCraftWorkspace({
      version: 1,
      selectedItemId: 'T4_MAIN_SWORD',
      enchantmentsByItem: [
        ['T4_MAIN_SWORD', 9],
        ['T5_MAIN_AXE', 1],
      ],
      quantitiesByRoot: [
        ['T4_MAIN_SWORD@0', 0],
        ['T5_MAIN_AXE@1', 12],
      ],
      expandedPathsByRoot: [['T5_MAIN_AXE@1', ['root', 42]]],
      selectedRecipeOptionsByRoot: [
        ['T5_MAIN_AXE@1', [['root', -1]]],
      ],
      productionConfig: null,
      stationFeeConfig: null,
      craftingSpecializationConfig: null,
      itemValueOverridesByRoot: [['T5_MAIN_AXE@1', -10]],
      stationUsageFeeOverridesByRoot: [
        ['T5_MAIN_AXE@1', { totalFee: 10, quantity: 0, craftsNeeded: 1 }],
      ],
      isPremium: 'yes',
    })

    expect(restored.selectedItemId).toBe(asBaseItemId('T4_MAIN_SWORD'))
    expect(restored.enchantmentsByItem.get(asBaseItemId('T5_MAIN_AXE'))).toBe(1)
    expect(restored.enchantmentsByItem.has(itemId)).toBe(false)
    expect(restored.quantitiesByRoot.get('T5_MAIN_AXE@1')).toBe(12)
    expect(restored.quantitiesByRoot.has('T4_MAIN_SWORD@0')).toBe(false)
    expect(restored.expandedPathsByRoot.get('T5_MAIN_AXE@1')).toEqual(
      new Set(['root']),
    )
    expect(restored.selectedRecipeOptionsByRoot.size).toBe(0)
    expect(restored.itemValueOverridesByRoot.size).toBe(0)
    expect(restored.stationUsageFeeOverridesByRoot.size).toBe(0)
    expect(restored.isPremium).toBeNull()
  })
})
