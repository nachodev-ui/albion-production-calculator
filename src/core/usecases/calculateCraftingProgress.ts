import type { Item } from '@core/domain/entities/Item'
import type { CraftingStation } from '@core/domain/entities/Recipe'
import type { CraftingFameBreakdown } from '@core/usecases/calculateCraftingFame'

export const STUDY_FAME_MULTIPLIER = 2.75
export const PREMIUM_FAME_MULTIPLIER = 1.5

export const CRAFTING_JOURNAL_CAPACITY_BY_TIER: Readonly<Record<number, number>> = {
  2: 900,
  3: 1800,
  4: 3600,
  5: 7200,
  6: 14400,
  7: 28800,
  8: 57600,
}

/**
 * Curva de especialización para un nodo cuya primera mejora cuesta 14.424.
 * Cada posición representa la fama necesaria para pasar del nivel N a N + 1.
 */
export const BASE_CRAFTING_SPECIALIZATION_FAME_CURVE: readonly number[] = [
  14424, 14934, 15464, 16014, 16582, 17170, 17780, 18410, 19064, 19740,
  20440, 21166, 21918, 22694, 23500, 24334, 25198, 26092, 27018, 27976,
  28970, 29996, 31062, 32164, 33304, 34486, 35710, 36978, 38290, 39648,
  41056, 42512, 44020, 45582, 47200, 48876, 50610, 52406, 54266, 56190,
  58184, 60250, 62388, 64602, 66894, 69268, 71726, 74270, 76906, 79634,
  82460, 85386, 88416, 91554, 94804, 98168, 101650, 105258, 108992,
  112860, 116866, 121012, 125306, 129752, 134356, 139124, 144062,
  149174, 154466, 159948, 165624, 171500, 177586, 183888, 190414,
  197170, 204166, 211412, 218914, 226682, 234726, 243054, 251680,
  260610, 269858, 279434, 289350, 299618, 310250, 321258, 332658,
  344462, 356686, 369342, 382448, 396020, 410072, 424624, 439692,
  455294,
]

const BASE_SPECIALIZATION_FIRST_LEVEL_FAME =
  BASE_CRAFTING_SPECIALIZATION_FAME_CURVE[0] ?? 14424

export type CraftingJournalKind =
  | 'blacksmith'
  | 'fletcher'
  | 'imbuer'
  | 'tinker'

export interface CraftingJournalProfile {
  readonly kind: CraftingJournalKind
  readonly name: string
  readonly tier: number
  readonly capacity: number
  /** Identificador oficial de la variante vacía usada para el icono. */
  readonly emptyItemId: string
}

const CRAFTING_JOURNAL_METADATA: Readonly<
  Record<
    CraftingJournalKind,
    { readonly name: string; readonly itemIdSegment: string }
  >
> = {
  blacksmith: {
    name: 'Diario de herrero',
    itemIdSegment: 'WARRIOR',
  },
  fletcher: {
    name: 'Diario de flechero',
    itemIdSegment: 'HUNTER',
  },
  imbuer: {
    name: 'Diario de imbuídor',
    itemIdSegment: 'MAGE',
  },
  tinker: {
    name: 'Diario de manitas',
    itemIdSegment: 'TOOLMAKER',
  },
}

export const CRAFTING_JOURNAL_KINDS: readonly CraftingJournalKind[] = [
  'blacksmith',
  'fletcher',
  'imbuer',
  'tinker',
]

export interface StudyFameBreakdown {
  readonly itemsStudied: number
  readonly famePerStudiedItemBeforePremium: number
  readonly baseStudyFame: number
  readonly premiumStudyBonus: number
  readonly totalStudyFame: number
  readonly combinedCraftAndStudyFame: number
}

export interface JournalProgressBreakdown {
  readonly profile: CraftingJournalProfile
  readonly initialFame: number
  readonly gainedFame: number
  readonly completedJournals: number
  readonly remainingFame: number
  readonly nextJournalProgressRate: number
}

