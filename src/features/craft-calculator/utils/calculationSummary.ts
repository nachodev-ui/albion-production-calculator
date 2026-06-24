import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type { StationFeeSource } from '@core/domain/entities/ProductionEconomy'
import { formatEnchantment } from '@core/domain/entities/Enchantment'
import { calculateCraftEconomicSummary } from './profitCalculations'

export interface CalculationSummaryMaterial {
  readonly name: string
  readonly enchantment: EnchantmentLevel
  readonly grossQuantity: number
  readonly returnedQuantity: number
  readonly netQuantity: number
  readonly silverValue: number
}

export interface CalculationSummaryMissingPrice {
  readonly name: string
  readonly enchantment: EnchantmentLevel
}

export interface CalculationSummaryInput {
  readonly generatedAt: Date
  readonly itemName: string
  readonly tier: number
  readonly enchantment: EnchantmentLevel
  readonly quantity: number

  readonly cityName: string
  readonly hasSpecialtyBonus: boolean
  readonly useFocus: boolean
  readonly hasDailyBonus: boolean
  readonly dailyBonusAmount: number
  readonly returnRate: number

  readonly stationName: string
  readonly stationAccessLabel: string
  readonly itemValue: number
  readonly nutritionPerCraft: number
  readonly nutritionTotal: number
  readonly appliedFeePer100Nutrition: number
  readonly stationFeeSource?: StationFeeSource
  readonly estimatedStationUsageFee?: number
  readonly stationUsageFee: number

  readonly focusCostEfficiency: number
  readonly availableFocus: number
  readonly qualityIncrease: number
  readonly baseFocusPerCraft: number
  readonly effectiveFocusPerCraft: number
  readonly totalFocusRequired: number
  readonly maxItemsWithAvailableFocus: number

  readonly totalCost: number
  readonly silverSaved: number
  readonly stationFees: number
  readonly isComplete: boolean
  readonly missingPrices: readonly CalculationSummaryMissingPrice[]
  readonly returnedMaterials: readonly CalculationSummaryMaterial[]

  readonly isPremium: boolean
  readonly unitSellPrice: number | null
}

/**
 * Versión serializable del resumen usada por la vista imprimible.
 * La fecha se guarda como ISO para poder transportarla entre pestañas.
 */
export interface CalculationSummarySnapshot extends Omit<
  CalculationSummaryInput,
  'generatedAt'
> {
  readonly generatedAt: string
}

const silverFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
})

