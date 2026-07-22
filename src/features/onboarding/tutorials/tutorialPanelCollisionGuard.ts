export type TutorialPanelPlacement =
  | 'right'
  | 'bottom'
  | 'top'
  | 'left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'

export interface RectLike {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
  readonly width: number
  readonly height: number
}

export interface SizeLike {
  readonly width: number
  readonly height: number
}

export interface TutorialPanelPosition {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
  readonly placement: TutorialPanelPlacement
  readonly constrained: boolean
  readonly collisionFree: boolean
}

interface PositionOptions {
  readonly margin?: number
  readonly gap?: number
  readonly targetPadding?: number
  readonly minimumWidth?: number
  readonly minimumHeight?: number
}

interface Candidate extends TutorialPanelPosition {
  readonly score: number
}

const PANEL_SELECTOR = 'aside[role="dialog"]'
const DEFAULT_MARGIN = 16
const DEFAULT_GAP = 18
const DEFAULT_TARGET_PADDING = 14
const DEFAULT_MINIMUM_WIDTH = 240
const DEFAULT_MINIMUM_HEIGHT = 144
const PREFERRED_WIDTH = 432
const MAX_HEIGHT_RATIO = 0.45
const PREFERRED_PLACEMENTS: readonly TutorialPanelPlacement[] = [
  'right',
  'bottom',
  'top',
  'left',
]
const CORNER_PLACEMENTS: readonly TutorialPanelPlacement[] = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
]

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

function toRect(
  left: number,
  top: number,
  width: number,
  height: number,
): RectLike {
  return {
    top,
    right: left + width,
    bottom: top + height,
    left,
    width,
    height,
  }
}

export function tutorialRectanglesOverlap(a: RectLike, b: RectLike): boolean {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  )
}

function overlapArea(a: RectLike, b: RectLike): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return width * height
}

function insideViewport(rect: RectLike, viewport: SizeLike, margin: number): boolean {
  return (
    rect.left >= margin &&
    rect.top >= margin &&
    rect.right <= viewport.width - margin &&
    rect.bottom <= viewport.height - margin
  )
}

function visibleTargetRect(
  target: RectLike,
  viewport: SizeLike,
  padding: number,
): RectLike {
  const left = clamp(target.left - padding, 0, viewport.width)
  const top = clamp(target.top - padding, 0, viewport.height)
  const right = clamp(target.right + padding, 0, viewport.width)
  const bottom = clamp(target.bottom + padding, 0, viewport.height)
  return toRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top))
}

function createCandidate(
  placement: TutorialPanelPlacement,
  left: number,
  top: number,
  width: number,
  height: number,
  target: RectLike,
  viewport: SizeLike,
  margin: number,
  constrained: boolean,
  score: number,
): Candidate {
  const rect = toRect(left, top, width, height)
  return {
    top,
    left,
    width,
    height,
    placement,
    constrained,
    collisionFree:
      insideViewport(rect, viewport, margin) &&
      !tutorialRectanglesOverlap(rect, target),
    score,
  }
}

function sideCandidate(
  placement: TutorialPanelPlacement,
  target: RectLike,
  panel: SizeLike,
  viewport: SizeLike,
  margin: number,
  gap: number,
  constrained: boolean,
): Candidate | null {
  const available = {
    right: Math.max(0, viewport.width - margin - (target.right + gap)),
    bottom: Math.max(0, viewport.height - margin - (target.bottom + gap)),
    top: Math.max(0, target.top - gap - margin),
    left: Math.max(0, target.left - gap - margin),
  }

  let width = panel.width
  let height = panel.height
  let left = margin
  let top = margin

  if (placement === 'right' || placement === 'left') {
    if (constrained) width = Math.min(width, available[placement])
    if (width > available[placement] || width <= 0) return null
    top = clamp(
      target.top + target.height / 2 - height / 2,
      margin,
      viewport.height - margin - height,
    )
    left = placement === 'right' ? target.right + gap : target.left - gap - width
  } else if (placement === 'bottom' || placement === 'top') {
    if (constrained) height = Math.min(height, available[placement])
    if (height > available[placement] || height <= 0) return null
    left = clamp(
      target.left + target.width / 2 - width / 2,
      margin,
      viewport.width - margin - width,
    )
    top = placement === 'bottom' ? target.bottom + gap : target.top - gap - height
  } else {
    return null
  }

  const preservation = (width / panel.width) * (height / panel.height)
  return createCandidate(
    placement,
    left,
    top,
    width,
    height,
    target,
    viewport,
    margin,
    constrained,
    preservation,
  )
}

