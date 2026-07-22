import {
  calculateEffectiveFocusCost,
  calculateStationUsageFee,
  type StationFeeConfig,
} from '@core/domain/entities/ProductionEconomy'
import { calculateReturnRateBreakdown } from '@core/domain/entities/ReturnRate'
import {
  calculateProfitBreakdown,
  type ProfitBreakdown,
} from '@features/craft-calculator/utils/profitCalculations'
import type {
  RefiningCityId,
  RefiningRecipeDefinition,
  RefiningResourceDefinition,
} from '../config/refiningGameConfig'

export interface RefiningPrices {
  readonly rawUnitPrice: number
  readonly previousRefinedUnitPrice: number
  readonly outputUnitPrice: number
}

export interface RefiningCalculationInput {
  readonly resource: RefiningResourceDefinition
  readonly recipe: RefiningRecipeDefinition
  readonly city: RefiningCityId
  /** Cantidad mínima de recurso refinado que el usuario quiere producir. */
  readonly requestedOutputQuantity: number
  readonly prices: RefiningPrices
  readonly stationFeeConfig: StationFeeConfig
  readonly focusCostEfficiency: number
  readonly silverPerFocus: number
  readonly isPremium: boolean
}

export interface RefiningScenario {
  readonly useFocus: boolean
  readonly returnRate: number
  readonly productionBonus: number
  readonly returnedRaw: number
  readonly returnedPreviousRefined: number
  readonly netRawConsumed: number
  readonly netPreviousRefinedConsumed: number
  readonly grossMaterialCost: number
  readonly recoveredMaterialValue: number
  readonly stationFee: number
  readonly initialInvestment: number
  readonly effectiveProductionCost: number
  readonly effectiveCostPerUnit: number
  readonly market: ProfitBreakdown
  readonly profit: number
  readonly profitPerUnit: number
  readonly roi: number
  readonly breakEvenUnitPrice: number
}

export interface RefiningFocusComparison {
  readonly focusCostEfficiency: number
  readonly baseFocusPerCraft: number
  readonly effectiveFocusPerCraft: number
  readonly totalFocusRequired: number
  readonly extraProfitBeforeFocusValuation: number
  readonly silverPerFocusProduced: number
  readonly opportunityCost: number
  readonly netFocusValue: number
}

