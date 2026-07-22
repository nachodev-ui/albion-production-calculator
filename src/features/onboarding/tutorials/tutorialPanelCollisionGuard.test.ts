import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  computeTutorialPanelPosition,
  tutorialRectanglesOverlap,
  type RectLike,
} from './tutorialPanelCollisionGuard'

const tutorialSource = readFileSync(
  new URL('./guidedTutorial.ts', import.meta.url),
  'utf8',
)
const declaredSteps = [...tutorialSource.matchAll(/target: '([^']+)'/g)].map(
  ([, target], index) => `${index + 1}:${target ?? 'unknown'}`,
)

const scenarios: readonly {
  readonly name: string
  readonly viewport: { readonly width: number; readonly height: number }
  readonly target: RectLike
  readonly panel: { readonly width: number; readonly height: number }
}[] = [
  {
    name: 'desktop quantity input near the upper-right edge',
    viewport: { width: 1650, height: 900 },
    target: {
      left: 1398,
      top: 342,
      right: 1564,
      bottom: 409,
      width: 166,
      height: 67,
    },
    panel: { width: 432, height: 290 },
  },
  {
    name: 'desktop target in the center',
    viewport: { width: 1440, height: 900 },
    target: {
      left: 620,
      top: 390,
      right: 820,
      bottom: 510,
      width: 200,
      height: 120,
    },
    panel: { width: 432, height: 300 },
  },
  {
    name: 'desktop target close to the bottom edge',
    viewport: { width: 1366, height: 768 },
    target: {
      left: 520,
      top: 650,
      right: 846,
      bottom: 730,
      width: 326,
      height: 80,
    },
    panel: { width: 432, height: 280 },
  },
  {
    name: 'desktop target close to the left edge',
    viewport: { width: 1280, height: 720 },
    target: {
      left: 18,
      top: 260,
      right: 320,
      bottom: 420,
      width: 302,
      height: 160,
    },
    panel: { width: 432, height: 280 },
  },
  {
    name: 'tablet layout',
    viewport: { width: 820, height: 1180 },
    target: {
      left: 560,
      top: 180,
      right: 780,
      bottom: 260,
      width: 220,
      height: 80,
    },
    panel: { width: 432, height: 330 },
  },
  {
    name: 'mobile layout with a wide target',
    viewport: { width: 390, height: 844 },
    target: {
      left: 20,
      top: 270,
      right: 370,
      bottom: 340,
      width: 350,
      height: 70,
    },
    panel: { width: 358, height: 340 },
  },
  {
    name: 'compact viewport requiring a constrained fallback',
    viewport: { width: 760, height: 560 },
    target: {
      left: 292,
      top: 210,
      right: 468,
      bottom: 350,
      width: 176,
      height: 140,
    },
    panel: { width: 432, height: 280 },
  },
]

function panelRect(
  position: ReturnType<typeof computeTutorialPanelPosition>,
): RectLike {
  return {
    left: position.left,
    top: position.top,
    right: position.left + position.width,
    bottom: position.top + position.height,
    width: position.width,
    height: position.height,
  }
}

describe('tutorial panel collision guard', () => {
  it('discovers every currently declared guided tutorial step', () => {
    expect(declaredSteps.length).toBeGreaterThan(0)
  })

  it('keeps the panel inside the viewport and outside the highlighted area for every step', () => {
    const failures: string[] = []

    for (const step of declaredSteps) {
      for (const scenario of scenarios) {
        const position = computeTutorialPanelPosition(
          scenario.target,
          scenario.panel,
          scenario.viewport,
        )
        const rect = panelRect(position)
        const outsideViewport =
          rect.left < 16 ||
          rect.top < 16 ||
          rect.right > scenario.viewport.width - 16 ||
          rect.bottom > scenario.viewport.height - 16
        const overlaps = tutorialRectanglesOverlap(rect, scenario.target)

        if (!position.collisionFree || outsideViewport || overlaps) {
          failures.push(
            `${step} / ${scenario.name}: ${JSON.stringify({
              position,
              outsideViewport,
              overlaps,
            })}`,
          )
        }
      }
    }

    expect(failures).toEqual([])
  })
})
