import { InfoHint } from '@shared/components/InfoHint'

export type DataConfidenceHintLevel = 'high' | 'medium' | 'low'

const EXPLANATIONS: Record<DataConfidenceHintLevel, string> = {
  high:
    'El precio es reciente, hay suficientes registros y se parece a lo que normalmente se ha visto durante los últimos días.',
  medium:
    'El precio puede servir como referencia, pero es algo antiguo o hay menos actividad registrada. Revísalo antes de invertir una gran cantidad.',
  low:
    'Hay poca información, el precio es antiguo o está muy alejado de lo habitual. Conviene actualizarlo o ingresar un precio manual.',
}

export function DataConfidenceHint({
  level,
  label,
  className,
}: {
  readonly level: DataConfidenceHintLevel
  readonly label: string
  readonly className: string
}) {
  return (
    <InfoHint
      label={label}
      openOnHover
      align="left"
      width={304}
      trigger={
        <span className="inline-flex items-center gap-1">
          {label}
          <span aria-hidden="true" className="text-[9px] opacity-75">
            ?
          </span>
        </span>
      }
      triggerClassName={`shrink-0 cursor-help rounded border font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border ${className}`}
      content={
        <div>
          <p className="font-semibold text-text">¿Qué significa {label.toLowerCase()}?</p>
          <p className="mt-1.5">{EXPLANATIONS[level]}</p>
          <a
            href="/estado-datos"
            className="mt-2.5 inline-flex font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:text-text"
          >
            Ver cómo revisamos los precios →
          </a>
        </div>
      }
    />
  )
}
