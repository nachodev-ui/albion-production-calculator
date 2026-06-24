import type {
  MarketCityId,
  MaterialMarketPriceBadge,
} from '../types/MarketPrice'

export interface MarketCityTone {
  readonly foreground: string
  readonly border: string
  readonly background: string
  readonly softBackground: string
}

export interface MaterialPriceBadgePresentation {
  readonly label: string
  readonly className: string
}

/**
 * Tonos inspirados en los estandartes de cada ciudad de Albion.
 * Se usan versiones desaturadas para conservar el aspecto de forja nocturna
 * de la aplicación y evitar acentos demasiado brillantes.
 */
const MARKET_CITY_TONES: Readonly<Record<string, MarketCityTone>> = {
  martlock: {
    foreground: '#8299b2',
    border: 'rgba(103, 132, 164, 0.52)',
    background: 'rgba(78, 108, 142, 0.16)',
    softBackground: 'rgba(78, 108, 142, 0.09)',
  },
  bridgewatch: {
    foreground: '#bd874d',
    border: 'rgba(181, 117, 51, 0.52)',
    background: 'rgba(181, 117, 51, 0.15)',
    softBackground: 'rgba(181, 117, 51, 0.08)',
  },
  lymhurst: {
    foreground: '#87a461',
    border: 'rgba(106, 139, 70, 0.52)',
    background: 'rgba(106, 139, 70, 0.15)',
    softBackground: 'rgba(106, 139, 70, 0.08)',
  },
  fort_sterling: {
    foreground: '#b5bdc4',
    border: 'rgba(176, 187, 197, 0.44)',
    background: 'rgba(176, 187, 197, 0.12)',
    softBackground: 'rgba(176, 187, 197, 0.07)',
  },
  thetford: {
    foreground: '#9a79a8',
    border: 'rgba(129, 87, 148, 0.54)',
    background: 'rgba(129, 87, 148, 0.16)',
    softBackground: 'rgba(129, 87, 148, 0.09)',
  },
  caerleon: {
    foreground: '#bd6e65',
    border: 'rgba(157, 70, 62, 0.52)',
    background: 'rgba(157, 70, 62, 0.15)',
    softBackground: 'rgba(157, 70, 62, 0.08)',
  },
  brecilien: {
    foreground: '#6e9e98',
    border: 'rgba(74, 132, 124, 0.52)',
    background: 'rgba(74, 132, 124, 0.15)',
    softBackground: 'rgba(74, 132, 124, 0.08)',
  },
}

const FALLBACK_CITY_TONE: MarketCityTone = {
  foreground: '#9c8f72',
  border: 'rgba(156, 143, 114, 0.38)',
  background: 'rgba(156, 143, 114, 0.12)',
  softBackground: 'rgba(156, 143, 114, 0.07)',
}

export const MATERIAL_PRICE_BADGE_PRESENTATION: Readonly<
  Record<
    Exclude<MaterialMarketPriceBadge, null>,
    MaterialPriceBadgePresentation
  >
> = {
  best: {
    label: 'Mejor precio',
    className: 'border-positive bg-positive-muted text-positive',
  },
  highest: {
    label: 'Más alto',
    className: 'border-negative bg-negative-muted text-negative',
  },
  same: {
    label: 'Mismo precio',
    className: 'border-accent-border bg-accent-muted text-accent',
  },
  only: {
    label: 'Único disponible',
    className: 'border-border-strong bg-surface text-text-muted',
  },
}

export const MISSING_PRICE_BADGE_PRESENTATION: MaterialPriceBadgePresentation = {
  label: 'Sin datos',
  className: 'border-border bg-surface text-text-faint',
}

export function getMarketCityTone(city: MarketCityId): MarketCityTone {
  return MARKET_CITY_TONES[city] ?? FALLBACK_CITY_TONE
}
