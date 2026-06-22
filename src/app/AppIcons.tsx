import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const commonProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function AnvilIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M4 5h14l2 3-4 3H8L4 8V5Z" />
      <path d="M9 11v3c0 2-1.5 3.5-4 4v1h14v-2c-2.6-.6-4-1.7-4-3v-3" />
    </svg>
  )
}

export function HammerIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="m14 4 6 6" />
      <path d="m12 6 4-4 6 6-4 4" />
      <path d="m14 10-8.5 8.5a2.1 2.1 0 0 1-3-3L11 7" />
    </svg>
  )
}

export function RefiningIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M5 7h14l-2 10H7L5 7Z" />
      <path d="m8 7 1-4h6l1 4" />
      <path d="M9 12h6" />
    </svg>
  )
}

export function PresetIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <circle cx="16" cy="6" r="2" />
      <path d="M4 12h2" />
      <path d="M10 12h10" />
      <circle cx="8" cy="12" r="2" />
      <path d="M4 18h7" />
      <path d="M15 18h5" />
      <circle cx="13" cy="18" r="2" />
    </svg>
  )
}

export function CatalogIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <path d="M8 7h7" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

export function ReturnIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M20 7v5h-5" />
      <path d="M19 12a7 7 0 1 0-2 5" />
    </svg>
  )
}

export function CalculatorIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
    </svg>
  )
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  )
}
