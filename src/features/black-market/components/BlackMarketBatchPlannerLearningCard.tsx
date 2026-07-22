import { useRef } from "react";

const QUICK_STEPS = [
  {
    number: "1",
    title: "Construye el lote",
    text: "Añade los objetos terminados que quieres vender y define cuántas unidades necesitas de cada uno.",
  },
  {
    number: "2",
    title: "Confirma la variante",
    text: "Encantamiento y calidad deben coincidir con el objeto y con la orden que esperas encontrar en el Black Market.",
  },
  {
    number: "3",
    title: "Calcula las estrategias",
    text: "La herramienta compara comprar terminado, fabricar sin foco y fabricar con foco usando los mismos precios del lote.",
  },
  {
    number: "4",
    title: "Ejecuta la lista",
    text: "Revisa capital, confianza, materiales efectivos y ciudades antes de comprar o fabricar dentro del juego.",
  },
] as const;

const GLOSSARY = [
  {
    term: "Capital requerido",
    text: "Plata que debes comprometer para ejecutar la estrategia recomendada antes de recibir la venta.",
  },
  {
    term: "ROI",
    text: "Beneficio dividido por el capital requerido. Sirve para comparar lotes de tamaños y precios distintos.",
  },
  {
    term: "Consumo efectivo",
    text: "Materiales brutos menos la devolución estimada por retorno de recursos (RRR).",
  },
  {
    term: "Confianza",
    text: "Calidad de la evidencia disponible: antigüedad del precio, observaciones, volumen y distancia frente a la mediana.",
  },
] as const;

export function BlackMarketBatchPlannerLearningCard() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function openQuickGuide() {
    if (!detailsRef.current) return;
    detailsRef.current.open = true;
    detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded-2xl border border-accent-border/55 bg-accent-muted/20"
      aria-labelledby="batch-learning-title"
    >
      <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_auto] lg:items-center sm:px-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            Guía para comenzar
          </p>
          <h3
            id="batch-learning-title"
            className="mt-1 font-display text-xl font-semibold text-text"
          >
            ¿Qué decisión toma este planificador?
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted">
            Responde si conviene comprar o fabricar cada objeto del lote y transforma
            la decisión en una lista de materiales agrupada por ciudad. No garantiza
            que una orden siga disponible: prepara el plan aquí y confírmalo dentro de
            Albion antes de gastar plata.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={openQuickGuide}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Ver guía paso a paso
          </button>
          <a
            href="/guias/planificador-batch-lista-compra-albion-online"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:border-accent-border hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Leer guía completa
          </a>
        </div>
      </div>

      <details
        ref={detailsRef}
        className="group scroll-mt-6 border-t border-accent-border/35 bg-surface/45"
      >
        <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-text marker:hidden sm:px-6">
          <span className="flex items-center justify-between gap-3">
            Ver explicación rápida de campos y resultados
            <span
              aria-hidden="true"
              className="text-accent transition-transform group-open:rotate-180"
            >
              ↓
            </span>
          </span>
        </summary>
        <div className="border-t border-border px-5 py-5 sm:px-6">
          <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {QUICK_STEPS.map((step) => (
              <li
                key={step.number}
                className="rounded-xl border border-border bg-surface-raised p-4"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-sm font-bold text-accent">
                  {step.number}
                </span>
                <h4 className="mt-3 text-sm font-semibold text-text">{step.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h4 className="text-sm font-semibold text-text">
                Estrategias que compara
              </h4>
              <dl className="mt-3 space-y-3 text-xs leading-relaxed text-text-muted">
                <div>
                  <dt className="font-semibold text-text">Comprar terminado</dt>
                  <dd>
                    Compra el objeto en una ciudad y lo vende a la orden del Black
                    Market. El capital parte del costo del objeto; transporte y riesgo
                    deben descontarse aparte en la versión actual.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text">Fabricar sin foco</dt>
                  <dd>
                    Compra ingredientes, aplica el retorno normal de la ubicación y
                    descuenta puesto e impuesto de la venta.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-text">Fabricar con foco</dt>
                  <dd>
                    Repite la fabricación con mayor devolución. El foco es limitado,
                    por lo que una mejora pequeña no siempre justifica gastarlo.
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-surface-raised p-4">
              <h4 className="text-sm font-semibold text-text">Glosario mínimo</h4>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {GLOSSARY.map((entry) => (
                  <div key={entry.term}>
                    <dt className="font-semibold text-text">{entry.term}</dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-text-muted">
                      {entry.text}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <aside className="mt-4 rounded-xl border border-warning/35 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted">
            <strong className="text-warning">Alcance del resumen: </strong>
            incluye precios, impuesto, materiales, retorno y puesto. Transporte,
            escolta, pérdida por muerte y valor del tiempo no se añaden automáticamente
            en este planificador; descuéntalos antes de ejecutar.
          </aside>

          <aside className="mt-3 rounded-xl border border-warning/35 bg-warning-muted px-4 py-3 text-xs leading-relaxed text-text-muted">
            <strong className="text-warning">Cuando aparece “Sin cobertura”: </strong>
            no se encontró una combinación compatible de objeto, encantamiento y
            calidad en los datos consultados. Prueba otra calidad, revisa el servidor,
            actualiza los precios y confirma directamente en el Black Market. No lo
            interpretes como beneficio cero.
          </aside>
        </div>
      </details>
    </section>
  );
}