function cornerCandidate(
  placement: TutorialPanelPlacement,
  target: RectLike,
  panel: SizeLike,
  viewport: SizeLike,
  margin: number,
): Candidate {
  const left = placement.endsWith('right')
    ? viewport.width - margin - panel.width
    : margin
  const top = placement.startsWith('bottom')
    ? viewport.height - margin - panel.height
    : margin
  const panelCenterX = left + panel.width / 2
  const panelCenterY = top + panel.height / 2
  const targetCenterX = target.left + target.width / 2
  const targetCenterY = target.top + target.height / 2
  const distance = (panelCenterX - targetCenterX) ** 2 + (panelCenterY - targetCenterY) ** 2
  return createCandidate(
    placement,
    left,
    top,
    panel.width,
    panel.height,
    target,
    viewport,
    margin,
    false,
    distance,
  )
}

export function computeTutorialPanelPosition(
  targetRect: RectLike,
  panelSize: SizeLike,
  viewport: SizeLike,
  options: PositionOptions = {},
): TutorialPanelPosition {
  const margin = options.margin ?? DEFAULT_MARGIN
  const gap = options.gap ?? DEFAULT_GAP
  const targetPadding = options.targetPadding ?? DEFAULT_TARGET_PADDING
  const minimumWidth = Math.min(
    options.minimumWidth ?? DEFAULT_MINIMUM_WIDTH,
    Math.max(1, viewport.width - margin * 2),
  )
  const minimumHeight = Math.min(
    options.minimumHeight ?? DEFAULT_MINIMUM_HEIGHT,
    Math.max(1, viewport.height - margin * 2),
  )
  const panel = {
    width: Math.min(panelSize.width, Math.max(1, viewport.width - margin * 2)),
    height: Math.min(panelSize.height, Math.max(1, viewport.height - margin * 2)),
  }
  const target = visibleTargetRect(targetRect, viewport, targetPadding)

  for (const placement of PREFERRED_PLACEMENTS) {
    const candidate = sideCandidate(
      placement,
      target,
      panel,
      viewport,
      margin,
      gap,
      false,
    )
    if (candidate?.collisionFree) return candidate
  }

  const cornerCandidates = CORNER_PLACEMENTS.map((placement) =>
    cornerCandidate(placement, target, panel, viewport, margin),
  ).sort((a, b) => b.score - a.score)
  const collisionFreeCorner = cornerCandidates.find((candidate) => candidate.collisionFree)
  if (collisionFreeCorner) return collisionFreeCorner

  const constrainedCandidates = PREFERRED_PLACEMENTS.map((placement) =>
    sideCandidate(
      placement,
      target,
      panel,
      viewport,
      margin,
      gap,
      true,
    ),
  )
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((a, b) => {
      const aMeetsMinimum = a.width >= minimumWidth && a.height >= minimumHeight
      const bMeetsMinimum = b.width >= minimumWidth && b.height >= minimumHeight
      if (aMeetsMinimum !== bMeetsMinimum) return aMeetsMinimum ? -1 : 1
      return b.score - a.score
    })
  const collisionFreeConstrained = constrainedCandidates.find(
    (candidate) => candidate.collisionFree,
  )
  if (collisionFreeConstrained) return collisionFreeConstrained

  return cornerCandidates
    .map((candidate) => ({
      ...candidate,
      score: -overlapArea(
        toRect(candidate.left, candidate.top, candidate.width, candidate.height),
        target,
      ),
    }))
    .sort((a, b) => b.score - a.score)[0]!
}

