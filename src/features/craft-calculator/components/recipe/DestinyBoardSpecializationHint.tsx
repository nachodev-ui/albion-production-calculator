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
    aspectRatio: 720 / 300,
    zoom: 2.9,
    highlightArea: { x: 97.5, y: 17.7, width: 2.3, height: 6.2 },
    title: '1. Abre el Destiny Board',
    caption:
      'Presiona B dentro del juego. También puedes usar el icono resaltado del menú derecho para abrir la misma tabla.',
    alt: 'Captura real de Albion Online con el acceso al Destiny Board resaltado',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-general-node.png',
    aspectRatio: 420 / 467,
    zoom: 1.75,
    highlightArea: { x: 58, y: 8, width: 39.5, height: 23.5 },
    title: '2. Revisa el nodo general de la familia',
    caption:
      'Busca el nodo general, como Spear Crafter. Sus bonos se aplican a todas las lanzas de la familia. Anota Focus Cost Efficiency e Increase in Quality.',
    alt: 'Nodo general Spear Crafter con los bonos para todas las lanzas resaltados',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-specific-node.png',
    aspectRatio: 420 / 466,
    zoom: 1.65,
    highlightArea: { x: 2.8, y: 1.5, width: 53.5, height: 18 },
    title: '3. Abre el nodo específico del objeto',
    caption:
      'Después abre el especialista que lleva el nombre exacto del objeto que fabricarás. No confundas este nodo con el nodo general de la familia.',
    alt: 'Nodo Spear Crafting Specialist del objeto concreto resaltado',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-specific-node.png',
    aspectRatio: 420 / 466,
    zoom: 1.75,
    highlightArea: { x: 57.8, y: 8.5, width: 40, height: 27 },
    title: '4. Suma los bonos general y específico',
    caption:
      'Suma los valores del nodo general con los del especialista para cada métrica. Introduce el total en la calculadora; no escribas el nivel del nodo.',
    alt: 'Resumen de bonos del especialista de lanzas resaltado para realizar la suma',
  },
  {
    image: '/assets/ui/destiny-board/destiny-board-progress.png',
    aspectRatio: 283 / 106,
    zoom: 1.65,
    highlightArea: { x: 2, y: 39, width: 95, height: 40 },
    title: '5. Completa la proyección de especialización',
    caption:
      'Copia el nivel actual, el progreso dentro de ese nivel y la fama requerida que muestra la barra. Luego elige el nivel objetivo para proyectar cuánta fama falta.',
    alt: 'Barra real de progreso de especialización con nivel y fama resaltados',
  },
]

export function DestinyBoardSpecializationHint({
  align = 'left',
}: DestinyBoardSpecializationHintProps) {
  return (
    <InfoHint
      label="Guía visual de especialización y foco"
      align={align}
      width={620}
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
              Recorrido interactivo sobre capturas reales: Destiny Board, nodo
              general, especialista, suma de bonos y proyección.
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
                intervalMs={7000}
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
