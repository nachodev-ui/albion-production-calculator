import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { EnchantmentSelector } from '../EnchantmentSelector'

function countOccurrences(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0
}

describe('EnchantmentSelector accessibility', () => {
  it('exposes the selector as a labelled button group', () => {
    const markup = renderToStaticMarkup(
      <EnchantmentSelector value={2} maxEnchantment={3} onChange={vi.fn()} />,
    )

    expect(markup).toContain('role="group"')
    expect(markup).toContain('aria-label="Nivel de encantamiento"')
    expect(countOccurrences(markup, /<button\b/g)).toBe(5)
    expect(countOccurrences(markup, /type="button"/g)).toBe(5)
  })

  it('marks the active enchantment and disables unsupported levels without hiding them', () => {
    const markup = renderToStaticMarkup(
      <EnchantmentSelector value={2} maxEnchantment={3} onChange={vi.fn()} />,
    )

    expect(markup).toContain('aria-pressed="true"')
    expect(countOccurrences(markup, /aria-pressed="false"/g)).toBe(4)
    expect(markup).toContain('Seleccionar encantamiento sin encantamiento')
    expect(markup).toContain('Seleccionar encantamiento .2')
    expect(markup).toContain('Seleccionar encantamiento .4')
    expect(markup).toContain('disabled=""')
  })
})
