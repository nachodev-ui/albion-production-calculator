import { useEffect, useRef, useState } from 'react'
import type { ItemCategory } from '@core/domain/entities/Item'
import { CATEGORY_OPTIONS } from '../hooks/useItemSearch'

interface CategoryFilterProps {
  readonly value: ItemCategory
  readonly counts: Readonly<Record<ItemCategory, number>>
  readonly onChange: (value: ItemCategory) => void
}

interface CategoryIconProps {
  readonly category: ItemCategory
}

function CategoryIcon({ category }: CategoryIconProps) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (category) {
    case 'weapon':
      return (
        <svg {...commonProps}>
          <path d="m14.5 4.5 5-1-1 5L9 18l-3 1 1-3 7.5-11.5Z" />
          <path d="m11 14 3 3" />
          <path d="m5 19-2 2" />
        </svg>
      )
    case 'armor':
      return (
        <svg {...commonProps}>
          <path d="M8 4 4 7l2 4v9h12v-9l2-4-4-3-2 3h-4L8 4Z" />
          <path d="M9 12h6" />
        </svg>
      )
    case 'offhand':
      return (
        <svg {...commonProps}>
          <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
          <path d="M12 7v9" />
        </svg>
      )
    case 'accessory':
      return (
        <svg {...commonProps}>
          <path d="M8 3h8l3 5-7 13L5 8l3-5Z" />
          <path d="M5 8h14" />
          <path d="m8 3 4 5 4-5" />
        </svg>
      )
    case 'resource':
      return (
        <svg {...commonProps}>
          <path d="m12 3 7 5-7 5-7-5 7-5Z" />
          <path d="m5 12 7 5 7-5" />
          <path d="m5 16 7 5 7-5" />
        </svg>
      )
    case 'refined_resource':
      return (
        <svg {...commonProps}>
          <path d="M5 7h14l-2 10H7L5 7Z" />
          <path d="m8 7 1-4h6l1 4" />
          <path d="M9 12h6" />
        </svg>
      )
    case 'food':
      return (
        <svg {...commonProps}>
          <path d="M4 11h16" />
          <path d="M6 11a6 6 0 0 1 12 0" />
          <path d="M3 15h18" />
          <path d="M7 19h10" />
        </svg>
      )
    case 'potion':
      return (
        <svg {...commonProps}>
          <path d="M9 3h6" />
          <path d="M10 3v5l-4 6a4 4 0 0 0 3.4 6h5.2a4 4 0 0 0 3.4-6l-4-6V3" />
          <path d="M8 14h8" />
        </svg>
      )
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      )
  }
}

/**
 * Selector compacto de categoría.
 *
 * Reemplaza los chips horizontales (y su scroll lateral) por un único
 * control descriptivo. Al abrirlo, muestra todas las categorías en una
 * cuadrícula; así el encabezado del browser conserva altura para las ramas.
 */
export function CategoryFilter({ value, counts, onChange }: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const activeOption = CATEGORY_OPTIONS.find((option) => option.value === value)

  useEffect(() => {
    if (!isOpen) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  if (!activeOption) return null

  function selectCategory(category: ItemCategory) {
    onChange(category)
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-faint">
          Categoría del catálogo
        </p>
        <span className="text-[10px] text-text-faint">{CATEGORY_OPTIONS.length} categorías</span>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
          isOpen
            ? 'border-accent-border bg-accent-muted'
            : 'border-border bg-surface-raised hover:border-border-strong hover:bg-surface'
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-muted text-accent">
          <CategoryIcon category={activeOption.value} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">
            {activeOption.label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-text-faint">
            {activeOption.description}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block font-mono text-[11px] tabular text-text-muted">
            {counts[activeOption.value]}
          </span>
          <span className="block text-[9px] uppercase tracking-wide text-text-faint">ítems</span>
        </span>

        <span
          aria-hidden="true"
          className={`ml-0.5 shrink-0 text-text-faint transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Seleccionar categoría"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-border-strong bg-surface p-2.5 shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold text-text">Explorar por categoría</p>
            <p className="text-[10px] text-text-faint">{CATEGORY_OPTIONS.length} categorías</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORY_OPTIONS.map((option) => {
              const isActive = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => selectCategory(option.value)}
                  className={`relative flex min-h-[68px] min-w-0 flex-col items-start justify-between overflow-hidden rounded-lg border p-2 text-left transition-colors ${
                    isActive
                      ? 'border-accent bg-accent-muted text-text'
                      : 'border-border bg-surface-raised text-text-muted hover:border-border-strong hover:bg-surface hover:text-text'
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                        isActive
                          ? 'border-accent-border bg-accent-muted text-accent'
                          : 'border-border bg-surface text-text-faint'
                      }`}
                    >
                      <CategoryIcon category={option.value} />
                    </span>
                    <span className="font-mono text-[9px] tabular text-text-faint">
                      {counts[option.value]}
                    </span>
                  </span>

                  <span className="mt-1 block w-full truncate text-[11px] font-medium">
                    {option.label}
                  </span>

                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
