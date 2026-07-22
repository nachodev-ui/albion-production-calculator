import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
} from 'framer-motion'

export interface ScreenshotHighlightArea {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface ScreenshotWalkthroughStep {
  readonly image: string
  readonly highlightArea: ScreenshotHighlightArea
  readonly caption: string
  readonly title?: string
  readonly alt?: string
  readonly aspectRatio?: number
  readonly zoom?: number
  readonly maxWidth?: number
}

interface ScreenshotWalkthroughProps {
  readonly steps: readonly ScreenshotWalkthroughStep[]
  readonly intervalMs?: number
  readonly autoPlay?: boolean
  readonly className?: string
}

export interface ScreenshotCameraTransform {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

const DEFAULT_INTERVAL_MS = 6500
const MIN_FOREGROUND_COVERAGE = 80

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function wrapIndex(index: number, length: number): number {
  return ((index % length) + length) % length
}

function getZoom(step: ScreenshotWalkthroughStep): number {
  if (step.zoom) return step.zoom

  const largestDimension = Math.max(
    step.highlightArea.width,
    step.highlightArea.height,
  )

  return Math.min(1.7, Math.max(1.08, 56 / largestDimension))
}

export function calculateScreenshotCamera(
  step: ScreenshotWalkthroughStep,
): ScreenshotCameraTransform {
  const zoom = getZoom(step)
  const centerX = step.highlightArea.x + step.highlightArea.width / 2
  const centerY = step.highlightArea.y + step.highlightArea.height / 2
  const minimumTranslation = MIN_FOREGROUND_COVERAGE - 100 * zoom
  const maximumTranslation = 100 - MIN_FOREGROUND_COVERAGE

  return {
    x: clamp(50 - centerX * zoom, minimumTranslation, maximumTranslation),
    y: clamp(50 - centerY * zoom, minimumTranslation, maximumTranslation),
    zoom,
  }
}

export function ScreenshotWalkthrough({
  steps,
  intervalMs = DEFAULT_INTERVAL_MS,
  autoPlay = true,
  className = '',
}: ScreenshotWalkthroughProps) {
  const reduceMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [cycleVersion, setCycleVersion] = useState(0)

  const activeStep = steps[activeIndex] ?? steps[0]

  const goTo = useCallback(
    (nextIndex: number) => {
      if (steps.length === 0) return
      setDirection(nextIndex >= activeIndex ? 1 : -1)
      setActiveIndex(wrapIndex(nextIndex, steps.length))
      setCycleVersion((current) => current + 1)
    },
    [activeIndex, steps.length],
  )

  const goRelative = useCallback(
    (offset: number) => {
      if (steps.length === 0) return
      setDirection(offset >= 0 ? 1 : -1)
      setActiveIndex((current) => wrapIndex(current + offset, steps.length))
      setCycleVersion((current) => current + 1)
    },
    [steps.length],
  )

  useEffect(() => {
    if (!isPlaying || steps.length < 2) return

    const interval = window.setInterval(() => {
      setDirection(1)
      setActiveIndex((current) => wrapIndex(current + 1, steps.length))
    }, Math.max(3000, intervalMs))

    return () => window.clearInterval(interval)
  }, [cycleVersion, intervalMs, isPlaying, steps.length])

  useEffect(() => {
    for (const step of steps) {
      const image = new Image()
      image.src = step.image
    }
  }, [steps])

  const camera = useMemo(
    () => (activeStep ? calculateScreenshotCamera(activeStep) : null),
    [activeStep],
  )

  if (!activeStep || !camera) return null

  const aspectRatio = activeStep.aspectRatio ?? 16 / 9
  const maxWidth = activeStep.maxWidth ?? 520
  const cameraTarget = {
    x: `${camera.x}%`,
    y: `${camera.y}%`,
    scale: camera.zoom,
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <section
        aria-label="Recorrido visual paso a paso"
        className={`rounded-xl border border-border bg-surface p-3 ${className}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') goRelative(-1)
          if (event.key === 'ArrowRight') goRelative(1)
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Especialización y foco
            </p>
            <p className="mt-0.5 text-[11px] text-text-faint">
              Paso {activeIndex + 1} de {steps.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying((current) => !current)}
            className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-text-muted transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            aria-label={isPlaying ? 'Pausar recorrido' : 'Reanudar recorrido'}
          >
            {isPlaying ? 'Pausar' : 'Reanudar'}
          </button>
        </div>

        <m.div
          layout
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeOut' }}
          className="relative mx-auto w-full overflow-hidden rounded-lg border border-border bg-black/40"
          style={{ aspectRatio, maxWidth }}
        >
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <m.div
              key={`${activeIndex}-${activeStep.image}`}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <img
                src={activeStep.image}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-md"
                draggable={false}
              />

              <m.div
                initial={
                  reduceMotion
                    ? cameraTarget
                    : { x: '0%', y: '0%', scale: 1, opacity: 0.88 }
                }
                animate={{ ...cameraTarget, opacity: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute inset-0 will-change-transform"
                style={{ transformOrigin: '0 0' }}
              >
                <img
                  src={activeStep.image}
                  alt={activeStep.alt ?? activeStep.caption}
                  className="block h-full w-full object-contain"
                  draggable={false}
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-md border-2 border-amber-300 bg-amber-300/10"
                  style={{
                    left: `${activeStep.highlightArea.x}%`,
                    top: `${activeStep.highlightArea.y}%`,
                    width: `${activeStep.highlightArea.width}%`,
                    height: `${activeStep.highlightArea.height}%`,
                    boxShadow:
                      '0 0 0 9999px rgb(20 14 8 / 0.58), 0 0 0 2px rgb(245 190 64 / 0.8)',
                  }}
                >
                  <m.span
                    className="absolute -inset-1 rounded-md border-2 border-amber-200"
                    animate={
                      reduceMotion
                        ? { opacity: 1 }
                        : {
                            opacity: [0.4, 1, 0.4],
                            scale: [1, 1.035, 1],
                          }
                    }
                    transition={{
                      duration: 1.35,
                      repeat: reduceMotion ? 0 : Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                  />
                </div>
              </m.div>
            </m.div>
          </AnimatePresence>
        </m.div>

        <div className="mt-3 min-h-[92px]">
          <AnimatePresence initial={false} mode="wait">
            <m.div
              key={`caption-${activeIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.24 }}
              aria-live="polite"
              className="rounded-lg border border-accent-border bg-accent-muted px-3 py-2.5"
            >
              {activeStep.title && (
                <p className="font-semibold text-text">{activeStep.title}</p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {activeStep.caption}
              </p>
            </m.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goRelative(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-base text-text transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            aria-label="Paso anterior"
          >
            ←
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {steps.map((step, index) => (
              <button
                key={`${step.image}-${index}`}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${
                  index === activeIndex
                    ? 'w-6 bg-accent'
                    : 'w-2 bg-border-strong hover:bg-text-faint'
                }`}
                aria-label={`Ir al paso ${index + 1}`}
                aria-current={index === activeIndex ? 'step' : undefined}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goRelative(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-base text-text transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            aria-label="Paso siguiente"
          >
            →
          </button>
        </div>
      </section>
    </LazyMotion>
  )
}
