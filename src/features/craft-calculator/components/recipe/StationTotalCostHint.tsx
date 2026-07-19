import { InfoHint } from '@shared/components/InfoHint'

interface StationTotalCostHintProps {
  readonly align?: 'left' | 'center' | 'right'
}

export function StationTotalCostHint({
  align = 'left',
}: StationTotalCostHintProps) {
  return (
    <InfoHint
      label="Guía visual del coste del puesto"
      align={align}
      width={420}
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
          <style>{`
            @keyframes station-total-cost-focus {
              0%, 8%, 45%, 100% { opacity: 0.35; transform: scale(1); }
              14%, 36% { opacity: 1; transform: scale(1.015); }
            }

            @keyframes station-pay-focus {
              0%, 48%, 100% { opacity: 0.3; transform: scale(1); }
              56%, 86% { opacity: 1; transform: scale(1.035); }
            }

            @media (prefers-reduced-motion: reduce) {
              .station-total-cost-focus,
              .station-pay-focus {
                animation: none !important;
                opacity: 1 !important;
              }
            }
          `}</style>

          <div className="border-b border-border bg-surface px-3.5 py-3">
            <p className="font-medium text-text">
              Cómo obtener el coste del puesto
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Copia el valor de la fila «Coste total» antes de confirmar la
              fabricación.
            </p>
          </div>

          <div className="bg-surface-raised p-3">
            <div className="relative mx-auto w-full max-w-[330px] overflow-hidden rounded-md border border-border bg-black/20">
              <img
                src="/assets/ui/albion-station-total-cost-guide.webp"
                alt="Captura real del cuadro de pago de fabricación de Albion Online"
                width={330}
                height={216}
                className="block h-auto w-full"
              />

              <span
                aria-hidden="true"
                className="station-total-cost-focus pointer-events-none absolute left-[1.5%] top-[57%] h-[26%] w-[65.5%] origin-center rounded-sm border-2 border-accent bg-accent-muted/30 shadow-[0_0_0_2px_rgba(0,0,0,0.7)]"
                style={{
                  animation:
                    'station-total-cost-focus 4.8s ease-in-out infinite',
                }}
              >
                <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg shadow-md">
                  1
                </span>
              </span>

              <span
                aria-hidden="true"
                className="station-pay-focus pointer-events-none absolute left-[68%] top-[62%] h-[18%] w-[25%] origin-center rounded-sm border-2 border-negative bg-negative-muted/30 shadow-[0_0_0_2px_rgba(0,0,0,0.7)]"
                style={{
                  animation: 'station-pay-focus 4.8s ease-in-out infinite',
                }}
              >
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-negative text-[10px] font-bold text-bg shadow-md">
                  2
                </span>
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-accent-border bg-accent-muted px-2.5 py-2">
                <p className="font-medium text-text">
                  1. Copia «Coste total»
                </p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  Es el número de la fila inferior: 32.738.
                </p>
              </div>

              <div className="rounded-md border border-negative/35 bg-negative-muted px-2.5 py-2">
                <p className="font-medium text-text">2. Detente antes de pagar</p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  Puedes cerrar la ventana después de copiarlo.
                </p>
              </div>
            </div>

            <p className="mt-2 rounded-md border border-warning/35 bg-warning-muted px-2.5 py-2 text-[11px] font-medium text-warning">
              Selecciona 1 unidad para copiar el coste por unidad.
            </p>
          </div>
        </div>
      }
    />
  )
}
