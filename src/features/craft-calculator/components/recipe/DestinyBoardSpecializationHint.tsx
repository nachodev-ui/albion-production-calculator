import { InfoHint } from '@shared/components/InfoHint'

interface DestinyBoardSpecializationHintProps {
  readonly align?: 'left' | 'center' | 'right'
}

export function DestinyBoardSpecializationHint({
  align = 'left',
}: DestinyBoardSpecializationHintProps) {
  return (
    <InfoHint
      label="Guía visual de especialización y foco"
      align={align}
      width={500}
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
              Abre el Destiny Board con B y suma los bonos del nodo general de la
              familia con los del objeto específico.
            </p>
          </div>

          <div className="bg-surface-raised p-3">
            <img
              src="/assets/ui/destiny-board-specialization-guide.webp"
              alt="Guía animada con capturas reales del Destiny Board: acceso con B, nodo general, especialización individual y progreso del nivel"
              width={900}
              height={520}
              className="block h-auto w-full rounded-md border border-border"
            />

            <ol className="mt-3 grid gap-2 text-[11px] leading-relaxed text-text-muted sm:grid-cols-2">
              <li className="rounded-md border border-border bg-surface px-2.5 py-2">
                <strong className="text-text">1. Abre el Destiny Board.</strong>{' '}
                Presiona B y busca la rama del objeto que fabricarás.
              </li>
              <li className="rounded-md border border-border bg-surface px-2.5 py-2">
                <strong className="text-text">2. Revisa el nodo general.</strong>{' '}
                Sus bonos afectan a todas las armas o piezas de esa familia.
              </li>
              <li className="rounded-md border border-border bg-surface px-2.5 py-2">
                <strong className="text-text">3. Revisa el nodo específico.</strong>{' '}
                Es el que lleva el nombre exacto del objeto que fabricarás.
              </li>
              <li className="rounded-md border border-accent-border bg-accent-muted px-2.5 py-2">
                <strong className="text-text">4. Introduce el total.</strong>{' '}
                Suma ambos bonos; no escribas el nivel del nodo.
              </li>
            </ol>

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
