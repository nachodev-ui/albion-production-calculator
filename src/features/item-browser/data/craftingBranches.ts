import type { Item, ItemCategory } from '@core/domain/entities/Item'

export type BranchCategory = 'weapon' | 'armor' | 'offhand' | 'accessory'
export type CraftingBranchKind = 'introduction' | 'specialization' | 'collection'
export type CraftingBranchId = string

export type CraftingSpecialtyCategory =
  | 'sword'
  | 'axe'
  | 'mace'
  | 'hammer'
  | 'crossbow'
  | 'war_gloves'
  | 'bow'
  | 'spear'
  | 'nature_staff'
  | 'dagger'
  | 'quarterstaff'
  | 'fire_staff'
  | 'holy_staff'
  | 'arcane_staff'
  | 'frost_staff'
  | 'cursed_staff'
  | 'shapeshifter_staff'
  | 'plate_helmet'
  | 'plate_armor'
  | 'plate_shoes'
  | 'leather_helmet'
  | 'leather_armor'
  | 'leather_shoes'
  | 'cloth_helmet'
  | 'cloth_armor'
  | 'cloth_shoes'
  | 'offhand'

export type CraftingStationGroup =
  | 'starter'
  | 'warrior_forge'
  | 'hunter_lodge'
  | 'mage_tower'
  | 'toolmaker'
  | 'magic_wardrobe'

export interface ParsedTieredItemId {
  readonly tier: number
  readonly familyId: string
}

export interface ItemFamily {
  readonly id: string
  readonly name: string
  readonly suffix: string
  readonly representativeItem: Item
  readonly items: readonly Item[]
}

export interface CraftingBranch {
  readonly id: CraftingBranchId
  readonly name: string
  readonly description: string
  readonly tierLabel: string
  readonly kind: CraftingBranchKind
  readonly stationGroup: CraftingStationGroup
  readonly families: readonly ItemFamily[]
  readonly itemCount: number
}

export interface CraftingBranchSection {
  readonly id: CraftingStationGroup
  readonly label: string
  readonly description: string
  readonly branches: readonly CraftingBranch[]
}

export interface CraftingBranchCatalog {
  readonly category: BranchCategory
  readonly introText: string
  readonly emptyMessage: string
  readonly sections: readonly CraftingBranchSection[]
  readonly branches: readonly CraftingBranch[]
  readonly itemCount: number
}

interface BranchDefinition {
  readonly id: CraftingBranchId
  readonly name: string
  readonly description: string
  readonly tierLabel: string
  readonly kind: CraftingBranchKind
  readonly stationGroup: CraftingStationGroup
  readonly familyIds?: ReadonlySet<string>
}

interface BranchCategoryDefinition {
  readonly category: BranchCategory
  readonly introText: string
  readonly emptyMessage: string
  readonly branchOrder: readonly CraftingBranchId[]
  readonly branches: Readonly<Record<CraftingBranchId, BranchDefinition>>
  readonly sectionOrder: readonly CraftingStationGroup[]
  readonly sectionCopy: Readonly<
    Partial<
      Record<
        CraftingStationGroup,
        { readonly label: string; readonly description: string }
      >
    >
  >
}

interface CategorizedEntry {
  readonly item: Item
  readonly parsed: ParsedTieredItemId
  readonly branchId: CraftingBranchId
}

const TIERED_ID_PATTERN = /^T(\d+)_(.+)$/
const TIER_NAME_SUFFIX =
  /\s+del\s+(?:principiante|novato|obrero|iniciado|experto|maestro|gran maestro|anciano)$/i

const FAMILY_SUFFIX_ORDER: Readonly<Record<string, number>> = {
  SET1: 0,
  SET2: 1,
  SET3: 2,
  ROYAL: 3,
  UNDEAD: 4,
  HELL: 5,
  KEEPER: 6,
  MORGANA: 7,
  FEY: 8,
  AVALON: 9,
  CRYSTAL: 10,
}

const ARMOR_ID_PATTERN = /^(HEAD|ARMOR|SHOES)_(PLATE|LEATHER|CLOTH)_(.+)$/

const ARMOR_BRANCH_ORDER: readonly CraftingBranchId[] = [
  'trainee_crafter',
  'journeyman_warrior_forge',
  'journeyman_hunter_lodge',
  'journeyman_mage_tower',
  'plate_head',
  'plate_armor',
  'plate_shoes',
  'leather_head',
  'leather_armor',
  'leather_shoes',
  'cloth_head',
  'cloth_armor',
  'cloth_shoes',
]

