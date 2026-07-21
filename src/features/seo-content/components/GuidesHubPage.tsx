import { DataStatusPage } from '@features/data-trust/components/DataStatusPage'

interface GuideCard {
  readonly href: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly topics: readonly string[];
}

const GUIDES: readonly GuideCard[] = [
  {
    href: "/guias/rentabilidad-crafteo-albion-online",
    eyebrow: "Crafteo",
    title: "Cómo calcular la rentabilidad de crafteo",
    description:
      "Calcula costo efectivo, ingreso neto, beneficio, ROI y precio de equilibrio sin confundir materiales brutos con consumo real.",
    topics: ["Costo real", "Impuestos y tarifa", "Beneficio y ROI"],
  },
  {
    href: "/guias/retorno-materiales-rrr-albion-online",
    eyebrow: "Retorno de materiales",
    title: "RRR en Albion Online: fórmula y ejemplos",
    description:
      "Entiende Production Bonus, foco, materiales recuperables y el ahorro esperado que produce el retorno en cada lote.",
    topics: ["Production Bonus", "Foco", "Materiales devueltos"],
  },
  {
    href: "/guias/black-market-caerleon-rentable",
    eyebrow: "Caerleon",
    title: "Cómo saber si el Black Market es rentable",
    description:
      "Compara comprar y transportar contra fabricar con RRR antes de comprometer plata, volumen y riesgo de ruta.",
    topics: ["Compra y transporte", "Fabricación con RRR", "Liquidez y riesgo"],
  },
];

export function GuidesHubPage() {
  if (
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === '/estado-datos'
  ) {
    return <DataStatusPage />
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised/55 shadow-xl shadow-black/10">
        <div className="border-b border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <nav aria-label="Migas de pan" className="text-xs text-text-faint">
            <a className="transition-colors hover:text-accent" href="/">
              Calculadora
            </a>
            <span aria-hidden="true" className="px-2">
              /
            </span>
            <span aria-current="page">Guías</span>
          </nav>

          <div className="mt-7 max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              Centro de aprendizaje
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-text sm:text-4xl lg:text-5xl">
              Guías de economía de Albion Online
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-muted sm:text-lg">
              Aprende a evaluar crafteo, retorno de materiales y oportunidades del
              Black Market con fórmulas prácticas. Cada guía explica qué datos
              necesitas, cómo interpretar el resultado y qué revisar antes de
              invertir plata.
            </p>
          </div>
        </div>

        <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <section aria-labelledby="guide-list-title">
            <div className="max-w-3xl">
              <h2
                id="guide-list-title"
                className="font-display text-2xl font-semibold text-text"
              >
                Elige una guía
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Empieza por el cálculo general de rentabilidad o abre directamente
                la mecánica que necesitas resolver.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {GUIDES.map((guide) => (
                <article key={guide.href} className="h-full">
                  <a
                    href={guide.href}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent-border hover:bg-accent-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border sm:p-6"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                      {guide.eyebrow}
                    </p>
                    <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-text group-hover:text-accent">
                      {guide.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {guide.description}
                    </p>
                    <ul className="mt-5 space-y-2 text-xs text-text-faint">
                      {guide.topics.map((topic) => (
                        <li key={topic} className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-accent"
                          />
                          {topic}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      Leer guía
                      <span
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section
            aria-labelledby="tools-title"
            className="mt-10 rounded-2xl border border-accent-border/45 bg-bg p-5 sm:p-7"
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                  Pasa de la teoría al cálculo
                </p>
                <h2
                  id="tools-title"
                  className="mt-2 font-display text-2xl font-semibold text-text"
                >
                  Aplica las fórmulas con datos reales
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">
                  Usa la calculadora para estimar producción y retorno, compara
                  oportunidades para Caerleon y revisa la cobertura antes de confiar
                  en un resultado automático.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <a
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                >
                  Abrir calculadora de crafteo
                </a>
                <a
                  href="/black-market"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                >
                  Explorar Black Market
                </a>
                <a
                  href="/estado-datos"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                >
                  Ver estado de los datos
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
