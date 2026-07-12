export type HideoutPowerLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type HideoutZoneQuality = 1 | 2 | 3 | 4 | 5 | 6

export interface HideoutPowerProfile {
  readonly level: HideoutPowerLevel
  /** Energía acumulada necesaria para alcanzar el nivel. */
  readonly powerPointsPool: number
  /** Bono general informado por el cliente para este nivel. */
  readonly generalistCraftingBonus: number
  /** Bono especialista que reduce el costo de foco del objeto especializado. */
  readonly specialistCraftingBonus: number
}

export const DEFAULT_HIDEOUT_POWER_LEVEL: HideoutPowerLevel = 1
export const DEFAULT_HIDEOUT_ZONE_QUALITY: HideoutZoneQuality = 1
export const HIDEOUT_ZONE_QUALITIES: readonly HideoutZoneQuality[] = [
  1, 2, 3, 4, 5, 6,
]

/** Perfiles de energía extraídos de `hideouts.xml` del cliente. */
export const HIDEOUT_POWER_PROFILES: readonly HideoutPowerProfile[] = [
  { level: 1, powerPointsPool: 800, generalistCraftingBonus: 0, specialistCraftingBonus: 0 },
  { level: 2, powerPointsPool: 1_650, generalistCraftingBonus: 0.06, specialistCraftingBonus: 0.0375 },
  { level: 3, powerPointsPool: 3_250, generalistCraftingBonus: 0.11, specialistCraftingBonus: 0.075 },
  { level: 4, powerPointsPool: 6_500, generalistCraftingBonus: 0.15, specialistCraftingBonus: 0.1125 },
  { level: 5, powerPointsPool: 11_250, generalistCraftingBonus: 0.18, specialistCraftingBonus: 0.15 },
  { level: 6, powerPointsPool: 18_750, generalistCraftingBonus: 0.2, specialistCraftingBonus: 0.1875 },
  { level: 7, powerPointsPool: 30_000, generalistCraftingBonus: 0.22, specialistCraftingBonus: 0.225 },
  { level: 8, powerPointsPool: 45_000, generalistCraftingBonus: 0.24, specialistCraftingBonus: 0.2625 },
  { level: 9, powerPointsPool: 60_000, generalistCraftingBonus: 0.26, specialistCraftingBonus: 0.3 },
]

/**
 * Resource Return Rate por nivel de energía y calidad de zona. Los valores son
 * fracciones, no porcentajes. La tabla con foco ya incorpora el efecto del foco.
 */
const HIDEOUT_RRR_NO_FOCUS: Readonly<
  Record<HideoutPowerLevel, Readonly<Record<HideoutZoneQuality, number>>>
> = {
  1: { 1: 0.2138, 2: 0.2428, 3: 0.2672, 4: 0.2893, 5: 0.3107, 6: 0.3306 },
  2: { 1: 0.2038, 2: 0.2594, 3: 0.2844, 4: 0.3078, 5: 0.3313, 6: 0.3518 },
  3: { 1: 0.2468, 2: 0.2758, 3: 0.3028, 4: 0.3258, 5: 0.3482, 6: 0.3695 },
  4: { 1: 0.2616, 2: 0.2916, 3: 0.3172, 4: 0.3421, 5: 0.3653, 6: 0.386 },
  5: { 1: 0.2776, 2: 0.3064, 3: 0.3331, 4: 0.3575, 5: 0.3838, 6: 0.4022 },
  6: { 1: 0.2896, 2: 0.3226, 3: 0.3474, 4: 0.3722, 5: 0.3974, 6: 0.4174 },
  7: { 1: 0.3016, 2: 0.3355, 3: 0.3632, 4: 0.3873, 5: 0.4109, 6: 0.4318 },
  8: { 1: 0.3116, 2: 0.3435, 3: 0.3709, 4: 0.3996, 5: 0.4235, 6: 0.4394 },
  9: { 1: 0.3264, 2: 0.3624, 3: 0.3946, 4: 0.4201, 5: 0.4473, 6: 0.4658 },
}

const HIDEOUT_RRR_WITH_FOCUS: Readonly<
  Record<HideoutPowerLevel, Readonly<Record<HideoutZoneQuality, number>>>
> = {
  1: { 1: 0.4378, 2: 0.4509, 3: 0.465, 4: 0.4778, 5: 0.4905, 6: 0.5007 },
  2: { 1: 0.4403, 2: 0.4525, 3: 0.4657, 4: 0.4787, 5: 0.4943, 6: 0.5064 },
  3: { 1: 0.4523, 2: 0.4658, 3: 0.4796, 4: 0.4942, 5: 0.5072, 6: 0.5201 },
  4: { 1: 0.4707, 2: 0.4861, 3: 0.5004, 4: 0.5145, 5: 0.5283, 6: 0.539 },
  5: { 1: 0.4855, 2: 0.5007, 3: 0.5148, 4: 0.5291, 5: 0.5453, 6: 0.5583 },
  6: { 1: 0.4998, 2: 0.5148, 3: 0.5292, 4: 0.5436, 5: 0.5614, 6: 0.5687 },
  7: { 1: 0.5146, 2: 0.5287, 3: 0.5448, 4: 0.5618, 5: 0.5768, 6: 0.5898 },
  8: { 1: 0.5287, 2: 0.5416, 3: 0.5566, 4: 0.5694, 5: 0.5838, 6: 0.5971 },
  9: { 1: 0.5438, 2: 0.5569, 3: 0.5702, 4: 0.5834, 5: 0.5973, 6: 0.6102 },
}

const DEFAULT_HIDEOUT_POWER_PROFILE: HideoutPowerProfile =
  HIDEOUT_POWER_PROFILES[0]!

export function isHideoutPowerLevel(value: unknown): value is HideoutPowerLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9
}

export function isHideoutZoneQuality(value: unknown): value is HideoutZoneQuality {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6
}

export function getHideoutPowerProfile(
  level: HideoutPowerLevel | number | undefined,
): HideoutPowerProfile {
  const normalizedLevel = isHideoutPowerLevel(level)
    ? level
    : DEFAULT_HIDEOUT_POWER_LEVEL
  return HIDEOUT_POWER_PROFILES.find((profile) => profile.level === normalizedLevel) ?? DEFAULT_HIDEOUT_POWER_PROFILE
}

export function getHideoutReturnRate(
  zoneQuality: HideoutZoneQuality | number | undefined,
  powerLevel: HideoutPowerLevel | number | undefined,
  useFocus: boolean,
): number {
  const quality = isHideoutZoneQuality(zoneQuality)
    ? zoneQuality
    : DEFAULT_HIDEOUT_ZONE_QUALITY
  const level = isHideoutPowerLevel(powerLevel)
    ? powerLevel
    : DEFAULT_HIDEOUT_POWER_LEVEL
  return (useFocus ? HIDEOUT_RRR_WITH_FOCUS : HIDEOUT_RRR_NO_FOCUS)[level][quality]
}

export function returnRateToProductionBonus(returnRate: number): number {
  return returnRate > 0 && returnRate < 1 ? returnRate / (1 - returnRate) : 0
}