function isTutorialPanel(element: HTMLElement): boolean {
  const progress = element.querySelector<HTMLElement>('[data-progress]')
  return progress?.textContent?.trim().startsWith('Tutorial ·') ?? false
}

function findTutorialPanel(): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>(PANEL_SELECTOR)].find(isTutorialPanel) ??
    null
  )
}

function findHighlightedTarget(): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>('[style*="outline"]')].find(
      (element) =>
        element.style.zIndex === '80' &&
        element.style.outline.includes('3px') &&
        element.style.outline.includes('solid'),
    ) ?? null
  )
}

function viewportSize(): SizeLike {
  return {
    width: document.documentElement.clientWidth,
    height: window.innerHeight,
  }
}

function positionTutorialPanel(panel: HTMLElement, target: HTMLElement): void {
  const viewport = viewportSize()
  const naturalWidth = Math.min(PREFERRED_WIDTH, Math.max(1, viewport.width - 32))
  const naturalMaxHeight = Math.min(
    Math.max(1, Math.round(viewport.height * MAX_HEIGHT_RATIO)),
    Math.max(1, viewport.height - 32),
  )

  panel.style.right = 'auto'
  panel.style.bottom = 'auto'
  panel.style.width = `${naturalWidth}px`
  panel.style.height = 'auto'
  panel.style.maxHeight = `${naturalMaxHeight}px`

  const panelRect = panel.getBoundingClientRect()
  const position = computeTutorialPanelPosition(
    target.getBoundingClientRect(),
    { width: naturalWidth, height: panelRect.height },
    viewport,
  )

  panel.style.left = `${Math.round(position.left)}px`
  panel.style.top = `${Math.round(position.top)}px`
  panel.style.width = `${Math.round(position.width)}px`
  panel.style.maxHeight = `${Math.round(position.height)}px`
  panel.dataset['tutorialPlacement'] = position.placement
  panel.dataset['tutorialCollisionFree'] = String(position.collisionFree)
}

export function installTutorialPanelCollisionGuard(): () => void {
  let frame: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let observedPanel: HTMLElement | null = null
  let observedTarget: HTMLElement | null = null

  const observeCurrentElements = (panel: HTMLElement, target: HTMLElement) => {
    if (observedPanel === panel && observedTarget === target) return
    resizeObserver?.disconnect()
    observedPanel = panel
    observedTarget = target
    resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(panel)
    resizeObserver.observe(target)
  }

  const update = () => {
    frame = null
    const panel = findTutorialPanel()
    const target = findHighlightedTarget()
    if (!panel || !target) {
      resizeObserver?.disconnect()
      resizeObserver = null
      observedPanel = null
      observedTarget = null
      return
    }
    observeCurrentElements(panel, target)
    positionTutorialPanel(panel, target)
  }

  function schedule(): void {
    if (frame !== null) window.cancelAnimationFrame(frame)
    frame = window.requestAnimationFrame(update)
  }

  const mutationObserver = new MutationObserver((records) => {
    const onlyPanelStyleChanges = records.every(
      (record) =>
        record.type === 'attributes' &&
        observedPanel !== null &&
        record.target === observedPanel,
    )
    if (!onlyPanelStyleChanges) schedule()
  })
  mutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    childList: true,
    subtree: true,
  })
  window.addEventListener('resize', schedule)
  window.addEventListener('scroll', schedule, true)
  schedule()

  return () => {
    mutationObserver.disconnect()
    resizeObserver?.disconnect()
    if (frame !== null) window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('scroll', schedule, true)
  }
}
