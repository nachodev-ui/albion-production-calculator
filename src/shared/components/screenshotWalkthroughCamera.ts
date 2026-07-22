export interface ScreenshotCameraHighlightArea {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface ScreenshotCameraInput {
  readonly highlightArea: ScreenshotCameraHighlightArea
  readonly zoom?: number
}

export interface ScreenshotCameraTransform {
  readonly x: number
  readonly y: number
  readonly zoom: number
}

const MIN_FOREGROUND_COVERAGE = 80

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function getZoom(step: ScreenshotCameraInput): number {
  if (step.zoom) return step.zoom

  const largestDimension = Math.max(
    step.highlightArea.width,
    step.highlightArea.height,
  )

  return Math.min(1.7, Math.max(1.08, 56 / largestDimension))
}

export function calculateScreenshotCamera(
  step: ScreenshotCameraInput,
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