export interface SpecializationCurveProfile {
  readonly firstLevelFame: number
  readonly multiplier: number
  readonly label: string
  readonly isDetected: boolean
}

export interface SpecializationProjection {
  readonly firstLevelFame: number
  readonly currentLevel: number
  readonly currentLevelRequirement: number
  readonly currentLevelProgressFame: number
  readonly currentTotalFame: number
  readonly gainedFame: number
  readonly projectedTotalFame: number
  readonly projectedLevel: number
  readonly projectedLevelRequirement: number
  readonly projectedLevelProgressFame: number
  readonly projectedLevelProgressRate: number
  readonly targetLevel: number
  readonly fameToTargetBefore: number
  readonly fameToTargetAfter: number
  readonly equivalentBatchesToTarget: number | null
  readonly totalFameToLevel100: number
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.floor(value)))
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, value))
}

function hasAnyPattern(itemId: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => itemId.includes(pattern))
}

/**
 * El dataset histórico no siempre distingue bien la estación de algunas
 * armas mágicas. Por eso se priorizan familias del ID y se usa la estación
 * como respaldo.
 */
export function inferCraftingJournalKind(
  item: Item,
  station: CraftingStation,
): CraftingJournalKind | null {
  if (item.tier < 2 || item.tier > 8) return null

  const itemId = String(item.id)

  if (
    hasAnyPattern(itemId, [
      '_ARMOR_PLATE',
      '_HEAD_PLATE',
      '_SHOES_PLATE',
      '_SWORD',
      '_AXE',
      '_MACE',
      '_HAMMER',
      '_DAGGER',
      '_SPEAR',
      '_CROSSBOW',
    ])
  ) {
    return 'blacksmith'
  }

  if (
    hasAnyPattern(itemId, [
      '_ARMOR_LEATHER',
      '_HEAD_LEATHER',
      '_SHOES_LEATHER',
      '_BOW',
      '_QUARTERSTAFF',
      '_KNUCKLES',
    ])
  ) {
    return 'fletcher'
  }

  if (
    hasAnyPattern(itemId, [
      '_ARMOR_CLOTH',
      '_HEAD_CLOTH',
      '_SHOES_CLOTH',
      '_FIRESTAFF',
      '_FROSTSTAFF',
      '_ARCANESTAFF',
      '_HOLYSTAFF',
      '_NATURESTAFF',
      '_CURSEDSTAFF',
      '_INFERNOSTAFF',
      '_GLACIALSTAFF',
      '_DIVINESTAFF',
      '_WILDSTAFF',
      '_ENIGMATICSTAFF',
      '_ICEGAUNTLETS',
      '_ICECRYSTAL',
      '_FIRE_RINGPAIR',
      '_ARCANE_RINGPAIR',
    ])
  ) {
    return 'imbuer'
  }

  const fallbackByStation: Partial<
    Readonly<Record<CraftingStation, CraftingJournalKind>>
  > = {
    warrior_forge: 'blacksmith',
    hunter_lodge: 'fletcher',
    mage_tower: 'imbuer',
    toolmaker: 'tinker',
  }

  return fallbackByStation[station] ?? null
}

export function getCraftingJournalProfileByKind(
  kind: CraftingJournalKind,
  tier: number,
): CraftingJournalProfile | null {
  const capacity = CRAFTING_JOURNAL_CAPACITY_BY_TIER[tier]
  const metadata = CRAFTING_JOURNAL_METADATA[kind]
  if (!capacity || !metadata) return null

  return {
    kind,
    name: metadata.name,
    tier,
    capacity,
    emptyItemId: `T${tier}_JOURNAL_${metadata.itemIdSegment}_EMPTY`,
  }
}

