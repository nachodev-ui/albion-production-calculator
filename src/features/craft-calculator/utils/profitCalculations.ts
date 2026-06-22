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
 * Fuente única para los cálculos económicos de la UI y del resumen exportado.
 * De esta forma, copiar o descargar un resumen nunca usa fórmulas distintas
 * a las mostradas en `ProfitSummaryCard`.
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