const ARMOR_BRANCHES: Readonly<Record<CraftingBranchId, BranchDefinition>> = {
  trainee_crafter: {
    id: 'trainee_crafter',
    name: 'Trainee Crafter',
    description: 'Primeros objetos de armadura del Destiny Board',
    tierLabel: 'T2',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  journeyman_warrior_forge: {
    id: 'journeyman_warrior_forge',
    name: "Journeyman Warrior's Forge Crafter",
    description: 'Armaduras de placas de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  journeyman_hunter_lodge: {
    id: 'journeyman_hunter_lodge',
    name: "Journeyman Hunter's Lodge Crafter",
    description: 'Armaduras de cuero de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  journeyman_mage_tower: {
    id: 'journeyman_mage_tower',
    name: "Journeyman Mage's Tower Crafter",
    description: 'Armaduras de tela de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  plate_head: {
    id: 'plate_head',
    name: 'Plate Helmet Crafter',
    description: 'Cascos de placas y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'warrior_forge',
  },
  plate_armor: {
    id: 'plate_armor',
    name: 'Plate Armor Crafter',
    description: 'Armaduras de placas y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'warrior_forge',
  },
  plate_shoes: {
    id: 'plate_shoes',
    name: 'Plate Boots Crafter',
    description: 'Botas de placas y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'warrior_forge',
  },
  leather_head: {
    id: 'leather_head',
    name: 'Leather Hood Crafter',
    description: 'Capuchas de cuero y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'hunter_lodge',
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Jacket Crafter',
    description: 'Chaquetas de cuero y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'hunter_lodge',
  },
  leather_shoes: {
    id: 'leather_shoes',
    name: 'Leather Shoes Crafter',
    description: 'Zapatos de cuero y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'hunter_lodge',
  },
  cloth_head: {
    id: 'cloth_head',
    name: 'Cloth Cowl Crafter',
    description: 'Capuchas de tela y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'mage_tower',
  },
  cloth_armor: {
    id: 'cloth_armor',
    name: 'Cloth Robe Crafter',
    description: 'Túnicas de tela y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'mage_tower',
  },
  cloth_shoes: {
    id: 'cloth_shoes',
    name: 'Cloth Sandals Crafter',
    description: 'Sandalias de tela y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'mage_tower',
  },
}

const WEAPON_FAMILIES = {
  sword: new Set([
    'MAIN_SWORD',
    '2H_CLAYMORE',
    '2H_DUALSWORD',
    'MAIN_SCIMITAR_MORGANA',
    '2H_CLEAVER_HELL',
    '2H_DUALSCIMITAR_UNDEAD',
    '2H_CLAYMORE_AVALON',
    'MAIN_SWORD_CRYSTAL',
  ]),
  axe: new Set([
    'MAIN_AXE',
    '2H_AXE',
    '2H_HALBERD',
    '2H_HALBERD_MORGANA',
    '2H_SCYTHE_HELL',
    '2H_DUALAXE_KEEPER',
    '2H_AXE_AVALON',
    '2H_SCYTHE_CRYSTAL',
  ]),
  mace: new Set([
    'MAIN_MACE',
    '2H_MACE',
    '2H_FLAIL',
    'MAIN_MACE_HELL',
    '2H_MACE_MORGANA',
    'MAIN_ROCKMACE_KEEPER',
    '2H_DUALMACE_AVALON',
    'MAIN_MACE_CRYSTAL',
  ]),
  hammer: new Set([
    'MAIN_HAMMER',
    '2H_HAMMER',
    '2H_POLEHAMMER',
    '2H_HAMMER_UNDEAD',
    '2H_DUALHAMMER_HELL',
    '2H_RAM_KEEPER',
    '2H_HAMMER_AVALON',
    '2H_HAMMER_CRYSTAL',
  ]),
  crossbow: new Set([
    '2H_CROSSBOW',
    '2H_CROSSBOWLARGE',
    'MAIN_1HCROSSBOW',
    '2H_REPEATINGCROSSBOW_UNDEAD',
    '2H_DUALCROSSBOW_HELL',
    '2H_CROSSBOWLARGE_MORGANA',
    '2H_CROSSBOW_CANNON_AVALON',
    '2H_DUALCROSSBOW_CRYSTAL',
  ]),
  brawling: new Set([
    '2H_KNUCKLES_SET1',
    '2H_KNUCKLES_SET2',
    '2H_KNUCKLES_SET3',
    '2H_IRONGAUNTLETS_HELL',
    '2H_KNUCKLES_HELL',
    '2H_KNUCKLES_KEEPER',
    '2H_KNUCKLES_MORGANA',
    '2H_KNUCKLES_AVALON',
    '2H_KNUCKLES_CRYSTAL',
  ]),
  bow: new Set([
    '2H_BOW',
    '2H_WARBOW',
    '2H_LONGBOW',
    '2H_LONGBOW_UNDEAD',
    '2H_BOW_HELL',
    '2H_BOW_KEEPER',
    '2H_BOW_AVALON',
    '2H_BOW_CRYSTAL',
  ]),
  spear: new Set([
    'MAIN_SPEAR',
    '2H_SPEAR',
    '2H_GLAIVE',
    '2H_TRIDENT_UNDEAD',
    'MAIN_SPEAR_KEEPER',
    '2H_HARPOON_HELL',
    'MAIN_SPEAR_LANCE_AVALON',
    '2H_GLAIVE_CRYSTAL',
  ]),
  nature: new Set([
    'MAIN_NATURESTAFF',
    '2H_NATURESTAFF',
    '2H_WILDSTAFF',
    'MAIN_NATURESTAFF_KEEPER',
    '2H_NATURESTAFF_KEEPER',
    '2H_NATURESTAFF_HELL',
    'MAIN_NATURESTAFF_AVALON',
    'MAIN_NATURESTAFF_CRYSTAL',
  ]),
  dagger: new Set([
    'MAIN_DAGGER',
    '2H_DAGGERPAIR',
    '2H_CLAWPAIR',
    'MAIN_DAGGER_HELL',
    'MAIN_RAPIER_MORGANA',
    '2H_DUALSICKLE_UNDEAD',
    '2H_DAGGER_KATAR_AVALON',
    '2H_DAGGERPAIR_CRYSTAL',
  ]),
  quarterstaff: new Set([
    '2H_QUARTERSTAFF',
    '2H_IRONCLADEDSTAFF',
    '2H_DOUBLEBLADEDSTAFF',
    '2H_COMBATSTAFF_MORGANA',
    '2H_TWINSCYTHE_HELL',
    '2H_ROCKSTAFF_KEEPER',
    '2H_QUARTERSTAFF_AVALON',
    '2H_DOUBLEBLADEDSTAFF_CRYSTAL',
  ]),
  fire: new Set([
    'MAIN_FIRESTAFF',
    '2H_FIRESTAFF',
    '2H_INFERNOSTAFF',
    '2H_INFERNOSTAFF_MORGANA',
    '2H_FIRESTAFF_HELL',
    'MAIN_FIRESTAFF_KEEPER',
    '2H_FIRE_RINGPAIR_AVALON',
    'MAIN_FIRESTAFF_CRYSTAL',
  ]),
  holy: new Set([
    'MAIN_HOLYSTAFF',
    '2H_HOLYSTAFF',
    '2H_DIVINESTAFF',
    'MAIN_HOLYSTAFF_MORGANA',
    '2H_HOLYSTAFF_HELL',
    '2H_HOLYSTAFF_UNDEAD',
    'MAIN_HOLYSTAFF_AVALON',
    '2H_HOLYSTAFF_CRYSTAL',
  ]),
  arcane: new Set([
    'MAIN_ARCANESTAFF',
    '2H_ARCANESTAFF',
    '2H_ENIGMATICSTAFF',
    'MAIN_ARCANESTAFF_UNDEAD',
    '2H_ENIGMATICORB_MORGANA',
    '2H_ARCANESTAFF_HELL',
    '2H_ARCANE_RINGPAIR_AVALON',
    '2H_ARCANESTAFF_CRYSTAL',
  ]),
  frost: new Set([
    'MAIN_FROSTSTAFF',
    '2H_FROSTSTAFF',
    '2H_GLACIALSTAFF',
    '2H_ICECRYSTAL_UNDEAD',
    '2H_ICEGAUNTLETS_HELL',
    'MAIN_FROSTSTAFF_KEEPER',
    'MAIN_FROSTSTAFF_AVALON',
    '2H_FROSTSTAFF_CRYSTAL',
  ]),
  cursed: new Set([
    'MAIN_CURSEDSTAFF',
    '2H_CURSEDSTAFF',
    '2H_DEMONICSTAFF',
    'MAIN_CURSEDSTAFF_UNDEAD',
    '2H_SKULLORB_HELL',
    '2H_CURSEDSTAFF_MORGANA',
    'MAIN_CURSEDSTAFF_AVALON',
    'MAIN_CURSEDSTAFF_CRYSTAL',
  ]),
} as const

const WEAPON_LINE_STATION: Readonly<Record<keyof typeof WEAPON_FAMILIES, CraftingStationGroup>> = {
  sword: 'warrior_forge',
  axe: 'warrior_forge',
  mace: 'warrior_forge',
  hammer: 'warrior_forge',
  crossbow: 'warrior_forge',
  brawling: 'warrior_forge',
  bow: 'hunter_lodge',
  spear: 'hunter_lodge',
  nature: 'hunter_lodge',
  dagger: 'hunter_lodge',
  quarterstaff: 'hunter_lodge',
  fire: 'mage_tower',
  holy: 'mage_tower',
  arcane: 'mage_tower',
  frost: 'mage_tower',
  cursed: 'mage_tower',
}

const WEAPON_BRANCH_ORDER: readonly CraftingBranchId[] = [
  'weapon_trainee_crafter',
  'weapon_journeyman_warrior_forge',
  'weapon_journeyman_hunter_lodge',
  'weapon_journeyman_mage_tower',
  'weapon_sword',
  'weapon_axe',
  'weapon_mace',
  'weapon_hammer',
  'weapon_crossbow',
  'weapon_brawling',
  'weapon_bow',
  'weapon_spear',
  'weapon_nature',
  'weapon_dagger',
  'weapon_quarterstaff',
  'weapon_fire',
  'weapon_holy',
  'weapon_arcane',
  'weapon_frost',
  'weapon_cursed',
]

function createWeaponBranch(
  line: keyof typeof WEAPON_FAMILIES,
  name: string,
  description: string,
): BranchDefinition {
  return {
    id: `weapon_${line}`,
    name,
    description,
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: WEAPON_LINE_STATION[line],
    familyIds: WEAPON_FAMILIES[line],
  }
}

const WEAPON_BRANCHES: Readonly<Record<CraftingBranchId, BranchDefinition>> = {
  weapon_trainee_crafter: {
    id: 'weapon_trainee_crafter',
    name: 'Trainee Crafter',
    description: 'Armas iniciales para comenzar el Destiny Board',
    tierLabel: 'T2',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  weapon_journeyman_warrior_forge: {
    id: 'weapon_journeyman_warrior_forge',
    name: "Journeyman Warrior's Forge Crafter",
    description: 'Armas de guerrero de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  weapon_journeyman_hunter_lodge: {
    id: 'weapon_journeyman_hunter_lodge',
    name: "Journeyman Hunter's Lodge Crafter",
    description: 'Armas de cazador de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  weapon_journeyman_mage_tower: {
    id: 'weapon_journeyman_mage_tower',
    name: "Journeyman Mage's Tower Crafter",
    description: 'Armas mágicas de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  weapon_sword: createWeaponBranch('sword', 'Sword Crafter', 'Espadas y sus variantes'),
  weapon_axe: createWeaponBranch('axe', 'Axe Crafter', 'Hachas y sus variantes'),
  weapon_mace: createWeaponBranch('mace', 'Mace Crafter', 'Mazas y sus variantes'),
  weapon_hammer: createWeaponBranch('hammer', 'Hammer Crafter', 'Martillos y sus variantes'),
  weapon_crossbow: createWeaponBranch(
    'crossbow',
    'Crossbow Crafter',
    'Ballestas y sus variantes',
  ),
  weapon_brawling: createWeaponBranch(
    'brawling',
    'War Gloves Crafter',
    'Guantes de guerra y sus variantes',
  ),
  weapon_bow: createWeaponBranch('bow', 'Bow Crafter', 'Arcos y sus variantes'),
  weapon_spear: createWeaponBranch('spear', 'Spear Crafter', 'Lanzas y sus variantes'),
  weapon_nature: createWeaponBranch(
    'nature',
    'Nature Staff Crafter',
    'Bastones naturales y sus variantes',
  ),
  weapon_dagger: createWeaponBranch('dagger', 'Dagger Crafter', 'Dagas y sus variantes'),
  weapon_quarterstaff: createWeaponBranch(
    'quarterstaff',
    'Quarterstaff Crafter',
    'Bastones de combate y sus variantes',
  ),
  weapon_fire: createWeaponBranch(
    'fire',
    'Fire Staff Crafter',
    'Bastones ígneos y sus variantes',
  ),
  weapon_holy: createWeaponBranch(
    'holy',
    'Holy Staff Crafter',
    'Bastones sagrados y sus variantes',
  ),
  weapon_arcane: createWeaponBranch(
    'arcane',
    'Arcane Staff Crafter',
    'Bastones arcanos y sus variantes',
  ),
  weapon_frost: createWeaponBranch(
    'frost',
    'Frost Staff Crafter',
    'Bastones de hielo y sus variantes',
  ),
  weapon_cursed: createWeaponBranch(
    'cursed',
    'Cursed Staff Crafter',
    'Bastones malditos y sus variantes',
  ),
}

const OFFHAND_FAMILIES = {
  shield: new Set([
    'OFF_SHIELD',
    'OFF_TOWERSHIELD_UNDEAD',
    'OFF_SHIELD_HELL',
    'OFF_SPIKEDSHIELD_MORGANA',
    'OFF_SHIELD_AVALON',
    'OFF_SHIELD_CRYSTAL',
  ]),
  tome: new Set([
    'OFF_BOOK',
    'OFF_ORB_MORGANA',
    'OFF_DEMONSKULL_HELL',
    'OFF_TOTEM_KEEPER',
    'OFF_CENSER_AVALON',
    'OFF_TOME_CRYSTAL',
  ]),
  torch: new Set([
    'OFF_TORCH',
    'OFF_HORN_KEEPER',
    'OFF_JESTERCANE_HELL',
    'OFF_LAMP_UNDEAD',
    'OFF_TALISMAN_AVALON',
    'OFF_TORCH_CRYSTAL',
  ]),
} as const

const OFFHAND_BRANCH_ORDER: readonly CraftingBranchId[] = [
  'offhand_trainee_toolmaker',
  'offhand_journeyman_toolmaker',
  'offhand_shield',
  'offhand_tome',
  'offhand_torch',
]

const OFFHAND_BRANCHES: Readonly<Record<CraftingBranchId, BranchDefinition>> = {
  offhand_trainee_toolmaker: {
    id: 'offhand_trainee_toolmaker',
    name: 'Trainee Toolmaker',
    description: 'Primeros objetos de mano secundaria',
    tierLabel: 'T2',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  offhand_journeyman_toolmaker: {
    id: 'offhand_journeyman_toolmaker',
    name: 'Journeyman Toolmaker',
    description: 'Offhands de nivel inicial',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  offhand_shield: {
    id: 'offhand_shield',
    name: 'Shield Crafter',
    description: 'Escudos defensivos y sus variantes',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'toolmaker',
    familyIds: OFFHAND_FAMILIES.shield,
  },
  offhand_tome: {
    id: 'offhand_tome',
    name: 'Tome Crafter',
    description: 'Libros, tótems y focos mágicos',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'toolmaker',
    familyIds: OFFHAND_FAMILIES.tome,
  },
  offhand_torch: {
    id: 'offhand_torch',
    name: 'Torch Crafter',
    description: 'Antorchas y apoyos utilitarios',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'toolmaker',
    familyIds: OFFHAND_FAMILIES.torch,
  },
}

const ACCESSORY_FAMILIES = {
  bag: new Set(['BAG', 'BAG_INSIGHT']),
  cape: new Set(['CAPE']),
  cityCape: new Set([
    'CAPEITEM_FW_BRIDGEWATCH',
    'CAPEITEM_FW_FORTSTERLING',
    'CAPEITEM_FW_LYMHURST',
    'CAPEITEM_FW_MARTLOCK',
    'CAPEITEM_FW_THETFORD',
    'CAPEITEM_FW_CAERLEON',
    'CAPEITEM_FW_BRECILIEN',
  ]),
  specialCape: new Set([
    'CAPEITEM_AVALON',
    'CAPEITEM_DEMON',
    'CAPEITEM_HERETIC',
    'CAPEITEM_KEEPER',
    'CAPEITEM_MORGANA',
    'CAPEITEM_UNDEAD',
    'CAPEITEM_SMUGGLER',
  ]),
  capeInsignia: new Set([
    'CAPEITEM_DEMON_BP',
    'CAPEITEM_HERETIC_BP',
    'CAPEITEM_KEEPER_BP',
    'CAPEITEM_MORGANA_BP',
    'CAPEITEM_UNDEAD_BP',
  ]),
  decorativeCape: new Set([
    'CAPE_CLOTH_KEEPER',
    'CAPE_CLOTH_MORGANA',
    'CAPE_CLOTH_UNDEAD',
    'CAPE_LEATHER_KEEPER',
    'CAPE_LEATHER_MORGANA',
    'CAPE_LEATHER_UNDEAD',
    'CAPE_PLATE_KEEPER',
    'CAPE_PLATE_MORGANA',
    'CAPE_PLATE_UNDEAD',
  ]),
} as const

const ACCESSORY_BRANCH_ORDER: readonly CraftingBranchId[] = [
  'accessory_trainee_crafter',
  'accessory_journeyman_crafter',
  'accessory_bag',
  'accessory_cape',
  'accessory_city_cape',
  'accessory_special_cape',
  'accessory_cape_insignia',
  'accessory_decorative_cape',
]

const ACCESSORY_BRANCHES: Readonly<Record<CraftingBranchId, BranchDefinition>> = {
  accessory_trainee_crafter: {
    id: 'accessory_trainee_crafter',
    name: 'Trainee Accessory Crafter',
    description: 'Bolsas y capas de nivel inicial',
    tierLabel: 'T2',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  accessory_journeyman_crafter: {
    id: 'accessory_journeyman_crafter',
    name: 'Journeyman Accessory Crafter',
    description: 'Accesorios básicos del obrero',
    tierLabel: 'T3',
    kind: 'introduction',
    stationGroup: 'starter',
  },
  accessory_bag: {
    id: 'accessory_bag',
    name: 'Bag Crafter',
    description: 'Bolsas normales y bolsas de visión',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'magic_wardrobe',
    familyIds: ACCESSORY_FAMILIES.bag,
  },
  accessory_cape: {
    id: 'accessory_cape',
    name: 'Cape Crafter',
    description: 'Capas estándar de cada tier',
    tierLabel: 'T4–T8',
    kind: 'specialization',
    stationGroup: 'magic_wardrobe',
    familyIds: ACCESSORY_FAMILIES.cape,
  },
  accessory_city_cape: {
    id: 'accessory_city_cape',
    name: 'City Cape Crafter',
    description: 'Capas de ciudades y facciones reales',
    tierLabel: 'T4–T8',
    kind: 'collection',
    stationGroup: 'magic_wardrobe',
    familyIds: ACCESSORY_FAMILIES.cityCape,
  },
  accessory_special_cape: {
    id: 'accessory_special_cape',
    name: 'Special Cape Crafter',
    description: 'Capas especiales, de artefacto y de contrabandista',
    tierLabel: 'T4–T8',
    kind: 'collection',
    stationGroup: 'magic_wardrobe',
    familyIds: ACCESSORY_FAMILIES.specialCape,
  },
  accessory_cape_insignia: {
    id: 'accessory_cape_insignia',
    name: 'Cape Insignias',
    description: 'Componentes usados para fabricar capas especiales',
    tierLabel: 'T4–T8',
    kind: 'collection',
    stationGroup: 'magic_wardrobe',
    familyIds: ACCESSORY_FAMILIES.capeInsignia,
  },
  accessory_decorative_cape: {
    id: 'accessory_decorative_cape',
    name: 'Decorative Capes',
    description: 'Capas decorativas especiales disponibles en T6',
    tierLabel: 'T6',
    kind: 'collection',
    stationGroup: 'magic_wardrobe',
    familyIds: ACCESSORY_FAMILIES.decorativeCape,
  },
}

const CATEGORY_DEFINITIONS: Readonly<Record<BranchCategory, BranchCategoryDefinition>> = {
  armor: {
    category: 'armor',
    introText:
      'Abre una rama y elige el tier del objeto. Los cosméticos y objetos especiales siguen disponibles mediante el buscador.',
    emptyMessage: 'No se encontraron ramas de armadura.',
    branchOrder: ARMOR_BRANCH_ORDER,
    branches: ARMOR_BRANCHES,
    sectionOrder: ['starter', 'warrior_forge', 'hunter_lodge', 'mage_tower'],
    sectionCopy: {
      starter: {
        label: 'Inicio de crafteo',
        description: 'Nodos introductorios T2 y T3',
      },
      warrior_forge: {
        label: "Warrior's Forge",
        description: 'Especializaciones de armadura de placas',
      },
      hunter_lodge: {
        label: "Hunter's Lodge",
        description: 'Especializaciones de armadura de cuero',
      },
      mage_tower: {
        label: "Mage's Tower",
        description: 'Especializaciones de armadura de tela',
      },
    },
  },
  weapon: {
    category: 'weapon',
    introText:
      'Explora las líneas de armas del Destiny Board y elige el tier dentro de cada familia. Los artefactos usados como materiales se encuentran mediante el buscador.',
    emptyMessage: 'No se encontraron ramas de armas.',
    branchOrder: WEAPON_BRANCH_ORDER,
    branches: WEAPON_BRANCHES,
    sectionOrder: ['starter', 'warrior_forge', 'hunter_lodge', 'mage_tower'],
    sectionCopy: {
      starter: {
        label: 'Inicio de crafteo',
        description: 'Armas introductorias T2 y T3',
      },
      warrior_forge: {
        label: "Warrior's Forge",
        description: 'Armas de guerrero y combate frontal',
      },
      hunter_lodge: {
        label: "Hunter's Lodge",
        description: 'Armas de cazador, movilidad y alcance',
      },
      mage_tower: {
        label: "Mage's Tower",
        description: 'Líneas de bastones mágicos',
      },
    },
  },
  offhand: {
    category: 'offhand',
    introText:
      'Los offhands se agrupan por su familia principal. Abre Escudos, Libros o Antorchas para comparar todas sus variantes T4–T8.',
    emptyMessage: 'No se encontraron ramas de offhands.',
    branchOrder: OFFHAND_BRANCH_ORDER,
    branches: OFFHAND_BRANCHES,
    sectionOrder: ['starter', 'toolmaker'],
    sectionCopy: {
      starter: {
        label: 'Inicio de offhands',
        description: 'Objetos introductorios T2 y T3',
      },
      toolmaker: {
        label: 'Toolmaker',
        description: 'Especializaciones de mano secundaria',
      },
    },
  },
  accessory: {
    category: 'accessory',
    introText:
      'Explora bolsas, capas y componentes por familia. Los cosméticos únicos continúan disponibles mediante el buscador.',
    emptyMessage: 'No se encontraron ramas de accesorios.',
    branchOrder: ACCESSORY_BRANCH_ORDER,
    branches: ACCESSORY_BRANCHES,
    sectionOrder: ['starter', 'magic_wardrobe'],
    sectionCopy: {
      starter: {
        label: 'Inicio de accesorios',
        description: 'Bolsas y capas introductorias T2 y T3',
      },
      magic_wardrobe: {
        label: 'Accesorios y capas',
        description: 'Familias principales, especiales y decorativas',
      },
    },
  },
}

export function isBranchCategory(category: ItemCategory): category is BranchCategory {
  return (
    category === 'weapon' ||
    category === 'armor' ||
    category === 'offhand' ||
    category === 'accessory'
  )
}

function parseTieredItemId(item: Item): ParsedTieredItemId | null {
  const match = TIERED_ID_PATTERN.exec(item.id)
  if (!match) return null

  const tier = Number(match[1])
  const familyId = match[2]
  if (!Number.isInteger(tier) || !familyId) return null

  return { tier, familyId }
}

function isVisibleCraftingItem(item: Item, parsed: ParsedTieredItemId): boolean {
  if (!item.recipe) return false
  if (item.name === item.id) return false
  if (parsed.familyId.includes('PROTOTYPE')) return false
  return true
}

function getArmorBranchId(parsed: ParsedTieredItemId): CraftingBranchId | null {
  const match = ARMOR_ID_PATTERN.exec(parsed.familyId)
  if (!match) return null

  const slot = match[1]
  const material = match[2]
  if (!slot || !material) return null
  if (parsed.tier < 2 || parsed.tier > 8) return null

  if (parsed.tier === 2) return 'trainee_crafter'

  if (parsed.tier === 3) {
    if (material === 'PLATE') return 'journeyman_warrior_forge'
    if (material === 'LEATHER') return 'journeyman_hunter_lodge'
    return 'journeyman_mage_tower'
  }

  if (material === 'PLATE') {
    if (slot === 'HEAD') return 'plate_head'
    if (slot === 'ARMOR') return 'plate_armor'
    return 'plate_shoes'
  }

  if (material === 'LEATHER') {
    if (slot === 'HEAD') return 'leather_head'
    if (slot === 'ARMOR') return 'leather_armor'
    return 'leather_shoes'
  }

  if (slot === 'HEAD') return 'cloth_head'
  if (slot === 'ARMOR') return 'cloth_armor'
  return 'cloth_shoes'
}

function findWeaponLine(familyId: string): keyof typeof WEAPON_FAMILIES | null {
  for (const [line, familyIds] of Object.entries(WEAPON_FAMILIES)) {
    if (familyIds.has(familyId)) return line as keyof typeof WEAPON_FAMILIES
  }
  return null
}

function getWeaponBranchId(parsed: ParsedTieredItemId): CraftingBranchId | null {
  if (parsed.familyId.startsWith('ARTEFACT_')) return null

  const line = findWeaponLine(parsed.familyId)
  if (!line || parsed.tier < 2 || parsed.tier > 8) return null

  if (parsed.tier === 2) return 'weapon_trainee_crafter'

  if (parsed.tier === 3) {
    const station = WEAPON_LINE_STATION[line]
    if (station === 'warrior_forge') return 'weapon_journeyman_warrior_forge'
    if (station === 'hunter_lodge') return 'weapon_journeyman_hunter_lodge'
    return 'weapon_journeyman_mage_tower'
  }

  return `weapon_${line}`
}

function findFamilyGroup<T extends Readonly<Record<string, ReadonlySet<string>>>>(
  groups: T,
  familyId: string,
): keyof T | null {
  for (const [group, familyIds] of Object.entries(groups)) {
    if (familyIds.has(familyId)) return group as keyof T
  }
  return null
}

function getOffhandBranchId(parsed: ParsedTieredItemId): CraftingBranchId | null {
  const line = findFamilyGroup(OFFHAND_FAMILIES, parsed.familyId)
  if (!line || parsed.tier < 2 || parsed.tier > 8) return null

  if (parsed.tier === 2) return 'offhand_trainee_toolmaker'
  if (parsed.tier === 3) return 'offhand_journeyman_toolmaker'
  return `offhand_${String(line)}`
}

function getAccessoryBranchId(parsed: ParsedTieredItemId): CraftingBranchId | null {
  const line = findFamilyGroup(ACCESSORY_FAMILIES, parsed.familyId)
  if (!line || parsed.tier < 2 || parsed.tier > 8) return null

  if ((parsed.familyId === 'BAG' || parsed.familyId === 'CAPE') && parsed.tier === 2) {
    return 'accessory_trainee_crafter'
  }

  if ((parsed.familyId === 'BAG' || parsed.familyId === 'CAPE') && parsed.tier === 3) {
    return 'accessory_journeyman_crafter'
  }

  const branchByLine: Readonly<Record<keyof typeof ACCESSORY_FAMILIES, CraftingBranchId>> = {
    bag: 'accessory_bag',
    cape: 'accessory_cape',
    cityCape: 'accessory_city_cape',
    specialCape: 'accessory_special_cape',
    capeInsignia: 'accessory_cape_insignia',
    decorativeCape: 'accessory_decorative_cape',
  }

  return branchByLine[line]
}

function getBranchId(category: BranchCategory, parsed: ParsedTieredItemId): CraftingBranchId | null {
  if (category === 'armor') return getArmorBranchId(parsed)
  if (category === 'weapon') return getWeaponBranchId(parsed)
  if (category === 'offhand') return getOffhandBranchId(parsed)
  return getAccessoryBranchId(parsed)
}

function getFamilyName(items: readonly Item[]): string {
  const representative =
    items.find((item) => item.tier === 4) ??
    items.find((item) => item.tier === 2) ??
    items[0]

  return representative ? representative.name.replace(TIER_NAME_SUFFIX, '') : 'Familia sin nombre'
}

function getFamilySuffix(familyId: string): string {
  const parts = familyId.split('_')
  return parts.at(-1) ?? familyId
}

function getFamilyOrder(suffix: string): number {
  return FAMILY_SUFFIX_ORDER[suffix] ?? 100
}

function buildFamilies(entries: readonly CategorizedEntry[]): readonly ItemFamily[] {
  const grouped = new Map<string, Item[]>()

  for (const entry of entries) {
    const current = grouped.get(entry.parsed.familyId)
    if (current) current.push(entry.item)
    else grouped.set(entry.parsed.familyId, [entry.item])
  }

  return Array.from(grouped.entries())
    .map(([id, familyItems]): ItemFamily => {
      const sortedItems = [...familyItems].sort((left, right) => left.tier - right.tier)
      const representativeItem =
        sortedItems.find((item) => item.tier === 4) ??
        sortedItems.find((item) => item.tier === 2) ??
        sortedItems[0]

      if (!representativeItem) throw new Error(`La familia ${id} no contiene ítems`)

      return {
        id,
        name: getFamilyName(sortedItems),
        suffix: getFamilySuffix(id),
        representativeItem,
        items: sortedItems,
      }
    })
    .sort((left, right) => {
      const orderDifference = getFamilyOrder(left.suffix) - getFamilyOrder(right.suffix)
      if (orderDifference !== 0) return orderDifference
      return left.name.localeCompare(right.name, 'es-CL')
    })
}

function collectEntries(category: BranchCategory, items: readonly Item[]): readonly CategorizedEntry[] {
  const entries: CategorizedEntry[] = []

  for (const item of items) {
    const parsed = parseTieredItemId(item)
    if (!parsed || !isVisibleCraftingItem(item, parsed)) continue

    const branchId = getBranchId(category, parsed)
    if (!branchId) continue

    entries.push({ item, parsed, branchId })
  }

  return entries
}

export function buildCategoryCraftingCatalog(
  category: BranchCategory,
  items: readonly Item[],
): CraftingBranchCatalog {
  const definition = CATEGORY_DEFINITIONS[category]
  const entries = collectEntries(category, items)
  const entriesByBranch = new Map<CraftingBranchId, CategorizedEntry[]>()

  for (const entry of entries) {
    const current = entriesByBranch.get(entry.branchId)
    if (current) current.push(entry)
    else entriesByBranch.set(entry.branchId, [entry])
  }

  const branches = definition.branchOrder.flatMap((branchId) => {
    const branchEntries = entriesByBranch.get(branchId)
    const metadata = definition.branches[branchId]
    if (!branchEntries || branchEntries.length === 0 || !metadata) return []

    return [
      {
        ...metadata,
        families: buildFamilies(branchEntries),
        itemCount: branchEntries.length,
      },
    ]
  })

  const sections = definition.sectionOrder.flatMap((stationGroup) => {
    const sectionBranches = branches.filter((branch) => branch.stationGroup === stationGroup)
    const copy = definition.sectionCopy[stationGroup]
    if (sectionBranches.length === 0 || !copy) return []

    return [
      {
        id: stationGroup,
        label: copy.label,
        description: copy.description,
        branches: sectionBranches,
      },
    ]
  })

  return {
    category,
    introText: definition.introText,
    emptyMessage: definition.emptyMessage,
    sections,
    branches,
    itemCount: entries.length,
  }
}

export function buildCategorySearchFamilies(
  category: BranchCategory,
  items: readonly Item[],
): readonly ItemFamily[] {
  return buildFamilies(collectEntries(category, items))
}

export function isGroupedCraftingItem(category: BranchCategory, item: Item): boolean {
  const parsed = parseTieredItemId(item)
  return parsed !== null && isVisibleCraftingItem(item, parsed) && getBranchId(category, parsed) !== null
}

// Compatibilidad con los nombres usados por las pruebas y componentes previos.
export function buildArmorCraftingBranches(items: readonly Item[]): readonly CraftingBranch[] {
  return buildCategoryCraftingCatalog('armor', items).branches
}

export function buildArmorSearchFamilies(items: readonly Item[]): readonly ItemFamily[] {
  return buildCategorySearchFamilies('armor', items)
}

export function isGroupedDestinyBoardArmor(item: Item): boolean {
  return isGroupedCraftingItem('armor', item)
}

/**
 * Devuelve la categoría de especialidad de crafteo usada por los bonos
 * locales de ciudad. Reutiliza las mismas familias curadas que alimentan
 * la navegación del Destiny Board, incluyendo variantes de artefacto,
 * avalonianas y de cristal.
 */
export function getCraftingSpecialtyCategory(
  item: Item,
): CraftingSpecialtyCategory | null {
  const parsed = parseTieredItemId(item)
  if (!parsed) return null

  if (item.category === 'weapon') {
    if (
      !parsed.familyId.startsWith('ARTEFACT_') &&
      parsed.familyId.includes('SHAPESHIFTER')
    ) {
      return 'shapeshifter_staff'
    }

    const line = findWeaponLine(parsed.familyId)

    const categoryByLine: Readonly<
      Record<keyof typeof WEAPON_FAMILIES, CraftingSpecialtyCategory>
    > = {
      sword: 'sword',
      axe: 'axe',
      mace: 'mace',
      hammer: 'hammer',
      crossbow: 'crossbow',
      brawling: 'war_gloves',
      bow: 'bow',
      spear: 'spear',
      nature: 'nature_staff',
      dagger: 'dagger',
      quarterstaff: 'quarterstaff',
      fire: 'fire_staff',
      holy: 'holy_staff',
      arcane: 'arcane_staff',
      frost: 'frost_staff',
      cursed: 'cursed_staff',
    }

    return line ? categoryByLine[line] : null
  }

  if (item.category === 'armor') {
    const match = ARMOR_ID_PATTERN.exec(parsed.familyId)
    if (!match) return null

    const slot = match[1]
    const material = match[2]
    if (!slot || !material) return null

    const slotName =
      slot === 'HEAD' ? 'helmet' : slot === 'ARMOR' ? 'armor' : 'shoes'
    const materialName = material.toLowerCase()

    return `${materialName}_${slotName}` as CraftingSpecialtyCategory
  }

  if (item.category === 'offhand') return 'offhand'

  return null
}