const quantityFormatter = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const percentageFormatter = new Intl.NumberFormat('es-CL', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatSilver(amount: number): string {
  return `${silverFormatter.format(amount)} plata`
}

function formatQuantity(amount: number): string {
  return quantityFormatter.format(amount)
}

function formatPercentage(rate: number): string {
  return percentageFormatter.format(rate)
}

function formatYesNo(value: boolean): string {
  return value ? 'Sí' : 'No'
}

function formatItemVariant(
  name: string,
  enchantment: EnchantmentLevel,
): string {
  return `${name}${formatEnchantment(enchantment)}`
}

export function createCalculationSummarySnapshot(
  input: CalculationSummaryInput,
): CalculationSummarySnapshot {
  return {
    ...input,
    generatedAt: input.generatedAt.toISOString(),
  }
}

export function restoreCalculationSummaryInput(
  snapshot: CalculationSummarySnapshot,
): CalculationSummaryInput {
  return {
    ...snapshot,
    generatedAt: new Date(snapshot.generatedAt),
  }
}

/**
 * Genera un resumen de texto plano listo para copiar, enviar o guardar.
 * Deliberadamente usa la misma fuente de cálculos económicos que la UI.
 */
export function buildCalculationSummary(
  input: CalculationSummaryInput,
): string {
  const grossCost = input.totalCost + input.silverSaved
  const safeQuantity = Math.max(1, input.quantity)
  const netCostPerUnit = input.totalCost / safeQuantity
  const savingsPerUnit = input.silverSaved / safeQuantity
  const normalizedSellPrice = input.unitSellPrice ?? 0
  const hasSellPrice = normalizedSellPrice > 0

  const economics = calculateCraftEconomicSummary({
    totalCost: input.totalCost,
    recoveredMaterialValue: input.silverSaved,
    quantity: safeQuantity,
    unitSellPrice: normalizedSellPrice,
    isPremium: input.isPremium,
  })
  const { cashBreakdown } = economics
  const stationFeeSource = input.stationFeeSource ?? 'estimated'
  const stationLines =
    stationFeeSource === 'manual_total'
      ? [
          'PUESTO Y COSTO DE FABRICACIÓN',
          `- Puesto: ${input.stationName}`,
          '- Fuente: Total Cost ingresado desde Albion',
          `- Costo aplicado al cálculo: ${formatSilver(input.stationUsageFee)}`,
          ...(input.estimatedStationUsageFee !== undefined
            ? [
                `- Estimación avanzada de referencia: ${formatSilver(input.estimatedStationUsageFee)}`,
              ]
            : []),
        ]
      : [
          'PUESTO Y COSTO DE FABRICACIÓN',
          `- Puesto: ${input.stationName}`,
          '- Fuente: estimación por nutrición',
          `- Acceso: ${input.stationAccessLabel}`,
          `- Item Value: ${formatQuantity(input.itemValue)}`,
          `- Nutrición por tirada: ${formatQuantity(input.nutritionPerCraft)}`,
          `- Nutrición total: ${formatQuantity(input.nutritionTotal)}`,
          `- Tarifa aplicada / 100 nutrición: ${formatSilver(input.appliedFeePer100Nutrition)}`,
          `- Costo aplicado al cálculo: ${formatSilver(input.stationUsageFee)}`,
        ]

  const lines: string[] = [
    'ALBION CRAFT CALCULATOR',
    'RESUMEN DE CÁLCULO',
    `Generado: ${dateFormatter.format(input.generatedAt)}`,
    `Estado: ${
      input.isComplete
        ? 'COMPLETO'
        : `INCOMPLETO (${input.missingPrices.length} ${
            input.missingPrices.length === 1
              ? 'precio pendiente'
              : 'precios pendientes'
          })`
    }`,
    '',
    'OBJETO',
    `- Ítem: ${input.itemName}`,
    `- Nivel: T${input.tier}${formatEnchantment(input.enchantment)}`,
    `- Cantidad: ${safeQuantity}`,
    '',
    'CONFIGURACIÓN DE PRODUCCIÓN',
    `- Ciudad: ${input.cityName}`,
    `- Bono de especialidad: ${formatYesNo(input.hasSpecialtyBonus)}`,
    `- Usar foco: ${formatYesNo(input.useFocus)}`,
    `- Bono diario: ${
      input.hasDailyBonus
        ? `Sí (+${formatPercentage(input.dailyBonusAmount)})`
        : 'No'
    }`,
    `- RRR resultante: ${formatPercentage(input.returnRate)}`,
    '',
    ...stationLines,
    '',
    'ESPECIALIZACIÓN Y FOCO',
    `- Focus Cost Efficiency: ${formatQuantity(input.focusCostEfficiency)}`,
    `- Foco disponible: ${formatQuantity(input.availableFocus)}`,
    `- Increase in Quality: ${formatQuantity(input.qualityIncrease)}`,
    `- Foco base por tirada: ${formatQuantity(input.baseFocusPerCraft)}`,
    `- Foco efectivo por tirada: ${formatQuantity(input.effectiveFocusPerCraft)}`,
    `- Foco para este lote: ${input.useFocus ? formatQuantity(input.totalFocusRequired) : 'Foco desactivado'}`,
    `- Objetos posibles con el foco indicado: ${formatQuantity(input.maxItemsWithAvailableFocus)}`,
    '',
    'COSTOS',
    `- Inversión inicial${input.isComplete ? '' : ' parcial'}: ${formatSilver(grossCost)}`,
    `- Valor recuperado por RRR: +${formatSilver(input.silverSaved)}`,
    `- Costo económico ${input.isComplete ? 'neto' : 'parcial'}: ${formatSilver(input.totalCost)}`,
    `- Costo ${input.isComplete ? 'neto' : 'parcial'} por unidad: ${formatSilver(netCostPerUnit)}`,
    `- Ahorro por unidad: ${formatSilver(savingsPerUnit)}`,
    `- Tarifas de estación incluidas: ${formatSilver(input.stationFees)}`,
  ]

  lines.push('', 'MATERIALES RECUPERADOS')

  if (input.returnedMaterials.length === 0) {
    lines.push('- No hay materiales recuperados con valor calculado.')
  } else {
    for (const material of input.returnedMaterials) {
      lines.push(
        `- ${formatItemVariant(material.name, material.enchantment)}: ` +
          `usados ${formatQuantity(material.grossQuantity)}, ` +
          `retorno +${formatQuantity(material.returnedQuantity)}, ` +
          `consumo neto ${formatQuantity(material.netQuantity)}, ` +
          `valor ${formatSilver(material.silverValue)}`,
      )
    }
  }

  if (!input.isComplete) {
    lines.push('', 'PRECIOS PENDIENTES')

    for (const missing of input.missingPrices) {
      lines.push(`- ${formatItemVariant(missing.name, missing.enchantment)}`)
    }
  }

  lines.push(
    '',
    'VENTA Y RENTABILIDAD',
    `- Cuenta Premium: ${formatYesNo(input.isPremium)}`,
    `- Tax de venta: ${formatPercentage(cashBreakdown.taxRate)}`,
    `- Setup Fee: ${formatPercentage(cashBreakdown.setupFeeRate)}`,
    `- Comisiones totales: ${formatPercentage(cashBreakdown.totalFeeRate)}`,
    `- Precio de venta unitario: ${
      hasSellPrice ? formatSilver(normalizedSellPrice) : 'No ingresado'
    }`,
  )

  if (input.isComplete) {
    lines.push(
      `- Precio mínimo por unidad: ${formatSilver(cashBreakdown.breakEvenUnitPrice)}`,
      ...cashBreakdown.targetPrices.map(
        ({ target, unitPrice }) =>
          `- Precio objetivo ${formatPercentage(target)}: ${formatSilver(unitPrice)} por unidad`,
      ),
    )
  } else {
    lines.push(
      '- Precio mínimo por unidad: Pendiente hasta completar los precios',
      '- Precios objetivo: Pendientes hasta completar los precios',
    )
  }

  if (hasSellPrice) {
    lines.push(
      `- Venta bruta: ${formatSilver(cashBreakdown.grossRevenue)}`,
      `- Tax descontado: -${formatSilver(cashBreakdown.taxAmount)}`,
      `- Setup Fee descontado: -${formatSilver(cashBreakdown.setupFeeAmount)}`,
      `- Venta neta: ${formatSilver(cashBreakdown.netRevenue)}`,
    )

    if (input.isComplete) {
      const comparison = normalizedSellPrice - cashBreakdown.breakEvenUnitPrice

      lines.push(
        `- Diferencia frente al mínimo: ${
          comparison === 0
            ? 'Sin diferencia'
            : `${comparison > 0 ? '+' : '-'}${formatSilver(Math.abs(comparison))}`
        }`,
        `- Resultado en plata: ${economics.cashResult >= 0 ? '+' : '-'}${formatSilver(
          Math.abs(economics.cashResult),
        )}`,
        `- Valor recuperado: +${formatSilver(economics.recoveredMaterialValue)}`,
        `- Resultado económico total: ${economics.economicResult >= 0 ? '+' : '-'}${formatSilver(
          Math.abs(economics.economicResult),
        )}`,
        `- Rentabilidad en plata: ${
          economics.cashProfitability > 0 ? '+' : ''
        }${formatPercentage(economics.cashProfitability)}`,
        `- Rentabilidad económica total: ${
          economics.economicProfitability > 0 ? '+' : ''
        }${formatPercentage(economics.economicProfitability)}`,
      )
    } else {
      lines.push(
        '- Resultado en plata: Pendiente porque faltan precios de materiales',
        '- Resultado económico total: Pendiente porque faltan precios de materiales',
        '- Rentabilidades: Pendientes porque faltan precios de materiales',
      )
    }
  }

  lines.push(
    '',
    'Nota: los retornos son estimaciones y pueden variar ligeramente por el redondeo del juego.',
  )

  return lines.join('\n')
}

function createSafeSummarySlug(itemName: string): string {
  const slug = itemName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

  return slug.length > 0 ? slug : 'item'
}

/** Crea un nombre seguro y reconocible para el archivo descargado. */
export function createCalculationSummaryFileName(
  itemName: string,
  tier: number,
  enchantment: EnchantmentLevel,
): string {
  const safeSlug = createSafeSummarySlug(itemName)
  const level = `t${tier}${enchantment > 0 ? `-${enchantment}` : ''}`

  return `albion-resumen-${safeSlug}-${level}.txt`
}

/** Título limpio para la pestaña y el nombre sugerido al guardar como PDF. */
export function createCalculationPrintTitle(
  itemName: string,
  tier: number,
  enchantment: EnchantmentLevel,
): string {
  const level = `T${tier}${formatEnchantment(enchantment)}`

  return `Resumen ${itemName} ${level} - Albion Craft Calculator`
}
