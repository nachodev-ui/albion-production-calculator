import { describe, expect, it } from 'vitest'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import { asBaseItemId } from '@core/domain/entities/Item'
import type { NodeReturnRateConfig } from '@core/domain/entities'
import {
  applyRecommendedProductionCity,
  getProductionCityRecommendation,
  normalizeProductionConfigForRecommendation,
} from './productionRecommendation'

const repository = new JsonItemRepository()

function getItem(id: string) {
  const item = repository.getById(asBaseItemId(id))
  if (!item) throw new Error(`No se encontró ${id}`)
  return item
}

const baseConfig: NodeReturnRateConfig = {
  cityId: 'martlock',
  hasSpecialtyBonus: true,
  specialtyKind: 'crafting',
  useFocus: true,
  hasDailyBonus: false,
  dailyBonusAmount: 0.1,
  isIsland: false,
}

describe('getProductionCityRecommendation', () => {
  it('recomienda Bridgewatch para bastones malditos', () => {
    expect(
      getProductionCityRecommendation(getItem('T5_MAIN_CURSEDSTAFF')),
    ).toMatchObject({
      cityId: 'bridgewatch',
      specialtyKind: 'crafting',
      specialtyCategory: 'cursed_staff',
    })
  })

  it('recomienda Martlock para hachas', () => {
    expect(
      getProductionCityRecommendation(getItem('T5_MAIN_AXE')),
    ).toMatchObject({ cityId: 'martlock', specialtyCategory: 'axe' })
  })

  it('recomienda Fort Sterling para túnicas de tela', () => {
    expect(
      getProductionCityRecommendation(getItem('T5_ARMOR_CLOTH_SET1')),
    ).toMatchObject({
      cityId: 'fort_sterling',
      specialtyCategory: 'cloth_armor',
    })
  })

  it('recomienda Caerleon para guantes de guerra', () => {
    expect(
      getProductionCityRecommendation(getItem('T5_2H_KNUCKLES_SET1')),
    ).toMatchObject({
      cityId: 'caerleon',
      specialtyCategory: 'war_gloves',
    })
  })

  it('recomienda Martlock para manos secundarias', () => {
    expect(
      getProductionCityRecommendation(getItem('T5_OFF_SHIELD')),
    ).toMatchObject({
      cityId: 'martlock',
      specialtyCategory: 'offhand',
    })
  })

  it('recomienda Caerleon para bastones metamórficos futuros', () => {
    expect(
      getProductionCityRecommendation({
        id: asBaseItemId('T4_2H_SHAPESHIFTER_SET1'),
        name: 'Bastón metamórfico de prueba',
        tier: 4,
        category: 'weapon',
        maxEnchantment: 4,
        recipe: null,
      }),
    ).toMatchObject({
      cityId: 'caerleon',
      specialtyCategory: 'shapeshifter_staff',
    })
  })

  it('recomienda Fort Sterling para refinar tablas', () => {
    expect(getProductionCityRecommendation(getItem('T5_PLANKS'))).toMatchObject(
      {
        cityId: 'fort_sterling',
        specialtyKind: 'refining',
        specialtyCategory: 'wood',
      },
    )
  })

  it('no inventa una recomendación para capas', () => {
    expect(getProductionCityRecommendation(getItem('T5_CAPE'))).toBeNull()
  })
})

describe('normalización de la configuración recomendada', () => {
  const cursedRecommendation = getProductionCityRecommendation(
    getItem('T5_MAIN_CURSEDSTAFF'),
  )

  it('selecciona automáticamente la ciudad recomendada y activa el bono', () => {
    expect(
      applyRecommendedProductionCity(
        baseConfig,
        cursedRecommendation,
        'crafting',
      ),
    ).toMatchObject({
      cityId: 'bridgewatch',
      hasSpecialtyBonus: true,
      specialtyKind: 'crafting',
      isIsland: false,
    })
  })

  it('permite otra ciudad, pero desactiva el bono de especialidad', () => {
    expect(
      normalizeProductionConfigForRecommendation(
        { ...baseConfig, cityId: 'fort_sterling' },
        cursedRecommendation,
      ),
    ).toMatchObject({
      cityId: 'fort_sterling',
      hasSpecialtyBonus: false,
      isIsland: false,
    })
  })

  it('desactiva cualquier bono al usar una isla', () => {
    expect(
      normalizeProductionConfigForRecommendation(
        { ...baseConfig, cityId: 'island' },
        cursedRecommendation,
      ),
    ).toMatchObject({
      cityId: 'island',
      hasSpecialtyBonus: false,
      isIsland: true,
    })
  })
})