export function getCraftingJournalProfilesForTier(
  tier: number,
): readonly CraftingJournalProfile[] {
  return CRAFTING_JOURNAL_KINDS.flatMap((kind) => {
    const profile = getCraftingJournalProfileByKind(kind, tier)
    return profile ? [profile] : []
  })
}

export function getCraftingJournalProfile(
  item: Item,
  station: CraftingStation,
): CraftingJournalProfile | null {
  const kind = inferCraftingJournalKind(item, station)
  if (!kind) return null
  return getCraftingJournalProfileByKind(kind, item.tier)
}

export function calculateStudyFame(
  fame: CraftingFameBreakdown,
  requestedItemsStudied: number,
): StudyFameBreakdown {
  const itemsStudied = clampInteger(
    requestedItemsStudied,
    0,
    fame.producedQuantity,
  )
  const famePerStudiedItemBeforePremium =
    fame.famePerFinalItem * STUDY_FAME_MULTIPLIER
  const baseStudyFame = famePerStudiedItemBeforePremium * itemsStudied
  const premiumStudyBonus = fame.isPremium
    ? baseStudyFame * (PREMIUM_FAME_MULTIPLIER - 1)
    : 0
  const totalStudyFame = baseStudyFame + premiumStudyBonus

  return {
    itemsStudied,
    famePerStudiedItemBeforePremium,
    baseStudyFame,
    premiumStudyBonus,
    totalStudyFame,
    combinedCraftAndStudyFame: fame.totalFame + totalStudyFame,
  }
}

export interface CalculateJournalProgressInput {
  readonly item: Item
  readonly station: CraftingStation
  readonly gainedFame: number
  readonly initialFame?: number
  /** Permite corregir manualmente la profesión manteniendo el tier del objeto. */
  readonly profile?: CraftingJournalProfile | null
}

export function calculateJournalProgress({
  item,
  station,
  gainedFame,
  initialFame = 0,
  profile: profileOverride,
}: CalculateJournalProgressInput): JournalProgressBreakdown | null {
  const profile = profileOverride ?? getCraftingJournalProfile(item, station)
  if (!profile || profile.tier !== item.tier) return null

  const normalizedInitialFame = clampNumber(
    initialFame,
    0,
    Math.max(0, profile.capacity - 1),
  )
  const normalizedGainedFame = Math.max(0, gainedFame)
  const accumulatedFame = normalizedInitialFame + normalizedGainedFame
  const completedJournals = Math.floor(accumulatedFame / profile.capacity)
  const remainingFame = accumulatedFame % profile.capacity

  return {
    profile,
    initialFame: normalizedInitialFame,
    gainedFame: normalizedGainedFame,
    completedJournals,
    remainingFame,
    nextJournalProgressRate: remainingFame / profile.capacity,
  }
}

export function inferSpecializationCurve(
  item: Item,
): SpecializationCurveProfile | null {
  if (item.tier < 4) return null

  const itemId = String(item.id)
  let label: string | null = null

  if (item.category === 'weapon') {
    label = 'Especialización individual de arma'
  } else if (item.category === 'armor') {
    label = 'Especialización individual de armadura'
  } else if (item.category === 'offhand') {
    label = 'Especialización individual de mano secundaria'
  } else if (item.category === 'accessory' && itemId.includes('_BAG')) {
    label = itemId.includes('_INSIGHT')
      ? 'Especialización individual de bolsa de visión'
      : 'Especialización individual de bolsa'
  } else if (item.category === 'accessory' && itemId.includes('_CAPE')) {
    label = 'Especialización individual de capa'
  }

  if (!label) return null

  return {
    firstLevelFame: BASE_SPECIALIZATION_FIRST_LEVEL_FAME,
    multiplier: 1,
    label,
    isDetected: true,
  }
}

