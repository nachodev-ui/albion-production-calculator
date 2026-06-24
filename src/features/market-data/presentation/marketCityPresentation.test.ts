import { describe, expect, it } from 'vitest'
import {
  MATERIAL_PRICE_BADGE_PRESENTATION,
  getMarketCityTone,
} from './marketCityPresentation'

describe('marketCityPresentation', () => {
  it('mantiene un tono reconocible y desaturado por ciudad', () => {
    expect(getMarketCityTone('martlock').foreground).toBe('#8299b2')
    expect(getMarketCityTone('bridgewatch').foreground).toBe('#bd874d')
    expect(getMarketCityTone('lymhurst').foreground).toBe('#87a461')
    expect(getMarketCityTone('fort_sterling').foreground).toBe('#b5bdc4')
    expect(getMarketCityTone('thetford').foreground).toBe('#9a79a8')
    expect(getMarketCityTone('caerleon').foreground).toBe('#bd6e65')
    expect(getMarketCityTone('brecilien').foreground).toBe('#6e9e98')
  })

  it('usa la misma semántica visual que los estados de frescura', () => {
    expect(MATERIAL_PRICE_BADGE_PRESENTATION.best.label).toBe(
      'Mejor precio',
    )
    expect(MATERIAL_PRICE_BADGE_PRESENTATION.best.className).toContain(
      'positive',
    )
    expect(MATERIAL_PRICE_BADGE_PRESENTATION.highest.label).toBe(
      'Más alto',
    )
    expect(MATERIAL_PRICE_BADGE_PRESENTATION.highest.className).toContain(
      'negative',
    )
  })

  it('entrega un tono neutro para mercados futuros', () => {
    expect(getMarketCityTone('future_market')).toEqual({
      foreground: '#9c8f72',
      border: 'rgba(156, 143, 114, 0.38)',
      background: 'rgba(156, 143, 114, 0.12)',
      softBackground: 'rgba(156, 143, 114, 0.07)',
    })
  })
})
