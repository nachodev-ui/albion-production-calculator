import {
  ArrowRightIcon,
  CalculatorIcon,
  CatalogIcon,
  ChartIcon,
  ReturnIcon,
  ShieldCheckIcon,
} from '../../../app/AppIcons'

interface EmptyDetailStateProps {
  readonly onBrowseCatalog?: () => void
}

const STEPS = [
  ['01', 'Explora el catálogo', 'Elige una categoría, abre una rama de crafteo y selecciona el tier.'],
  ['02', 'Ingresa precios reales', 'Usa los valores que pagaste para evitar estimaciones de mercado desactualizadas.'],
  ['03', 'Compara el resultado', 'Revisa RRR, costo neto, punto de equilibrio y rentabilidad antes de fabricar.'],
] as const

const BENEFITS = [
  {
    title: 'Retorno de recursos',
    description: 'Calcula el valor y las cantidades recuperadas mediante RRR y foco.',
    icon: ReturnIcon,
  },
  {
    title: 'Costo real',
    description: 'Distingue costo bruto, ahorro por retorno y costo neto de producción.',
    icon: CalculatorIcon,
  },
  {
    title: 'Decisión de venta',
    description: 'Incluye Tax, Setup Fee, ganancia y precios objetivo de rentabilidad.',
    icon: ChartIcon,
  },
] as const

export function EmptyDetailState({ onBrowseCatalog }: EmptyDetailStateProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-7xl items-center px-5 pb-12 pt-2 sm:px-6">
      <div className="grid w-full overflow-hidden rounded-2xl border border-border bg-surface/82 shadow-[0_28px_90px_rgba(0,0,0,0.22)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl"
          />

          <div className="relative">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-muted text-accent shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
              <CatalogIcon className="h-7 w-7" />
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
              Comienza un cálculo
            </p>
            <h3 className="mt-2 max-w-xl text-balance font-display text-3xl leading-tight text-text sm:text-4xl">
              Descubre si vale la pena craftear antes de gastar tu plata
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
              Selecciona un objeto y convierte sus materiales, retornos y comisiones en una decisión económica clara.
            </p>

            <button
              type="button"
              onClick={onBrowseCatalog}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg shadow-[0_10px_30px_rgba(201,162,39,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border focus-visible:ring-offset-2 focus-visible:ring-offset-bg lg:hidden"
            >
              Abrir catálogo
              <ArrowRightIcon className="h-4 w-4" />
            </button>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {BENEFITS.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-xl border border-border bg-bg/35 p-4"
                >
                  <Icon className="h-5 w-5 text-accent" />
                  <h4 className="mt-3 text-sm font-semibold text-text">{title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-text-faint">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="border-t border-border bg-bg/35 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-positive" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Flujo recomendado
            </p>
          </div>

          <ol className="mt-6 space-y-5">
            {STEPS.map(([number, title, description], index) => (
              <li key={number} className="relative flex gap-4">
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[17px] top-9 h-[calc(100%+4px)] w-px bg-border"
                  />
                )}
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-border bg-accent-muted font-mono text-[11px] text-accent">
                  {number}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-text">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-faint">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-xl border border-border bg-surface-raised p-4">
            <p className="text-xs font-medium text-text">Tus datos permanecen locales</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
              Los precios manuales y presets se guardan en este navegador. No necesitas una cuenta ni una API de precios.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
