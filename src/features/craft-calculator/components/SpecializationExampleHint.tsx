import type { CSSProperties } from 'react'
import { InfoHint } from '@shared/components/InfoHint'

type SpecializationExampleTarget =
  | 'current-level'
  | 'level-progress'
  | 'level-requirement'

interface SpecializationExampleHintProps {
  readonly target: SpecializationExampleTarget
  readonly align?: 'left' | 'center' | 'right'
}

interface ExampleConfig {
  readonly title: string
  readonly description: string
  readonly valueLabel: string
  readonly highlight: CSSProperties
}

const EXAMPLE_CONFIG: Record<SpecializationExampleTarget, ExampleConfig> = {
  'current-level': {
    title: 'Nivel actual',
    description:
      'Es el número que aparece antes de “/100” en el nodo de especialización.',
    valueLabel: 'En el ejemplo: nivel 1',
    highlight: {
      left: '4.5%',
      top: '42.5%',
      width: '17%',
      height: '11.5%',
    },
  },
  'level-progress': {
    title: 'Progreso dentro del nivel',
    description:
      'Es la fama que ya acumulaste en el nivel actual: el número situado antes de la barra “/”.',
    valueLabel: 'En el ejemplo: 11.976 de fama',
    highlight: {
      left: '51.5%',
      top: '42.5%',
      width: '15.5%',
      height: '11.5%',
    },
  },
  'level-requirement': {
    title: 'Fama requerida para subir',
    description:
      'Es la fama total necesaria para completar el nivel actual: el número situado después de la barra “/”.',
    valueLabel: 'En el ejemplo: 29.868 de fama',
    highlight: {
      left: '65%',
      top: '42.5%',
      width: '16%',
      height: '11.5%',
    },
  },
}

export function SpecializationExampleHint({
  target,
  align = 'left',
}: SpecializationExampleHintProps) {
  const config = EXAMPLE_CONFIG[target]

  return (
    <InfoHint
      label={config.title}
      align={align}
      width={340}
      openOnHover
      tooltipClassName="overflow-hidden p-0"
      content={
        <div>
          <div className="border-b border-border bg-surface px-3.5 py-3">
            <p className="font-medium text-text">{config.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              {config.description}
            </p>
          </div>

          <div className="bg-surface-raised p-3">
            <div className="relative overflow-hidden rounded-md border border-border bg-black/20">
              <img
                src="/assets/ui/crafting-specialization-example.png"
                alt="Ejemplo del nodo de especialización de crafteo en el Destiny Board"
                className="block h-auto w-full"
              />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute rounded-sm border-2 border-accent bg-accent-muted/40 shadow-[0_0_0_2px_rgba(0,0,0,0.65)]"
                style={config.highlight}
              />
            </div>

            <p className="mt-2 rounded-md border border-accent-border bg-accent-muted px-2.5 py-2 text-[11px] font-semibold text-accent">
              {config.valueLabel}
            </p>
          </div>
        </div>
      }
    />
  )
}
