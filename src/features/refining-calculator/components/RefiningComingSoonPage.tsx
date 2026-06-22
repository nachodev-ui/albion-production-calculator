import { ArrowRightIcon, RefiningIcon, ReturnIcon } from '../../../app/AppIcons'

interface RefiningComingSoonPageProps {
  readonly onOpenCrafting: () => void
}

const FEATURES = [
  'Recursos crudos y refinados por tier y encantamiento',
  'Bonificaciones locales de las ciudades de refinamiento',
  'Foco, RRR, tarifas de estación y cantidades por tanda',
  'Costo neto, precio de venta y rentabilidad final',
] as const

export function RefiningComingSoonPage({
  onOpenCrafting,
}: RefiningComingSoonPageProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-14 pt-2 sm:px-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface/86 p-7 shadow-[0_28px_90px_rgba(0,0,0,0.2)] sm:p-10 lg:p-14">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-accent/[0.07] blur-3xl"
        />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-muted text-accent">
              <RefiningIcon className="h-7 w-7" />
            </span>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Próximo módulo
            </p>
            <h3 className="mt-2 max-w-2xl text-balance font-display text-3xl leading-tight text-text sm:text-4xl">
              Refinamiento con la misma profundidad económica del crafteo
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
              Este espacio ya forma parte de la navegación para que la aplicación crezca como una suite de producción, sin convertir el refinamiento en una herramienta aislada.
            </p>

            <button
              type="button"
              onClick={onOpenCrafting}
              className="mt-7 inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              Volver a Crafteo
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-bg/40 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ReturnIcon className="h-5 w-5 text-positive" />
              <h4 className="text-sm font-semibold text-text">Alcance previsto</h4>
            </div>
            <ul className="mt-5 space-y-3">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-text-muted">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-faint">
              Los presets, precios locales, exportación y componentes de retorno actuales podrán reutilizarse en este módulo.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
