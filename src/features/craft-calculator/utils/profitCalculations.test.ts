import { describe, expect, it } from 'vitest'
import {
  calculateProfitBreakdown,
  calculateRequiredUnitPrice,
} from './profitCalculations'

describe('calculateRequiredUnitPrice', () => {
  it('calcula el punto de equilibrio después de comisiones', () => {
    expect(
      calculateRequiredUnitPrice({
        totalCost: 935_000,
        quantity: 10,
        totalFeeRate: 0.065,
        targetProfitability: 0,
      }),
    ).toBe(100_000)
  })

  it('calcula un precio objetivo con rentabilidad sobre costo', () => {
    expect(
      calculateRequiredUnitPrice({
        totalCost: 935_000,
        quantity: 10,
        totalFeeRate: 0.065,
        targetProfitability: 0.2,
      }),
    ).toBe(120_000)
  })

  it('redondea hacia arriba para no quedar bajo el objetivo', () => {
    expect(
      calculateRequiredUnitPrice({
        totalCost: 100,
        quantity: 3,
        totalFeeRate: 0.065,
        targetProfitability: 0.1,
      }),
    ).toBe(40)
  })

  it('devuelve cero con entradas inválidas', () => {
    expect(
      calculateRequiredUnitPrice({
        totalCost: 100,
        quantity: 0,
        totalFeeRate: 0.065,
        targetProfitability: 0.1,
      }),
    ).toBe(0)
  })
})


describe('calculateProfitBreakdown', () => {
  it('mantiene una única fuente para impuestos, objetivos y resultado', () => {
    const result = calculateProfitBreakdown({
      totalCost: 935_000,
      quantity: 10,
      unitSellPrice: 120_000,
      isPremium: true,
    })

    expect(result.taxRate).toBe(0.04)
    expect(result.setupFeeRate).toBe(0.025)
    expect(result.grossRevenue).toBe(1_200_000)
    expect(result.netRevenue).toBe(1_122_000)
    expect(result.profit).toBe(187_000)
    expect(result.profitability).toBe(0.2)
    expect(result.breakEvenUnitPrice).toBe(100_000)
    expect(result.targetPrices[1]?.unitPrice).toBe(120_000)
  })
})
