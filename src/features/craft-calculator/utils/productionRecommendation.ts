import type { Item } from '@core/domain/entities/Item'
import type { CityId, NodeReturnRateConfig } from '@core/domain/entities'
import { CITY_CRAFTING_SPECIALTIES } from '@core/domain/entities'
import {
  getCraftingSpecialtyCategory,
  type CraftingSpecialtyCategory,
} from '@features/item-browser/data/craftingBranches'

export interface ProductionCityRecommendation {
  readonly cityId: CityId
  readonly cityName: string
  readonly specialtyKind: 'crafting' | 'refining'
  readonly specialtyCategory: string
  readonly specialtyLabel: string
}

const CITY_NAME_BY_ID: Readonly<Record<CityId, string>> = {
  martlock: 'Martlock',
  bridgewatch: 'Bridgewatch',
  lymhurst: 'Lymhurst',
  fort_sterling: 'Fort Sterling',
  thetford: 'Thetford',
  caerleon: 'Caerleon',
  brecilien: 'Brecilien',
  island: 'Isla personal/de gremio',
}

const CRAFTING_SPECIALTY_LABELS: Readonly<
  Record<CraftingSpecialtyCategory, string>
> = {
  sword: 'espadas',
  axe: 'hachas',
  mace: 'mazas',
  hammer: 'martillos',
  crossbow: 'ballestas',
  war_gloves: 'guantes de guerra',
  bow: 'arcos',
  spear: 'lanzas',
  nature_staff: 'bastones naturales',
  dagger: 'dagas',
  quarterstaff: 'bastones de combate',
  fire_staff: 'bastones ígneos',
  holy_staff: 'bastones sagrados',
  arcane_staff: 'bastones arcanos',
  frost_staff: 'bastones de hielo',
  cursed_staff: 'bastones malditos',
  shapeshifter_staff: 'bastones metamórficos',
  plate_helmet: 'cascos de placas',
  plate_armor: 'armaduras de placas',
  plate_shoes: 'botas de placas',
  leather_helmet: 'capuchas de cuero',
  leather_armor: 'chaquetas de cuero',
  leather_shoes: 'zapatos de cuero',
  cloth_helmet: 'capuchas de tela',
  cloth_armor: 'túnicas de tela',
  cloth_shoes: 'sandalias de tela',
  offhand: 'manos secundarias',
}

const REFINING_RECOMMENDATIONS: readonly {
  readonly pattern: RegExp
  readonly cityId: CityId
  readonly category: string
  readonly label: string
}[] = [
  {
    pattern: /^T\d+_PLANKS(?:_LEVEL\d+)?$/,
    cityId: 'fort_sterling',
    category: 'wood',
    label: 'refinado de madera',
  },
  {
    pattern: /^T\d+_STONEBLOCK(?:_LEVEL\d+)?$/,
    cityId: 'bridgewatch',
    category: 'rock',
    label: 'refinado de piedra',
  },
  {
    pattern: /^T\d+_CLOTH(?:_LEVEL\d+)?$/,
    cityId: 'lymhurst',
    category: 'fiber',
    label: 'refinado de fibra',
  },
  {
    pattern: /^T\d+_LEATHER(?:_LEVEL\d+)?$/,
    cityId: 'martlock',
    category: 'hide',
    label: 'refinado de piel',
  },
  {
    pattern: /^T\d+_METALBAR(?:_LEVEL\d+)?$/,
    cityId: 'thetford',
    category: 'ore',
    label: 'refinado de mineral',
  },
]

function findCraftingCity(
  specialtyCategory: CraftingSpecialtyCategory,
): CityId | null {
  return (
    CITY_CRAFTING_SPECIALTIES.find((specialty) =>
      specialty.craftingCategories.includes(specialtyCategory),
    )?.city ?? null
  )
}

export function getProductionCityRecommendation(
  item: Item,
): ProductionCityRecommendation | null {
  if (item.category === 'refined_resource') {
    const match = REFINING_RECOMMENDATIONS.find((candidate) =>
      candidate.pattern.test(item.id),
    )

    if (!match) return null

    return {
      cityId: match.cityId,
      cityName: CITY_NAME_BY_ID[match.cityId],
      specialtyKind: 'refining',
      specialtyCategory: match.category,
      specialtyLabel: match.label,
    }
  }

  const specialtyCategory = getCraftingSpecialtyCategory(item)
  if (!specialtyCategory) return null

  const cityId = findCraftingCity(specialtyCategory)
  if (!cityId) return null

  return {
    cityId,
    cityName: CITY_NAME_BY_ID[cityId],
    specialtyKind: 'crafting',
    specialtyCategory,
    specialtyLabel: CRAFTING_SPECIALTY_LABELS[specialtyCategory],
  }
}

export function normalizeProductionConfigForRecommendation(
  config: NodeReturnRateConfig,
  recommendation: ProductionCityRecommendation | null,
): NodeReturnRateConfig {
  const isIsland = config.cityId === 'island'

  return {
    ...config,
    isIsland,
    hasSpecialtyBonus: !isIsland && recommendation?.cityId === config.cityId,
    specialtyKind: recommendation?.specialtyKind ?? config.specialtyKind,
  }
}

export function applyRecommendedProductionCity(
  config: NodeReturnRateConfig,
  recommendation: ProductionCityRecommendation | null,
  fallbackSpecialtyKind: NodeReturnRateConfig['specialtyKind'],
): NodeReturnRateConfig {
  if (!recommendation) {
    return normalizeProductionConfigForRecommendation(
      {
        ...config,
        specialtyKind: fallbackSpecialtyKind,
      },
      null,
    )
  }

  return normalizeProductionConfigForRecommendation(
    {
      ...config,
      cityId: recommendation.cityId,
      isIsland: false,
      specialtyKind: recommendation.specialtyKind,
    },
    recommendation,
  )
}
