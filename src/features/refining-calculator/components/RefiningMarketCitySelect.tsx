import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { getMarketCityTone } from '@features/market-data/presentation/marketCityPresentation'
import {
  formatMarketPriceRelativeAge,
  type MarketCityId,
  type MarketDefinition,
} from '@features/market-data/types/MarketPrice'
import {
  buildRefiningMarketCityOptions,
  type RefiningMarketCityBadge,
  type RefiningMarketOperation,
  type RefiningMarketPriceGroup,
} from '../utils/refiningMarketCityOptions'

interface RefiningMarketCitySelectProps {
  readonly value: MarketCityId
  readonly markets: readonly MarketDefinition[]
  readonly groups: readonly RefiningMarketPriceGroup[]
  readonly operation: RefiningMarketOperation
  readonly ariaLabel: string
  readonly menuLabel: string
  readonly onChange: (city: MarketCityId) => void
}

interface FloatingMenuPosition {
  readonly left: number
  readonly width: number
  readonly maxHeight: number
  readonly top?: number
  readonly bottom?: number
}

function formatSilver(value: number): string {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)
}

function CityMark({ city }: { readonly city: MarketCityId }) {
  return (
    <span
      aria-hidden="true"
      className="h-8 w-1 shrink-0 rounded-full"
      style={{ background: getMarketCityTone(city).foreground }}
    />
  )
}

function badgePresentation(
  badge: RefiningMarketCityBadge,
  operation: RefiningMarketOperation,
): { readonly label: string; readonly className: string } | null {
  if (badge === 'best') {
    return {
      label: operation === 'purchase' ? 'Mejor precio' : 'Mejor venta',
      className: 'border-positive bg-positive-muted text-positive',
    }
  }
  if (badge === 'worst') {
    return {
      label: operation === 'purchase' ? 'Más alto' : 'Más bajo',
      className: 'border-negative bg-negative-muted text-negative',
    }
  }
  if (badge === 'same') {
    return {
      label: 'Mismo precio',
      className: 'border-accent-border bg-accent-muted text-accent',
    }
  }
  if (badge === 'only') {
    return {
      label: 'Único disponible',
      className: 'border-border-strong bg-surface text-text-muted',
    }
  }
  return null
}

export function RefiningMarketCitySelect({
  value,
  markets,
  groups,
  operation,
  ariaLabel,
  menuLabel,
  onChange,
}: RefiningMarketCitySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] =
    useState<FloatingMenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const options = useMemo(
    () => buildRefiningMarketCityOptions({ markets, groups, operation }),
    [groups, markets, operation],
  )
  const selected = options.find((option) => option.city === value) ?? options[0]
  const selectedTone = getMarketCityTone(selected?.city ?? value)
  const selectedBadge = selected
    ? badgePresentation(selected.badge, operation)
    : null

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 12
    const gap = 8
    const width = Math.min(
      Math.max(rect.width, 330),
      window.innerWidth - viewportPadding * 2,
      430,
    )
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    )
    const below = window.innerHeight - rect.bottom - viewportPadding
    const above = rect.top - viewportPadding
    const openAbove = below < 300 && above > below
    const maxHeight = Math.max(170, Math.min(420, (openAbove ? above : below) - gap))

    setMenuPosition(
      openAbove
        ? {
            left,
            width,
            maxHeight,
            bottom: window.innerHeight - rect.top + gap,
          }
        : { left, width, maxHeight, top: rect.bottom + gap },
    )
  }, [])

  useLayoutEffect(() => {
    if (isOpen) updateMenuPosition()
  }, [isOpen, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) return

    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

  return (
    <div className="mt-2 min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !isOpen) {
            event.preventDefault()
            setIsOpen(true)
          }
        }}
        className="flex min-h-16 w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
        style={{
          borderColor: isOpen ? selectedTone.foreground : selectedTone.border,
          background: isOpen
            ? selectedTone.background
            : selectedTone.softBackground,
        }}
      >
        <CityMark city={selected?.city ?? value} />
        <span className="min-w-0 flex-1">
          <span
            className="block truncate text-sm font-semibold"
            style={{ color: selectedTone.foreground }}
          >
            {selected?.marketName ?? value}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[10px] tabular text-text-muted">
            {selected?.rows.length
              ? selected.rows
                  .map((row) =>
                    row.value === null
                      ? `${row.label}: sin datos`
                      : `${row.label}: ${formatSilver(row.value)}`,
                  )
                  .join(' · ')
              : 'Sin precios disponibles'}
          </span>
        </span>
        {selected?.coverage !== 'complete' ? (
          <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-faint">
            {selected?.coverage === 'partial' ? 'Incompleto' : 'Sin datos'}
          </span>
        ) : selectedBadge ? (
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${selectedBadge.className}`}
          >
            {selectedBadge.label}
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className={`shrink-0 text-text-faint transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen &&
        menuPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="fixed z-[100] overflow-y-auto rounded-xl border border-border-strong bg-surface p-2 shadow-2xl"
            style={menuPosition}
          >
            <p className="px-2 pb-2 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
              {menuLabel}
            </p>
            {options.map((option) => {
              const tone = getMarketCityTone(option.city)
              const selectedOption = option.city === value
              const badge = badgePresentation(option.badge, operation)

              return (
                <button
                  key={option.city}
                  type="button"
                  role="option"
                  aria-selected={selectedOption}
                  onClick={() => {
                    onChange(option.city)
                    setIsOpen(false)
                    window.setTimeout(() => triggerRef.current?.focus(), 0)
                  }}
                  className="mb-1 flex w-full items-start gap-2 rounded-lg border border-transparent px-2 py-2.5 text-left outline-none transition-colors last:mb-0 hover:border-border-strong hover:bg-surface-raised focus-visible:border-accent-border focus-visible:bg-surface-raised"
                  style={
                    selectedOption
                      ? { borderColor: tone.border, background: tone.background }
                      : undefined
                  }
                >
                  <CityMark city={option.city} />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-xs font-semibold"
                      style={{ color: tone.foreground }}
                    >
                      {option.marketName}
                    </span>
                    <span className="mt-1 block space-y-0.5 font-mono text-[10px] tabular text-text-muted">
                      {option.rows.map((row) => (
                        <span key={row.label} className="flex justify-between gap-3">
                          <span className="truncate">{row.label}</span>
                          <span className="shrink-0 text-right">
                            {row.value === null
                              ? 'Sin precio disponible'
                              : `${formatSilver(row.value)} · ${formatMarketPriceRelativeAge(row.updatedAt)}`}
                          </span>
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {option.coverage !== 'complete' ? (
                      <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-text-faint">
                        {option.coverage === 'partial' ? 'Incompleto' : 'Sin datos'}
                      </span>
                    ) : badge ? (
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                    {selectedOption && (
                      <span className="text-xs" style={{ color: tone.foreground }}>
                        ✓
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
