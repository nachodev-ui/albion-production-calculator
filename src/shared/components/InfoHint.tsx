import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

interface InfoHintProps {
  readonly label: string
  readonly text: string
  readonly align?: 'left' | 'center' | 'right'
}

interface TooltipPosition {
  readonly top: number
  readonly left: number
}

const TOOLTIP_WIDTH = 256
const VIEWPORT_MARGIN = 12
const TOOLTIP_GAP = 8

export function InfoHint({
  label,
  text,
  align = 'center',
}: InfoHintProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
  })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()

  const updatePosition = useCallback(() => {
    const button = buttonRef.current
    const tooltip = tooltipRef.current

    if (!button) return

    const buttonRect = button.getBoundingClientRect()
    const tooltipHeight = tooltip?.offsetHeight ?? 0

    let left: number

    switch (align) {
      case 'left':
        left = buttonRect.left
        break

      case 'right':
        left = buttonRect.right - TOOLTIP_WIDTH
        break

      default:
        left =
          buttonRect.left +
          buttonRect.width / 2 -
          TOOLTIP_WIDTH / 2
        break
    }

    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(
        left,
        window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
      ),
    )

    let top = buttonRect.bottom + TOOLTIP_GAP

    const wouldOverflowBottom =
      tooltipHeight > 0 &&
      top + tooltipHeight > window.innerHeight - VIEWPORT_MARGIN

    if (wouldOverflowBottom) {
      top = buttonRect.top - tooltipHeight - TOOLTIP_GAP
    }

    top = Math.max(VIEWPORT_MARGIN, top)

    setPosition({ top, left })
  }, [align])

  useLayoutEffect(() => {
    if (!isOpen) return

    updatePosition()

    const animationFrame = window.requestAnimationFrame(updatePosition)

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [isOpen, text, updatePosition])

  useEffect(() => {
    if (!isOpen) return

    function handleOutsideClick(event: PointerEvent) {
      const target = event.target as Node

      if (
        buttonRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return
      }

      setIsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, updatePosition])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Información sobre ${label}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold leading-none text-text-faint transition-colors hover:border-border-strong hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      >
        i
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              width: TOOLTIP_WIDTH,
            }}
            className="z-[9999] rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-left text-xs font-normal leading-relaxed text-text-muted shadow-xl"
          >
            <p className="mb-1 font-medium text-text">
              {label}
            </p>

            <p>{text}</p>
          </div>,
          document.body,
        )}
    </>
  )
}