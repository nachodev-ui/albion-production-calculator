export type HideoutZoneQuality = 1 | 2 | 3 | 4 | 5 | 6
export type HideoutPowerLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const HIDEOUT_ZONE_QUALITIES: readonly HideoutZoneQuality[] = [
  1, 2, 3, 4, 5, 6,
]

export const HIDEOUT_POWER_LEVELS: readonly HideoutPowerLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
]

/**
 * RRR de Hideout publicado para cada combinación de calidad de zona y nivel
 * de poder. Los valores no incluyen bono diario; la tabla distingue si se usa
 * foco porque Albion aplica una curva distinta al retorno resultante.
 *
 * Índices: [nivel de poder][calidad de zona].
 * Fuente funcional: Albion Online Wiki — Resource Return Rate.
 */
const HIDEOUT_RETURN_RATE_NO_FOCUS: Readonly<
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

const HIDEOUT_RETURN_RATE_WITH_FOCUS: Readonly<
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

export interface HideoutReturnRateParams {
  readonly zoneQuality: HideoutZoneQuality
  readonly powerLevel: HideoutPowerLevel
  readonly useFocus: boolean
  readonly dailyBonus: 0 | 0.1 | 0.2
}

export function getHideoutBaseReturnRate(
  zoneQuality: HideoutZoneQuality,
  powerLevel: HideoutPowerLevel,
  useFocus: boolean,
): number {
  const table = useFocus
    ? HIDEOUT_RETURN_RATE_WITH_FOCUS
    : HIDEOUT_RETURN_RATE_NO_FOCUS
  return table[powerLevel][zoneQuality]
}

/** Convierte RRR a su Production Bonus equivalente. */
export function returnRateToProductionBonus(returnRate: number): number {
  if (!Number.isFinite(returnRate) || returnRate <= 0) return 0
  if (returnRate >= 1) return Number.POSITIVE_INFINITY
  return returnRate / (1 - returnRate)
}

/**
 * Aplica el bono diario sobre el Production Bonus equivalente, respetando la
 * fórmula global RRR = 1 - 1 / (1 + bonus total).
 */
export function calculateHideoutReturnRate(
  params: HideoutReturnRateParams,
): number {
  const baseReturnRate = getHideoutBaseReturnRate(
    params.zoneQuality,
    params.powerLevel,
    params.useFocus,
  )
  const productionBonus =
    returnRateToProductionBonus(baseReturnRate) + params.dailyBonus
  return 1 - 1 / (1 + productionBonus)
}
