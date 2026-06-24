import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type {
  MarketCityId,
  MarketDefinition,
  MaterialMarketPriceOption,
} from '../types/MarketPrice'
import {
  MATERIAL_PRICE_BADGE_PRESENTATION,
  MISSING_PRICE_BADGE_PRESENTATION,
  getMarketCityTone,
} from '../presentation/marketCityPresentation'

interface MaterialMarketCitySelectProps {
  readonly value: MarketCityId | null
  readonly defaultCity: MarketCityId
  readonly markets: readonly MarketDefinition[]
  readonly comparisons: readonly MaterialMarketPriceOption[]
  readonly ariaLabel: string
  readonly onChange: (city: MarketCityId | null) => void
}

interface FloatingMenuPosition {
  readonly left: number
  readonly width: number
  readonly maxHeight: number
  readonly top?: number
  readonly bottom?: number
}

interface MarketSelectOption {
  readonly key: string
  readonly value: MarketCityId | null
  readonly city: MarketCityId
  readonly marketName: string
  readonly isDefault: boolean
  readonly comparison: MaterialMarketPriceOption | undefined
}

function formatSilver(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: 1,
  }).format(amount)
}

function getPriceText(option: MaterialMarketPriceOption | undefined): string {
  if (!option || option.value === null) return 'Sin precio disponible'
  return `${formatSilver(option.value)} plata`
}

function PriceBadge({
  option,
}: {
  readonly option: MaterialMarketPriceOption | undefined
}) {
  const presentation =
    !option || option.value === null
      ? MISSING_PRICE_BADGE_PRESENTATION
      : option.badge
        ? MATERIAL_PRICE_BADGE_PRESENTATION[option.badge]
        : null

  if (!presentation) return null

  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${presentation.className}`}
    >
      {presentation.label}
    </span>
  )
}

function CityMark({ city }: { readonly city: MarketCityId }) {
  const tone = getMarketCityTone(city)

  return (
    <span
      aria-hidden="true"
      className="h-7 w-1 shrink-0 rounded-full"
      style={{ background: tone.foreground }}
    />
  )
}

export function MaterialMarketCitySelect({
  value,
  defaultCity,
  markets,
  comparisons,
  ariaLabel,
  onChange,
}: MaterialMarketCitySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] =
    useState<FloatingMenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selectedCity = value ?? defaultCity
  const selectedMarket = markets.find(
    (market) => market.key === selectedCity,
  )
  const selectedComparison = comparisons.find(
    (option) => option.city === selectedCity,
  )
  const selectedTone = getMarketCityTone(selectedCity)

  const options: readonly MarketSelectOption[] = [
    {
      key: 'default',
      value: null,
      city: defaultCity,
      marketName:
        markets.find((market) => market.key === defaultCity)?.name ??
        defaultCity,
      isDefault: true,
      comparison: comparisons.find(
        (option) => option.city === defaultCity,
      ),
    },
    ...markets.map((market) => ({
      key: market.key,
      value: market.key,
      city: market.key,
      marketName: market.name,
      isDefault: false,
      comparison: comparisons.find(
        (option) => option.city === market.key,
      ),
    })),
  ]

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 12
    const menuGap = 8
    const minimumWidth = 306
    const maximumWidth = 380
    const width = Math.min(
      Math.max(rect.width, minimumWidth),
      window.innerWidth - viewportPadding * 2,
      maximumWidth,
    )
    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding,
    )
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
    const spaceAbove = rect.top - viewportPadding
    const openAbove = spaceBelow < 250 && spaceAbove > spaceBelow
    const availableSpace = openAbove ? spaceAbove : spaceBelow
    const maxHeight = Math.max(150, Math.min(360, availableSpace - menuGap))

    setMenuPosition(
      openAbove
        ? {
            left,
            width,
            maxHeight,
            bottom: window.innerHeight - rect.top + menuGap,
          }
        : {
            left,
            width,
            maxHeight,
            top: rect.bottom + menuGap,
          },
    )
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    updateMenuPosition()
  }, [isOpen, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) return

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target as Node

      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    const focusTimer = window.setTimeout(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

  function selectOption(city: MarketCityId | null) {
    onChange(city)
    setIsOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  return (
    <div className="min-w-0 flex-1">
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
        className="flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left outline-none transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent-border"
        style={{
          borderColor: isOpen
            ? selectedTone.foreground
            : selectedTone.border,
          background: isOpen
            ? selectedTone.background
            : selectedTone.softBackground,
        }}
      >
        <CityMark city={selectedCity} />

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            {value === null && (
              <span className="shrink-0 rounded border border-border bg-surface px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-faint">
                Base
              </span>
            )}
            <span
              className="truncate text-xs font-semibold"
              style={{ color: selectedTone.foreground }}
            >
              {selectedMarket?.name ?? selectedCity}
            </span>
          </span>

          <span className="mt-0.5 block truncate font-mono text-[10px] tabular text-text-muted">
            {getPriceText(selectedComparison)}
          </span>
        </span>

        <PriceBadge option={selectedComparison} />

        <span
          aria-hidden="true"
          className={`shrink-0 text-text-faint transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg
            width="14"
            height="14"
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
            <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-faint">
              Ciudad de compra
            </p>

            {options.map((option, index) => {
              const isSelected =
                option.value === null ? value === null : value === option.value
              const tone = getMarketCityTone(option.city)

              return (
                <div key={option.key}>
                  {index === 1 && (
                    <div className="my-1.5 border-t border-border" />
                  )}

                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(option.value)}
                    className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left outline-none transition-colors hover:border-border-strong hover:bg-surface-raised focus-visible:border-accent-border focus-visible:bg-surface-raised"
                    style={
                      isSelected
                        ? {
                            borderColor: tone.border,
                            background: tone.background,
                          }
                        : undefined
                    }
                  >
                    <CityMark city={option.city} />

                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {option.isDefault && (
                          <span className="shrink-0 rounded border border-border bg-surface px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-faint">
                            Base
                          </span>
                        )}
                        <span
                          className="truncate text-xs font-semibold"
                          style={{ color: tone.foreground }}
                        >
                          {option.marketName}
                        </span>
                      </span>

                      <span className="mt-0.5 block truncate font-mono text-[10px] tabular text-text-muted">
                        {getPriceText(option.comparison)}
                      </span>
                    </span>

                    <PriceBadge option={option.comparison} />

                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xs"
                        style={{ color: tone.foreground }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
