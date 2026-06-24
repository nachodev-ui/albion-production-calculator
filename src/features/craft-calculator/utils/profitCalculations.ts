export const PREMIUM_TAX_RATE = 0.04
export const STANDARD_TAX_RATE = 0.08
export const SETUP_FEE_RATE = 0.025
export const PROFITABILITY_TARGETS = [0.1, 0.2, 0.3] as const

interface RequiredUnitPriceParams {
  readonly totalCost: number
  readonly quantity: number
  readonly totalFeeRate: number
  readonly targetProfitability: number
}

export interface ProfitBreakdownParams {
  readonly totalCost: number
  readonly quantity: number
  readonly unitSellPrice: number
  readonly isPremium: boolean
}

export interface CraftEconomicSummaryParams extends ProfitBreakdownParams {
  /** Valor de reposición estimado de los materiales devueltos por el RRR. */
  readonly recoveredMaterialValue: number
}

export interface ProfitTargetPrice {
  readonly target: (typeof PROFITABILITY_TARGETS)[number]
  readonly unitPrice: number
}

export interface ProfitBreakdown {
  readonly safeQuantity: number
  readonly taxRate: number
  readonly setupFeeRate: number
  readonly totalFeeRate: number
  readonly grossRevenue: number
  readonly taxAmount: number
  readonly setupFeeAmount: number
  readonly netRevenue: number
  readonly profit: number
  readonly profitability: number
  readonly breakEvenUnitPrice: number
  readonly targetPrices: readonly ProfitTargetPrice[]
}

export interface CraftEconomicSummary {
  /** Plata necesaria antes de recibir los materiales retornados. */
  readonly initialInvestment: number
  /** Costo económico después de descontar el valor recuperado. */
  readonly netProductionCost: number
  readonly recoveredMaterialValue: number
  /** Venta neta menos la inversión inicial. */
  readonly cashResult: number
  /** Resultado en plata más el valor de los materiales recuperados. */
  readonly economicResult: number
  readonly cashProfitability: number
  readonly economicProfitability: number
  /**
   * Usa la inversión inicial para el punto de equilibrio y los objetivos.
   * Así el precio sugerido recupera realmente la plata desembolsada.
   */
  readonly cashBreakdown: ProfitBreakdown
  /** Conserva el resultado patrimonial después de valorar los retornos. */
  readonly economicBreakdown: ProfitBreakdown
}

/**
 * Calcula el precio bruto mínimo por unidad necesario para cubrir el costo
 * total y alcanzar una rentabilidad objetivo después de las comisiones.
 *
 * La rentabilidad se mide sobre el costo:
 *   ganancia / costo = targetProfitability
 */
export function calculateRequiredUnitPrice({
  totalCost,
  quantity,
  totalFeeRate,
  targetProfitability,
}: RequiredUnitPriceParams): number {
  if (
    totalCost <= 0 ||
    quantity <= 0 ||
    totalFeeRate < 0 ||
    totalFeeRate >= 1 ||
    targetProfitability < 0
  ) {
    return 0
  }

  const requiredNetRevenue = totalCost * (1 + targetProfitability)
  const requiredGrossRevenue = requiredNetRevenue / (1 - totalFeeRate)

  return Math.ceil(requiredGrossRevenue / quantity)
}

/**
 * Fuente única para los cálculos de venta después de impuestos y comisiones.
 */
export function calculateProfitBreakdown({
  totalCost,
  quantity,
  unitSellPrice,
  isPremium,
}: ProfitBreakdownParams): ProfitBreakdown {
  const safeQuantity = Math.max(1, Math.floor(quantity))
  const safeUnitSellPrice = Math.max(0, unitSellPrice)
  const taxRate = isPremium ? PREMIUM_TAX_RATE : STANDARD_TAX_RATE
  const totalFeeRate = taxRate + SETUP_FEE_RATE

  const grossRevenue = safeUnitSellPrice * safeQuantity
  const taxAmount = grossRevenue * taxRate
  const setupFeeAmount = grossRevenue * SETUP_FEE_RATE
  const netRevenue = grossRevenue - taxAmount - setupFeeAmount
  const profit = netRevenue - totalCost
  const profitability = totalCost > 0 ? profit / totalCost : 0

  const breakEvenUnitPrice = calculateRequiredUnitPrice({
    totalCost,
    quantity: safeQuantity,
    totalFeeRate,
    targetProfitability: 0,
  })

  const targetPrices = PROFITABILITY_TARGETS.map((target) => ({
    target,
    unitPrice: calculateRequiredUnitPrice({
      totalCost,
      quantity: safeQuantity,
      totalFeeRate,
      targetProfitability: target,
    }),
  }))

  return {
    safeQuantity,
    taxRate,
    setupFeeRate: SETUP_FEE_RATE,
    totalFeeRate,
    grossRevenue,
    taxAmount,
    setupFeeAmount,
    netRevenue,
    profit,
    profitability,
    breakEvenUnitPrice,
    targetPrices,
  }
}

/**
 * Separa el flujo de plata del valor patrimonial de los materiales retornados.
 *
 * - Inversión inicial = costo neto + valor recuperado.
 * - Resultado en plata = venta neta - inversión inicial.
 * - Resultado económico = resultado en plata + valor recuperado.
 *
 * De esta forma los retornos no se cuentan dos veces y tampoco se presentan
 * como si fueran plata líquida disponible inmediatamente.
 */
export function calculateCraftEconomicSummary({
  totalCost,
  recoveredMaterialValue,
  quantity,
  unitSellPrice,
  isPremium,
}: CraftEconomicSummaryParams): CraftEconomicSummary {
  const safeNetCost = Math.max(0, totalCost)
  const safeRecoveredValue = Math.max(0, recoveredMaterialValue)
  const initialInvestment = safeNetCost + safeRecoveredValue

  const cashBreakdown = calculateProfitBreakdown({
    totalCost: initialInvestment,
    quantity,
    unitSellPrice,
    isPremium,
  })

  const economicBreakdown = calculateProfitBreakdown({
    totalCost: safeNetCost,
    quantity,
    unitSellPrice,
    isPremium,
  })

  const cashResult = cashBreakdown.profit
  const economicResult = economicBreakdown.profit

  return {
    initialInvestment,
    netProductionCost: safeNetCost,
    recoveredMaterialValue: safeRecoveredValue,
    cashResult,
    economicResult,
    cashProfitability:
      initialInvestment > 0 ? cashResult / initialInvestment : 0,
    economicProfitability:
      initialInvestment > 0 ? economicResult / initialInvestment : 0,
    cashBreakdown,
    economicBreakdown,
  }
}
