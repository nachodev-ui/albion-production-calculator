import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MarketHistoryChart } from './MarketHistoryChart'

const points = [
  {
    timestamp: '2026-07-06T00:00:00Z',
    averagePrice: 720_000,
    itemCount: 2,
  },
  {
    timestamp: '2026-07-07T00:00:00Z',
    averagePrice: null,
    itemCount: 0,
  },
  {
    timestamp: '2026-07-08T00:00:00Z',
    averagePrice: 790_000,
    itemCount: 8,
  },
] as const

describe('MarketHistoryChart', () => {
  it('renders an accessible explanation of price, volume and missing days', () => {
    const markup = renderToStaticMarkup(<MarketHistoryChart points={points} />)

    expect(markup).toContain('Evolución diaria de precio y volumen')
    expect(markup).toContain('Leyenda del gráfico')
    expect(markup).toContain('Precio promedio')
    expect(markup).toContain('Unidades vendidas')
    expect(markup).toContain('Sin precio')
    expect(markup).toContain('días con precio')
    expect(markup).toContain('tabindex="0"')
    expect(markup).toContain('sin precio registrado')
  })

  it('keeps a useful empty state when no history is available', () => {
    const markup = renderToStaticMarkup(<MarketHistoryChart points={[]} />)

    expect(markup).toContain('Aún no hay una serie para mostrar')
    expect(markup).toContain('prueba otra calidad o ciudad')
  })
})