export function buildSpecializationFameCurve(
  firstLevelFame: number,
): readonly number[] {
  const normalizedFirstLevelFame = Math.max(1, firstLevelFame)
  const multiplier =
    normalizedFirstLevelFame / BASE_SPECIALIZATION_FIRST_LEVEL_FAME

  return BASE_CRAFTING_SPECIALIZATION_FAME_CURVE.map((fame) =>
    Math.round(fame * multiplier),
  )
}

function getTotalFameAtLevel(
  curve: readonly number[],
  level: number,
): number {
  const normalizedLevel = clampInteger(level, 0, curve.length)
  let total = 0

  for (let index = 0; index < normalizedLevel; index += 1) {
    total += curve[index] ?? 0
  }

  return total
}

function resolveLevelFromTotalFame(
  curve: readonly number[],
  totalFame: number,
): {
  readonly level: number
  readonly progressFame: number
  readonly requirement: number
} {
  const normalizedTotalFame = Math.max(0, totalFame)
  let consumedFame = 0

  for (let level = 0; level < curve.length; level += 1) {
    const requirement = curve[level] ?? 0
    if (normalizedTotalFame < consumedFame + requirement) {
      return {
        level,
        progressFame: normalizedTotalFame - consumedFame,
        requirement,
      }
    }
    consumedFame += requirement
  }

  return {
    level: curve.length,
    progressFame: 0,
    requirement: 0,
  }
}

export interface CalculateSpecializationProjectionInput {
  readonly firstLevelFame: number
  readonly currentLevel: number
  readonly currentLevelProgressFame?: number
  readonly targetLevel: number
  readonly gainedFame: number
}

export function calculateSpecializationProjection({
  firstLevelFame,
  currentLevel,
  currentLevelProgressFame = 0,
  targetLevel,
  gainedFame,
}: CalculateSpecializationProjectionInput): SpecializationProjection {
  const curve = buildSpecializationFameCurve(firstLevelFame)
  const normalizedCurrentLevel = clampInteger(currentLevel, 0, 100)
  const normalizedTargetLevel = clampInteger(
    targetLevel,
    normalizedCurrentLevel,
    100,
  )
  const currentLevelRequirement =
    normalizedCurrentLevel < 100 ? (curve[normalizedCurrentLevel] ?? 0) : 0
  const normalizedCurrentProgress = clampNumber(
    currentLevelProgressFame,
    0,
    currentLevelRequirement,
  )
  const currentTotalFame =
    getTotalFameAtLevel(curve, normalizedCurrentLevel) +
    normalizedCurrentProgress
  const normalizedGainedFame = Math.max(0, gainedFame)
  const projectedTotalFame = Math.min(
    getTotalFameAtLevel(curve, 100),
    currentTotalFame + normalizedGainedFame,
  )
  const projected = resolveLevelFromTotalFame(curve, projectedTotalFame)
  const targetTotalFame = getTotalFameAtLevel(curve, normalizedTargetLevel)
  const fameToTargetBefore = Math.max(0, targetTotalFame - currentTotalFame)
  const fameToTargetAfter = Math.max(0, targetTotalFame - projectedTotalFame)

  return {
    firstLevelFame: Math.max(1, firstLevelFame),
    currentLevel: normalizedCurrentLevel,
    currentLevelRequirement,
    currentLevelProgressFame: normalizedCurrentProgress,
    currentTotalFame,
    gainedFame: normalizedGainedFame,
    projectedTotalFame,
    projectedLevel: projected.level,
    projectedLevelRequirement: projected.requirement,
    projectedLevelProgressFame: projected.progressFame,
    projectedLevelProgressRate:
      projected.requirement > 0
        ? projected.progressFame / projected.requirement
        : 1,
    targetLevel: normalizedTargetLevel,
    fameToTargetBefore,
    fameToTargetAfter,
    equivalentBatchesToTarget:
      normalizedGainedFame > 0
        ? Math.ceil(fameToTargetBefore / normalizedGainedFame)
        : null,
    totalFameToLevel100: getTotalFameAtLevel(curve, 100),
  }
}
