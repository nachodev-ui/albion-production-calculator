import { Suspense, lazy } from 'react'
import { InfoHint } from '@shared/components/InfoHint'
import type { ScreenshotWalkthroughStep } from '@shared/components/ScreenshotWalkthrough'

interface DestinyBoardSpecializationHintProps {
  readonly align?: 'left' | 'center' | 'right'
}

const ScreenshotWalkthrough = lazy(async () => {
  const module = await import('@shared/components/ScreenshotWalkthrough')
  return { default: module.ScreenshotWalkthrough }
})

const DESTINY_BOARD_STEPS: readonly ScreenshotWalkthroughStep[] = [
  {
    image: '/assets/ui/destiny-board/destiny-board-open.png',
    aspectRatio: 400 / 200,
    maxWidth: 400,
    zoom: 1.22,
    highlightArea: { x: 92.5, y: 27, width: 6.5, height: 17 },
    title: '1. Abre el Destiny Board',
    caption:
      'Presiona B dentro del juego. El recuadro marca exactamente el icono del Destiny Board en el menú derecho; ambos accesos abren la misma tabla.',
    alt: 'Captura real de Albion Online con el icono del Destiny Board resaltado',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-general-node.png',
    aspectRatio: 280 / 311,
    maxWidth: 280,
    zoom: 1.12,
    highlightArea: { x: 2.2, y: 0.7, width: 53.8, height: 17.2 },
    title: '2. Identifica el nodo general',
    caption:
      'Primero abre el nodo de la familia, como Spear Crafter. El nombre no lleva el objeto específico: sus bonos se aplican a todas las lanzas de esa rama.',
    alt: 'Nodo general Spear Crafter resaltado en una captura real del Destiny Board',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-general-node.png',
    aspectRatio: 280 / 311,
    maxWidth: 280,
    zoom: 1.18,
    highlightArea: { x: 56.5, y: 6.6, width: 42.7, height: 19.8 },
    title: '3. Anota los bonos generales',
    caption:
      'En Rewards Summary anota las líneas de Focus Cost Efficiency e Increase in Quality que indican “while crafting all”. En este ejemplo son +420 y +10,5 para todas las lanzas.',
    alt: 'Bonos generales de eficiencia de foco y calidad resaltados en Spear Crafter',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-specific-node.png',
    aspectRatio: 280 / 311,
    maxWidth: 280,
    zoom: 1.12,
    highlightArea: { x: 2.2, y: 0.7, width: 54.5, height: 17.5 },
    title: '4. Abre el nodo específico',
    caption:
      'Después abre el especialista que lleva el nombre exacto del objeto, como Spear Crafting Specialist. Este nodo es distinto del general y añade bonos propios.',
    alt: 'Nodo específico Spear Crafting Specialist resaltado',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-specific-node.png',
    aspectRatio: 280 / 311,
    maxWidth: 280,
    zoom: 1.16,
    highlightArea: { x: 56.5, y: 6.5, width: 42.7, height: 28.5 },
    title: '5. Suma todos los bonos equivalentes',
    caption:
      'Anota cada línea equivalente del especialista y súmala a las del nodo general. En el ejemplo: foco 420 + 150 + 1.250 = 1.820; calidad 10,5 + 3,75 + 30 = 44,25. Escribe esos totales en la calculadora, no el nivel del nodo.',
    alt: 'Bonos del especialista resaltados para sumarlos con los del nodo general',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-progress.png',
    aspectRatio: 240 / 90,
    maxWidth: 240,
    zoom: 1.05,
    highlightArea: { x: 1.5, y: 61.5, width: 97, height: 33 },
    title: '6. Completa la proyección de especialización',
    caption:
      'La insignia izquierda indica el nivel actual (5/100). En la barra, 18.302 es el progreso dentro del nivel y 34.340 la fama requerida. El nivel objetivo lo eliges tú en la calculadora.',
    alt: 'Barra de progreso con nivel actual, fama acumulada y fama requerida resaltados',
  },
]

export function DestinyBoardSpecializationHint({
  align = 'left',
}: DestinyBoardSpecializationHintProps) {
  return (
    <InfoHint
      label="Guía visual de especialización y foco"
      align={align}
      width={660}
      trigger={
        <>
          <span aria-hidden="true" className="text-[8px]">
            ▶
          </span>
          <span>Guía visual</span>
        </>
      }
      triggerClassName="inline-flex h-5 items-center gap-1 rounded-full border border-border bg-surface px-1.5 text-[10px] font-medium text-text-faint transition-colors hover:border-accent-border hover:bg-accent-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      tooltipClassName="overflow-hidden p-0"
      content={
        <div>
          <div className="border-b border-border bg-surface px-3.5 py-3">
            <p className="font-medium text-text">
              Cómo obtener especialización y eficiencia de foco
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Recorrido sobre capturas reales y sin recortes automáticos: acceso,
              nodo general, bonos generales, especialista, suma y proyección.
            </p>
          </div>

          <div className="bg-surface-raised p-3">
            <Suspense
              fallback={
                <div className="flex min-h-52 items-center justify-center rounded-xl border border-border bg-surface px-4 text-xs text-text-faint">
                  Preparando recorrido visual…
                </div>
              }
            >
              <ScreenshotWalkthrough
                steps={DESTINY_BOARD_STEPS}
                intervalMs={8500}
              />
            </Suspense>

            <p className="mt-2 rounded-md border border-warning/35 bg-warning-muted px-2.5 py-2 text-[11px] text-warning">
              «Focus Cost Efficiency» reduce el foco consumido. «Increase in
              Quality» mejora la probabilidad de calidad; no modifica el costo de
              materiales.
            </p>
          </div>
        </div>
      }
    />
  )
}
