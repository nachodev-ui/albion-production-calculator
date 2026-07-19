import { InfoHint } from '@shared/components/InfoHint'

interface StationTotalCostHintProps {
  readonly align?: 'left' | 'center' | 'right'
}

export function StationTotalCostHint({
  align = 'left',
}: StationTotalCostHintProps) {
  return (
    <InfoHint
      label="Coste total mostrado por Albion"
      align={align}
      width={420}
      trigger={
        <>
          <span aria-hidden="true">▶</span>
          <span>Ver guía visual</span>
        </>
      }
      triggerClassName="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-accent-border bg-accent-muted px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
      tooltipClassName="overflow-hidden p-0"
      content={
        <div>
          <div className="border-b border-border bg-surface px-3.5 py-3">
            <p className="font-medium text-text">
              Cómo obtener el coste del puesto
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Abre el cuadro de pago y copia el valor antes de confirmar la
              fabricación.
            </p>
          </div>

          <div className="bg-surface-raised p-3">
            <div className="overflow-hidden rounded-md border border-border bg-black/20">
              <img
                src="/assets/ui/albion-station-total-cost-guide.gif"
                alt="Guía animada del cuadro de fabricación de Albion que resalta el Coste total y después el botón Pagar"
                width={180}
                height={118}
                className="block h-auto w-full"
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-surface px-2.5 py-2">
                <p className="font-medium text-text">
                  1. Copia «Coste total»
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  En la captura: 32.738 de plata.
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface px-2.5 py-2">
                <p className="font-medium text-text">2. Antes de pagar</p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  No necesitas confirmar la fabricación.
                </p>
              </div>
            </div>

            <p className="mt-2 rounded-md border border-accent-border bg-accent-muted px-2.5 py-2 text-[11px] font-medium text-accent">
              Selecciona 1 unidad para copiar el coste por unidad.
            </p>
          </div>
        </div>
      }
    />
  )
}
