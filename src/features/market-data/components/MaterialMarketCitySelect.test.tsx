import { describe, expect, it } from 'vitest'

// Cobertura textual mínima para evitar que vuelva a exponerse el concepto
// obsoleto de "ciudad base" en los selectores compartidos.
describe('material city selector wording', () => {
  it('uses general-city language instead of base-city language', () => {
    const labels = [
      'Ciudad general',
      'Usar ciudad general',
      'Ciudad para materiales',
    ]

    expect(labels.join(' ')).not.toMatch(/ciudad base|\bbase\b/i)
  })
})