export interface RefiningCalculationResult {
  readonly requestedOutputQuantity: number
  readonly craftsNeeded: number
  readonly productionObtained: number
  readonly grossRawRequired: number
  readonly grossPreviousRefinedRequired: number
  readonly hasCitySpecialty: boolean
  readonly withoutFocus: RefiningScenario
  readonly withFocus: RefiningScenario
  readonly focus: RefiningFocusComparison
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Motor económico del refinamiento.
 *
 * Fórmulas y unidades:
 *
 * crafts = ceil(cantidad_objetivo / salida_por_tirada)
 * bruto_crudo = crafts * crudo_por_tirada
 * bruto_previo = crafts * refinado_previo_por_tirada
 * retorno = cantidad_bruta * RRR
 * consumo_neto = cantidad_bruta - retorno
 * costo_bruto_materiales = bruto_crudo * precio_crudo + bruto_previo * precio_previo
 * valor_retornado = retorno_crudo * precio_crudo + retorno_previo * precio_previo
 * tarifa_estacion = ((ItemValue * 0.1125) * tarifa_por_100 / 100) * crafts
 * inversion_inicial = costo_bruto_materiales + tarifa_estacion
 * costo_efectivo = inversion_inicial - valor_retornado
 * ingreso_neto = venta_bruta - impuesto_mercado - tarifa_de_orden
 * beneficio = ingreso_neto - costo_efectivo
 * ROI = beneficio / inversion_inicial
 * equilibrio = costo_efectivo / (unidades * (1 - comisiones_venta))
 * valor_neto_foco = (beneficio_con_foco - beneficio_sin_foco)
 *                   - (foco_consumido * plata_por_foco)
 *
 * RRR = bono_produccion / (1 + bono_produccion), usando el bono como fracción.
 * Las devoluciones son valores esperados; Albion redondea cada tanda para aproximar
 * ese promedio, por lo que lotes pequeños pueden diferir por una unidad.
 */
export function calculateRefiningEconomics(
  input: RefiningCalculationInput,
): RefiningCalculationResult {
  const requestedOutputQuantity = Math.max(
    1,
    Math.floor(nonNegative(input.requestedOutputQuantity)),
  )
  const craftsNeeded = Math.ceil(
    requestedOutputQuantity / Math.max(1, input.recipe.outputPerCraft),
  )
  const productionObtained = craftsNeeded * input.recipe.outputPerCraft
  const grossRawRequired = craftsNeeded * input.recipe.rawPerCraft
  const grossPreviousRefinedRequired =
    craftsNeeded * input.recipe.previousRefinedPerCraft
  const rawUnitPrice = nonNegative(input.prices.rawUnitPrice)
  const previousRefinedUnitPrice = nonNegative(
    input.prices.previousRefinedUnitPrice,
  )
  const outputUnitPrice = nonNegative(input.prices.outputUnitPrice)
  const hasCitySpecialty = input.resource.specialtyCity === input.city
  const grossMaterialCost =
    grossRawRequired * rawUnitPrice +
    grossPreviousRefinedRequired * previousRefinedUnitPrice
  const stationFee = calculateStationUsageFee({
    station: 'refining',
    itemValue: input.recipe.itemValuePerCraft,
    itemValueSource: 'dataset',
    quantity: productionObtained,
    craftsNeeded,
    config: input.stationFeeConfig,
  }).totalFee

  const calculateScenario = (useFocus: boolean): RefiningScenario => {
    const returnBreakdown = calculateReturnRateBreakdown({
      hasSpecialtyBonus: hasCitySpecialty,
      specialtyKind: 'refining',
      useFocus,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1,
      isIsland: false,
    })
    const returnedRaw = grossRawRequired * returnBreakdown.returnRate
    const returnedPreviousRefined =
      grossPreviousRefinedRequired * returnBreakdown.returnRate
    const recoveredMaterialValue =
      returnedRaw * rawUnitPrice +
      returnedPreviousRefined * previousRefinedUnitPrice
    const initialInvestment = grossMaterialCost + stationFee
    const effectiveProductionCost = Math.max(
      0,
      initialInvestment - recoveredMaterialValue,
    )
    const market = calculateProfitBreakdown({
      totalCost: effectiveProductionCost,
      quantity: productionObtained,
      unitSellPrice: outputUnitPrice,
      isPremium: input.isPremium,
    })
    const profit = market.profit

    return {
      useFocus,
      returnRate: returnBreakdown.returnRate,
      productionBonus: returnBreakdown.totalProductionBonus,
      returnedRaw,
      returnedPreviousRefined,
      netRawConsumed: grossRawRequired - returnedRaw,
      netPreviousRefinedConsumed:
        grossPreviousRefinedRequired - returnedPreviousRefined,
      grossMaterialCost,
      recoveredMaterialValue,
      stationFee,
      initialInvestment,
      effectiveProductionCost,
      effectiveCostPerUnit:
        productionObtained > 0
          ? effectiveProductionCost / productionObtained
          : 0,
      market,
      profit,
      profitPerUnit: productionObtained > 0 ? profit / productionObtained : 0,
      roi: initialInvestment > 0 ? profit / initialInvestment : 0,
      breakEvenUnitPrice: market.breakEvenUnitPrice,
    }
  }

  const withoutFocus = calculateScenario(false)
  const withFocus = calculateScenario(true)
  const focusCostEfficiency = nonNegative(input.focusCostEfficiency)
  const effectiveFocusPerCraft = calculateEffectiveFocusCost(
    input.recipe.baseFocusPerCraft,
    focusCostEfficiency,
  )
  const totalFocusRequired = effectiveFocusPerCraft * craftsNeeded
  const extraProfitBeforeFocusValuation = withFocus.profit - withoutFocus.profit
  const opportunityCost = totalFocusRequired * nonNegative(input.silverPerFocus)

  return {
    requestedOutputQuantity,
    craftsNeeded,
    productionObtained,
    grossRawRequired,
    grossPreviousRefinedRequired,
    hasCitySpecialty,
    withoutFocus,
    withFocus,
    focus: {
      focusCostEfficiency,
      baseFocusPerCraft: input.recipe.baseFocusPerCraft,
      effectiveFocusPerCraft,
      totalFocusRequired,
      extraProfitBeforeFocusValuation,
      silverPerFocusProduced:
        totalFocusRequired > 0
          ? extraProfitBeforeFocusValuation / totalFocusRequired
          : 0,
      opportunityCost,
      netFocusValue: extraProfitBeforeFocusValuation - opportunityCost,
    },
  }
}
