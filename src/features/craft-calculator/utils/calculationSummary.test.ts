import { describe, expect, it } from 'vitest'
import {
  buildCalculationSummary,
  createCalculationPrintTitle,
  createCalculationSummaryFileName,
  createCalculationSummarySnapshot,
  restoreCalculationSummaryInput,
} from './calculationSummary'

const baseInput = {
  generatedAt: new Date('2026-06-22T12:00:00.000Z'),
  itemName: 'Espada del Anciano',
  tier: 8,
  enchantment: 2 as const,
  quantity: 10,
  cityName: 'Lymhurst',
  hasSpecialtyBonus: true,
  useFocus: true,
  hasDailyBonus: false,
  dailyBonusAmount: 0.1,
  returnRate: 0.48,
  stationName: "Elder's Warrior's Forge",
  stationAccessLabel: 'Usuario',
  itemValue: 8000,
  nutritionPerCraft: 900,
  nutritionTotal: 9000,
  appliedFeePer100Nutrition: 450,
  stationUsageFee: 40_500,
  focusCostEfficiency: 24_000,
  availableFocus: 10_000,
  qualityIncrease: 6.05,
  baseFocusPerCraft: 1000,
  effectiveFocusPerCraft: 190,
  totalFocusRequired: 1900,
  maxItemsWithAvailableFocus: 52,
  totalCost: 935_000,
  silverSaved: 215_000,
  stationFees: 25_000,
  isComplete: true,
  missingPrices: [],
  returnedMaterials: [
    {
      name: 'Lingote de acero',
      enchantment: 2 as const,
      grossQuantity: 100,
      returnedQuantity: 48,
      netQuantity: 52,
      silverValue: 215_000,
    },
  ],
  isPremium: true,
  unitSellPrice: 120_000,
}

describe('buildCalculationSummary', () => {
  it('incluye producción, costos, retornos y resultado económico', () => {
    const summary = buildCalculationSummary(baseInput)

    expect(summary).toContain('Espada del Anciano')
    expect(summary).toContain('Nivel: T8.2')
    expect(summary).toContain('RRR resultante: 48%')
    expect(summary).toContain('Inversión inicial: 1.150.000 plata')
    expect(summary).toContain('Costo aplicado al cálculo: 40.500 plata')
    expect(summary).toContain('Focus Cost Efficiency: 24.000')
    expect(summary).toContain('Lingote de acero.2')
    expect(summary).toContain('Precio objetivo 20%: 147.594 plata por unidad')
    expect(summary).toContain('Resultado en plata: -28.000 plata')
    expect(summary).toContain('Valor recuperado: +215.000 plata')
    expect(summary).toContain('Resultado económico total: +187.000 plata')
    expect(summary).toContain('Rentabilidad en plata: -2,4%')
    expect(summary).toContain('Rentabilidad económica total: +16,3%')
  })

  it('identifica el Total Cost directo sin confundirlo con Item Value', () => {
    const summary = buildCalculationSummary({
      ...baseInput,
      stationFeeSource: 'manual_total' as const,
      stationUsageFee: 1_015,
      estimatedStationUsageFee: 1_020,
    })

    expect(summary).toContain('Fuente: Total Cost ingresado desde Albion')
    expect(summary).toContain('Costo aplicado al cálculo: 1.015 plata')
    expect(summary).toContain('Estimación avanzada de referencia: 1.020 plata')
    expect(summary).not.toContain('Item Value: 8.000')
  })

  it('marca explícitamente un cálculo incompleto y enumera precios pendientes', () => {
    const summary = buildCalculationSummary({
      ...baseInput,
      isComplete: false,
      unitSellPrice: null,
      missingPrices: [
        {
          name: 'Cuero endurecido',
          enchantment: 1,
        },
      ],
    })

    expect(summary).toContain('Estado: INCOMPLETO (1 precio pendiente)')
    expect(summary).toContain('PRECIOS PENDIENTES')
    expect(summary).toContain('Cuero endurecido.1')
    expect(summary).toContain('Precio mínimo por unidad: Pendiente')
    expect(summary).toContain('Precio de venta unitario: No ingresado')
  })
})

describe('createCalculationSummaryFileName', () => {
  it('genera un nombre de archivo seguro y reconocible', () => {
    expect(
      createCalculationSummaryFileName('Báculo Ígneo del Anciano', 8, 3),
    ).toBe('albion-resumen-baculo-igneo-del-anciano-t8-3.txt')
  })
})

describe('CalculationSummarySnapshot', () => {
  it('convierte y restaura la fecha para la vista imprimible', () => {
    const snapshot = createCalculationSummarySnapshot(baseInput)
    const restored = restoreCalculationSummaryInput(snapshot)

    expect(snapshot.generatedAt).toBe('2026-06-22T12:00:00.000Z')
    expect(restored.generatedAt).toEqual(baseInput.generatedAt)
    expect(restored.itemName).toBe(baseInput.itemName)
  })

  it('genera un título reconocible para la pestaña de impresión', () => {
    expect(createCalculationPrintTitle('Báculo Ígneo del Anciano', 8, 3)).toBe(
      'Resumen Báculo Ígneo del Anciano T8.3 - Albion Craft Calculator',
    )
  })
})
