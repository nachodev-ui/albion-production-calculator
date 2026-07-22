import { describe, expect, it } from 'vitest'
import {
  calculateScreenshotCamera,
  type ScreenshotWalkthroughStep,
} from './ScreenshotWalkthrough'

function step(
  highlightArea: ScreenshotWalkthroughStep['highlightArea'],
  zoom: number,
): ScreenshotWalkthroughStep {
  return {
    image: '/example.png',
    caption: 'Example',
    highlightArea,
    zoom,
  }
}

describe('calculateScreenshotCamera', () => {
  it('centers a middle highlight at the requested zoom', () => {
    expect(
      calculateScreenshotCamera(
        step({ x: 40, y: 40, width: 20, height: 20 }, 1.4),
      ),
    ).toEqual({ x: -20, y: -20, zoom: 1.4 })
  })

  it('keeps enough foreground visible for controls near an edge', () => {
    const camera = calculateScreenshotCamera(
      step({ x: 88, y: 30, width: 10, height: 12 }, 1.3),
    )

    expect(camera.x).toBe(-50)
    expect(camera.y).toBeCloseTo(3.2)
    expect(camera.zoom).toBe(1.3)
  })
})
