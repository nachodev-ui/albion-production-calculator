/**
 * Tokens de diseño de la app, centralizados acá como referencia y
 * para uso programático (ej. colores de categoría en gráficos).
 * La fuente de verdad visual real son las custom properties CSS en
 * `src/index.css` — este archivo espeja esos valores para TS/JS.
 *
 * Concepto: "taller de forja nocturno". Paneles oscuros, acento
 * dorado restringido a plata/precios/estados activos, serif con
 * carácter para títulos (Fraunces), sans neutra para datos densos
 * (Inter), mono tabular para números (Roboto Mono).
 */

export const COLORS = {
  bg: '#15130f',
  surface: '#1f1b15',
  surfaceRaised: '#262017',
  border: '#332b1e',
  borderStrong: '#473b27',
  text: '#e8dcc4',
  textMuted: '#9c8f72',
  textFaint: '#6b6049',
  accent: '#c9a227',
  accentMuted: 'rgba(201, 162, 39, 0.14)',
  accentBorder: 'rgba(201, 162, 39, 0.4)',
  positive: '#7a9b76',
  positiveMuted: 'rgba(122, 155, 118, 0.14)',
  negative: '#b5544a',
  negativeMuted: 'rgba(181, 84, 74, 0.14)',
} as const

/**
 * Color de acento por categoría de ítem, usado como borde sutil en
 * tarjetas/filas del buscador para que el ojo distinga de un
 * vistazo armas de recursos de consumibles sin leer el texto.
 */
export const CATEGORY_ACCENT: Record<string, string> = {
  weapon: '#b5544a',
  armor: '#5c7a9b',
  offhand: '#8a6bb0',
  accessory: '#c9a227',
  resource: '#7a9b76',
  refined_resource: '#9c8f5a',
  food: '#bf7e3f',
  potion: '#6bab9b',
  other: '#6b6049',
}

export const FONTS = {
  display: "'Fraunces', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'Roboto Mono', ui-monospace, monospace",
} as const
