export type HideoutPowerLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface HideoutPowerProfile {
  readonly level: HideoutPowerLevel
  /** Energía acumulada necesaria para alcanzar el nivel. */
  readonly powerPointsPool: number
  /** Bono general de producción que participa en el cálculo del RRR. */
  readonly generalistCraftingBonus: number
  /** Bono especialista que reduce el costo de foco del objeto especializado. */
  readonly specialistCraftingBonus: number
}

/** Bono base de producción propio de los Hideouts de zona negra. */
export const HIDEOUT_BASE_PRODUCTION_BONUS = 0.15

export const DEFAULT_HIDEOUT_POWER_LEVEL: HideoutPowerLevel = 1

/**
 * Tabla extraída de `hideouts.xml` del cliente de Albion Online.
 *
 * `generalistcraftingbonus` se suma al bono de producción usado por el RRR.
 * `specialistcraftingbonus` se aplica como eficiencia adicional de foco cuando
 * el Hideout está especializado para el objeto fabricado.
 */
export const HIDEOUT_POWER_PROFILES: readonly HideoutPowerProfile[] = [
  {
    level: 1,
    powerPointsPool: 800,
    generalistCraftingBonus: 0,
    specialistCraftingBonus: 0,
  },
  {
    level: 2,
    powerPointsPool: 1_650,
    generalistCraftingBonus: 0.06,
    specialistCraftingBonus: 0.0375,
  },
  {
    level: 3,
    powerPointsPool: 3_250,
    generalistCraftingBonus: 0.11,
    specialistCraftingBonus: 0.075,
  },
  {
    level: 4,
    powerPointsPool: 6_500,
    generalistCraftingBonus: 0.15,
    specialistCraftingBonus: 0.1125,
  },
  {
    level: 5,
    powerPointsPool: 11_250,
    generalistCraftingBonus: 0.18,
    specialistCraftingBonus: 0.15,
  },
  {
    level: 6,
    powerPointsPool: 18_750,
    generalistCraftingBonus: 0.2,
    specialistCraftingBonus: 0.1875,
  },
  {
    level: 7,
    powerPointsPool: 30_000,
    generalistCraftingBonus: 0.22,
    specialistCraftingBonus: 0.225,
  },
  {
    level: 8,
    powerPointsPool: 45_000,
    generalistCraftingBonus: 0.24,
    specialistCraftingBonus: 0.2625,
  },
  {
    level: 9,
    powerPointsPool: 60_000,
    generalistCraftingBonus: 0.26,
    specialistCraftingBonus: 0.3,
  },
]

export function isHideoutPowerLevel(value: unknown): value is HideoutPowerLevel {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  )
}

export function getHideoutPowerProfile(
  level: HideoutPowerLevel | number | undefined,
): HideoutPowerProfile {
  const normalizedLevel = isHideoutPowerLevel(level)
    ? level
    : DEFAULT_HIDEOUT_POWER_LEVEL

  return (
    HIDEOUT_POWER_PROFILES.find(
      (profile) => profile.level === normalizedLevel,
    ) ?? HIDEOUT_POWER_PROFILES[0]
  )
}
