export interface RectLike {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
  readonly width: number
  readonly height: number
}

interface SizeLike {
  readonly width: number
  readonly height: number
}

export interface TutorialPanelPosition extends SizeLike {
  readonly top: number
  readonly left: number
}

type Side = 'right' | 'bottom' | 'top' | 'left'

const MARGIN = 16
const GAP = 18
const TARGET_PADDING = 14
const PANEL_WIDTH = 432
const SIDES: readonly Side[] = ['right', 'bottom', 'top', 'left']

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

function box(left: number, top: number, width: number, height: number): RectLike {
  return { left, top, right: left + width, bottom: top + height, width, height }
}

export function tutorialRectanglesOverlap(a: RectLike, b: RectLike): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function candidate(
  left: number,
  top: number,
  width: number,
  height: number,
): TutorialPanelPosition {
  return { left, top, width, height }
}

function beside(
  side: Side,
  target: RectLike,
  panel: SizeLike,
  viewport: SizeLike,
  constrain: boolean,
): TutorialPanelPosition | null {
  let { width, height } = panel
  let left = MARGIN
  let top = MARGIN

  if (side === 'right' || side === 'left') {
    const available =
      side === 'right'
        ? viewport.width - MARGIN - target.right - GAP
        : target.left - GAP - MARGIN
    if (constrain) width = Math.min(width, available)
    if (width <= 0 || width > available) return null
    left = side === 'right' ? target.right + GAP : target.left - GAP - width
    top = clamp(
      target.top + target.height / 2 - height / 2,
      MARGIN,
      viewport.height - MARGIN - height,
    )
  } else {
    const available =
      side === 'bottom'
        ? viewport.height - MARGIN - target.bottom - GAP
        : target.top - GAP - MARGIN
    if (constrain) height = Math.min(height, available)
    if (height <= 0 || height > available) return null
    top = side === 'bottom' ? target.bottom + GAP : target.top - GAP - height
    left = clamp(
      target.left + target.width / 2 - width / 2,
      MARGIN,
      viewport.width - MARGIN - width,
    )
  }

  return candidate(left, top, width, height)
}

function overlapArea(panel: TutorialPanelPosition, target: RectLike): number {
  return (
    Math.max(
      0,
      Math.min(panel.left + panel.width, target.right) - Math.max(panel.left, target.left),
    ) *
    Math.max(
      0,
      Math.min(panel.top + panel.height, target.bottom) - Math.max(panel.top, target.top),
    )
  )
}

export function computeTutorialPanelPosition(
  targetRect: RectLike,
  panelSize: SizeLike,
  viewport: SizeLike,
): TutorialPanelPosition {
  const left = clamp(targetRect.left - TARGET_PADDING, 0, viewport.width)
  const top = clamp(targetRect.top - TARGET_PADDING, 0, viewport.height)
  const right = clamp(targetRect.right + TARGET_PADDING, 0, viewport.width)
  const bottom = clamp(targetRect.bottom + TARGET_PADDING, 0, viewport.height)
  const target = box(left, top, right - left, bottom - top)
  const panel = {
    width: Math.min(panelSize.width, viewport.width - MARGIN * 2),
    height: Math.min(panelSize.height, viewport.height - MARGIN * 2),
  }

  for (const side of SIDES) {
    const position = beside(side, target, panel, viewport, false)
    if (position) return position
  }

  const cornerPositions = [
    candidate(
      viewport.width - MARGIN - panel.width,
      viewport.height - MARGIN - panel.height,
      panel.width,
      panel.height,
    ),
    candidate(
      MARGIN,
      viewport.height - MARGIN - panel.height,
      panel.width,
      panel.height,
    ),
    candidate(
      viewport.width - MARGIN - panel.width,
      MARGIN,
      panel.width,
      panel.height,
    ),
    candidate(MARGIN, MARGIN, panel.width, panel.height),
  ]
  const freeCorner = cornerPositions.find(
    (position) =>
      !tutorialRectanglesOverlap(
        box(position.left, position.top, position.width, position.height),
        target,
      ),
  )
  if (freeCorner) return freeCorner

  const constrained = SIDES.map((side) => beside(side, target, panel, viewport, true))
    .filter((position): position is TutorialPanelPosition => position !== null)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0]
  if (constrained) return constrained

  return cornerPositions.toSorted(
    (a, b) => overlapArea(a, target) - overlapArea(b, target),
  )[0]!
}

function findPanel(): HTMLElement | null {
  const progress = document.querySelector<HTMLElement>(
    'aside[role="dialog"] [data-progress]',
  )
  return progress?.textContent?.trim().startsWith('Tutorial ·')
    ? progress.closest<HTMLElement>('aside')
    : null
}

function findTarget(): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>('[style*="outline"]')) {
    if (element.style.zIndex === '80' && element.style.outline.includes('3px solid')) {
      return element
    }
  }
  return null
}

function positionPanel(panel: HTMLElement, target: HTMLElement): void {
  const viewport = {
    width: document.documentElement.clientWidth,
    height: window.innerHeight,
  }
  const width = Math.min(PANEL_WIDTH, viewport.width - MARGIN * 2)
  const maxHeight = Math.min(viewport.height * 0.45, viewport.height - MARGIN * 2)
  Object.assign(panel.style, {
    right: 'auto',
    bottom: 'auto',
    width: `${width}px`,
    height: 'auto',
    maxHeight: `${maxHeight}px`,
  })
  const measured = panel.getBoundingClientRect()
  const position = computeTutorialPanelPosition(
    target.getBoundingClientRect(),
    measured,
    viewport,
  )
  Object.assign(panel.style, {
    left: `${Math.round(position.left)}px`,
    top: `${Math.round(position.top)}px`,
    width: `${Math.round(position.width)}px`,
    maxHeight: `${Math.round(position.height)}px`,
  })
}

export function installTutorialPanelCollisionGuard(): () => void {
  let frame = 0
  let panel: HTMLElement | null = null
  let target: HTMLElement | null = null
  const resizeObserver = new ResizeObserver(schedule)

  function update(): void {
    frame = 0
    const nextPanel = findPanel()
    const nextTarget = findTarget()
    if (!nextPanel || !nextTarget) return
    if (panel !== nextPanel || target !== nextTarget) {
      resizeObserver.disconnect()
      resizeObserver.observe(nextPanel)
      resizeObserver.observe(nextTarget)
      panel = nextPanel
      target = nextTarget
    }
    positionPanel(nextPanel, nextTarget)
  }

  function schedule(): void {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }

  const mutations = new MutationObserver(schedule)
  mutations.observe(document.body, { childList: true, subtree: true })
  addEventListener('resize', schedule)
  addEventListener('scroll', schedule, true)
  schedule()

  return () => {
    mutations.disconnect()
    resizeObserver.disconnect()
    cancelAnimationFrame(frame)
    removeEventListener('resize', schedule)
    removeEventListener('scroll', schedule, true)
  }
}
