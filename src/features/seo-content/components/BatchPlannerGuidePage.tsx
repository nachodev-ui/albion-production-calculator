import type { ReactNode } from "react";

function Formula({ children }: { readonly children: ReactNode }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-accent-border/45 bg-bg px-4 py-3 font-mono text-sm leading-relaxed text-accent">
      {children}
    </div>
  );
}

function Note({ children }: { readonly children: ReactNode }) {
  return (
    <aside className="my-5 rounded-xl border border-warning/35 bg-warning-muted px-4 py-3 text-sm leading-relaxed text-text-muted">
      <strong className="text-warning">Importante: </strong>
      {children}
    </aside>
  );
}

function Definition({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <dt className="font-semibold text-text">{title}</dt>
      <dd className="mt-1 text-sm leading-6 text-text-muted">{children}</dd>
    </div>
  );
}

export function BatchPlannerGuidePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-6">
      <article className="rounded-2xl border border-border bg-surface-raised/55 p-5 shadow-xl shadow-black/10 sm:p-8 lg:p-10">
        <nav aria-label="Migas de pan" className="text-xs text-text-faint">
          <a className="hover:text-accent" href="/">
            Calculadora
          </a>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <a className="hover:text-accent" href="/guias">
            Guías
          </a>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span aria-current="page">Planificador batch</span>
        </nav>

        <header className="mt-6 border-b border-border pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Guía de economía de Albion Online
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-text sm:text-4xl">
            Cómo usar el planificador batch y la lista de compra en Albion Online
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            Aprende a planificar varios objetos a la vez, comparar comprar contra
            fabricar, interpretar beneficio, ROI, capital y confianza, y convertir
            el resultado en una lista de materiales agrupada por ciudad.
          </p>
          <p className="mt-4 text-xs text-text-faint">
            Actualizado: 22 de julio de 2026 · Para principiantes y jugadores
            experimentados · Sin precios de mercado fijos
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href="/black-market"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
            >
              Abrir el planificador
            </a>
            <a
              href="/guias/black-market-caerleon-rentable"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text hover:border-accent-border hover:text-accent"
            >
              Entender primero el Black Market
            </a>
          </div>
        </header>

        <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-bg shadow-lg shadow-black/15">
          <picture>
            <source
              media="(max-width: 639px)"
              srcSet="/images/guides/black-market-caerleon-1x1.png"
            />
            <source
              media="(max-width: 1023px)"
              srcSet="/images/guides/black-market-caerleon-4x3.png"
            />
            <img
              src="/images/guides/black-market-caerleon-16x9.png"
              alt="Comparación educativa entre compra, fabricación, materiales y venta al Black Market de Caerleon"
              width={1600}
              height={900}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full"
            />
          </picture>
          <figcaption className="border-t border-border px-4 py-3 text-xs leading-5 text-text-faint sm:px-5">
            El planificador usa capturas almacenadas de mercado. Confirma precios,
            volumen y órdenes dentro del juego antes de ejecutar el lote.
          </figcaption>
        </figure>

        <div className="prose-albion mt-8 space-y-8 text-[15px] leading-7 text-text-muted">
          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Qué problema resuelve
            </h2>
            <p className="mt-3">
              Una calculadora normal estudia un objeto. El planificador batch estudia
              un <strong className="text-text">lote de objetos diferentes</strong> y
              responde tres preguntas:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>¿Conviene comprar o fabricar cada objeto?</li>
              <li>¿Cuánta plata y cuántos materiales necesita todo el lote?</li>
              <li>¿En qué ciudad aparece el precio más bajo de cada material?</li>
            </ol>
            <p className="mt-3">
              Para cada fila compara comprar terminado, fabricar sin foco y fabricar
              con foco. Después consolida únicamente los ingredientes de las filas que
              recomienda fabricar.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Conceptos del juego que debes conocer
            </h2>
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              <Definition title="Black Market">
                Mercado especial de Caerleon que publica órdenes de compra para
                objetos terminados. El precio de la orden representa ingreso potencial,
                no una venta reservada para ti.
              </Definition>
              <Definition title="Encantamiento">
                La variante .0, .1, .2, .3 o .4. Un T6.2 usa materiales y órdenes
                diferentes de un T6.1.
              </Definition>
              <Definition title="Calidad">
                Normal, Buena, Sobresaliente, Excelente u Obra maestra. La calidad
                elegida debe ser compatible con la calidad mínima de la orden.
              </Definition>
              <Definition title="RRR">
                Resource Return Rate: porcentaje esperado de ingredientes recuperables
                que vuelve al inventario. Devuelve materiales, no plata.
              </Definition>
              <Definition title="Foco">
                Recurso limitado que aumenta el retorno de materiales. Ahorrar más no
                implica que sea el mejor uso posible de tus puntos de foco.
              </Definition>
              <Definition title="Orden de compra">
                Oferta que puede llenarse, bajar o desaparecer mientras reúnes el lote.
                Por eso el resultado debe verificarse otra vez dentro del juego.
              </Definition>
            </dl>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 1: añade los objetos y cantidades
            </h2>
            <p className="mt-3">
              Añade cada objeto terminado que pretendes vender. La cantidad es el
              número de unidades finales, no el número de tiradas. La aplicación
              convierte la cantidad en tiradas según la salida de cada receta.
            </p>
            <Note>
              Si quieres vender diez cascos, escribe diez. No introduzcas la cantidad
              de materiales ni el número de veces que presionarás Fabricar.
            </Note>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 2: confirma servidor, encantamiento, calidad e impuesto
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-text">Servidor:</strong> Americas, Europe o
                Asia. Los precios de servidores distintos no se mezclan.
              </li>
              <li>
                <strong className="text-text">Encantamiento:</strong> determina la
                receta y la variante exacta del objeto.
              </li>
              <li>
                <strong className="text-text">Calidad:</strong> limita las órdenes
                compatibles del Black Market.
              </li>
              <li>
                <strong className="text-text">Impuesto BM:</strong> porcentaje que se
                descuenta del ingreso bruto de venta.
              </li>
            </ul>
            <Formula>
              ingreso neto = precio de la orden × cantidad × (1 − impuesto)
            </Formula>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 3: entiende las estrategias comparadas
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">
              Comprar terminado
            </h3>
            <p className="mt-2">
              Compra el objeto en una ciudad y lo vende a la orden del Black Market.
              No necesita ingredientes ni puesto, pero compromete el precio completo
              del objeto.
            </p>
            <Formula>
              beneficio mostrado de compra = ingreso neto − costo del objeto
            </Formula>

            <h3 className="mt-4 text-lg font-semibold text-text">
              Fabricar sin foco
            </h3>
            <p className="mt-2">
              Compra ingredientes, aplica el retorno normal de la ubicación, añade el
              puesto de fabricación y vende los objetos terminados. Artefactos y otros
              componentes no recuperables permanecen al costo completo.
            </p>

            <h3 className="mt-4 text-lg font-semibold text-text">
              Fabricar con foco
            </h3>
            <p className="mt-2">
              Repite el cálculo con mayor retorno. Puede reducir el costo, pero consume
              foco. La versión actual no asigna un costo de oportunidad monetario al
              foco dentro del planificador batch.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Qué incluye y qué no incluye el resultado
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-positive/30 bg-positive-muted p-4">
                <h3 className="font-semibold text-positive">Incluido</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  <li>precios observados de objetos y materiales;</li>
                  <li>impuesto seleccionado;</li>
                  <li>retorno de materiales y foco;</li>
                  <li>tarifas de fabricación calculadas;</li>
                  <li>valor esperado según calidad.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-warning/35 bg-warning-muted p-4">
                <h3 className="font-semibold text-warning">Debes descontar aparte</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  <li>transporte entre ciudades y hacia Caerleon;</li>
                  <li>escolta, consumibles y montura;</li>
                  <li>riesgo de muerte o pérdida del lote;</li>
                  <li>valor de tu tiempo;</li>
                  <li>costo de oportunidad del foco.</li>
                </ul>
              </div>
            </div>
            <Formula>
              beneficio real estimado = beneficio mostrado − ruta − riesgo − tiempo −
              otros costos propios
            </Formula>
            <Note>
              Un resultado positivo puede dejar de ser rentable después de la ruta.
              El planificador prepara la operación; no reemplaza tu evaluación logística.
            </Note>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Cómo leer beneficio, capital y ROI
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">Beneficio</h3>
            <p className="mt-2">
              Plata restante después de los costos incluidos en el modelo. No es una
              promesa de ganancia ni incluye automáticamente los costos de ruta.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Capital requerido
            </h3>
            <p className="mt-2">
              Plata que debes comprometer antes de cobrar la venta: costo del objeto o
              de los materiales y tarifas de fabricación. Es capital inmovilizado, no
              una pérdida inmediata.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">ROI</h3>
            <Formula>ROI = beneficio mostrado / capital requerido × 100</Formula>
            <p>
              El ROI permite comparar lotes de precios distintos. No mide velocidad de
              venta, volumen disponible ni seguridad de la ruta.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Cómo interpretar la confianza
            </h2>
            <p className="mt-3">
              La confianza mide la evidencia que respalda los precios, no la calidad
              económica del objeto. Se toma la peor señal entre la compra y la orden
              del Black Market.
            </p>
            <dl className="mt-4 grid gap-3 md:grid-cols-3">
              <Definition title="Alta">
                Precio reciente, historial suficiente, volumen razonable y valor
                cercano a la mediana.
              </Definition>
              <Definition title="Media">
                Evidencia utilizable, pero con antigüedad, volumen o desviación
                moderados.
              </Definition>
              <Definition title="Baja">
                Precio antiguo, poco historial, volumen bajo o valor muy alejado de lo
                habitual.
              </Definition>
            </dl>
            <Note>
              Confianza alta no garantiza que la orden siga abierta. Solo indica que
              la captura está mejor respaldada por los datos disponibles.
            </Note>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Materiales brutos, recuperados y consumo efectivo
            </h2>
            <p className="mt-3">
              Solo las filas recomendadas para fabricar aportan ingredientes. Una fila
              recomendada para comprar terminado no aparece en materiales consolidados.
            </p>
            <Formula>
              recuperado esperado = material recuperable bruto × RRR
              <br />
              consumo efectivo = bruto − recuperado esperado
            </Formula>
            <p>
              La lista de compra redondea hacia arriba las cantidades efectivas para
              evitar quedarse corto. Los artefactos y componentes no retornables no se
              descuentan por RRR.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Lista de compra por ciudad
            </h2>
            <p className="mt-3">
              Cada material se asigna a la ciudad con el precio disponible más bajo y
              luego se agrupa con los demás materiales de esa ciudad. Esto produce una
              ruta de compra inicial como Bridgewatch: lingotes; Martlock: tela;
              Caerleon: artefactos.
            </p>
            <Note>
              Precio más bajo no significa costo logístico más bajo. Si el ahorro es
              pequeño, comprar localmente puede ser mejor que viajar a otra ciudad.
            </Note>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Peso estimado y orden de fabricación
            </h2>
            <p className="mt-3">
              El peso es una aproximación para dimensionar el transporte. Confirma el
              peso real, bolsa, montura y bonificaciones dentro de Albion.
            </p>
            <p>
              El orden sugerido coloca primero los objetos seleccionados que funcionan
              como componentes de otros. Si no hay dependencias, el orden solo ayuda a
              organizar el trabajo y no cambia el beneficio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Qué significa “Sin cobertura”
            </h2>
            <p className="mt-3">
              No significa beneficio cero. Significa que no existe evidencia suficiente
              para resolver esa combinación. Puede faltar una orden, un precio de
              material o una coincidencia de servidor, encantamiento y calidad.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>Confirma el servidor.</li>
              <li>Verifica objeto y encantamiento exactos.</li>
              <li>Prueba calidad Normal si elegiste una calidad superior.</li>
              <li>Revisa el estado de los datos y vuelve a calcular.</li>
              <li>Busca la orden directamente dentro del Black Market.</li>
            </ol>
            <p className="mt-3">
              Si todas las filas están sin cobertura, los totales permanecen en cero
              porque no existe ninguna línea resuelta para sumar.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Ejemplo completo
            </h2>
            <p className="mt-3">
              Supón diez cascos y cinco armas. El plan recomienda comprar los cascos y
              fabricar las armas con foco. Los cascos aportan beneficio y capital, pero
              no ingredientes. Las armas necesitan 400 lingotes recuperables y cinco
              artefactos no retornables.
            </p>
            <p>
              Con 30% de RRR se recuperan económicamente 120 lingotes. La compra
              efectiva queda en 280 lingotes y cinco artefactos.
            </p>
            <Formula>
              bruto: 400 lingotes + 5 artefactos
              <br />
              recuperado: 120 lingotes
              <br />
              efectivo: 280 lingotes + 5 artefactos
            </Formula>
            <p>
              Después debes restar transporte, riesgo y tiempo del beneficio mostrado
              antes de decidir si ejecutar el lote completo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Cómo funciona técnicamente
            </h2>
            <p className="mt-3">
              La aplicación no consulta un precio en vivo garantizado. Usa capturas
              almacenadas de precios e historial. Reúne objetos y materiales únicos,
              los consulta en lotes y reutiliza la misma respuesta en todas las filas.
            </p>
            <p>
              Esto evita una petición por objeto y mantiene cálculos coherentes, pero
              una orden puede cambiar después de la captura. Por eso se muestran
              antigüedad, volumen, historial y confianza.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Errores frecuentes
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Elegir una calidad alta sin comprobar que exista demanda.</li>
              <li>Multiplicar el beneficio sin revisar el volumen de la orden.</li>
              <li>Aplicar RRR a artefactos o componentes no recuperables.</li>
              <li>Interpretar Sin cobertura como beneficio cero.</li>
              <li>Seguir la ciudad más barata sin valorar la ruta.</li>
              <li>Gastar foco sin compararlo con otras recetas.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Lista de comprobación antes de ejecutar
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>Confirma servidor, objeto, encantamiento y calidad.</li>
              <li>Revisa la estrategia ganadora de cada fila.</li>
              <li>Compara beneficio, capital y ROI juntos.</li>
              <li>Lee las razones de confianza media o baja.</li>
              <li>Limita la cantidad al volumen real de la orden.</li>
              <li>Verifica precios de materiales en cada ciudad.</li>
              <li>Resta transporte, riesgo, tiempo y costo del foco.</li>
              <li>Confirma peso y capacidad dentro del juego.</li>
              <li>Comprueba otra vez la orden antes de invertir.</li>
              <li>Empieza con un lote pequeño cuando haya incertidumbre.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Preguntas frecuentes
            </h2>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Los materiales incluyen objetos recomendados para comprar?
            </h3>
            <p className="mt-2">
              No. Solo se consolidan ingredientes de estrategias recomendadas para
              fabricar.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Beneficio total es ganancia segura?
            </h3>
            <p className="mt-2">
              No. Es una estimación con los costos incluidos. Debes comprobar órdenes
              y restar tus costos logísticos y de riesgo.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Por qué el resumen muestra cero?
            </h3>
            <p className="mt-2">
              Si no hay filas resueltas, no existe nada que sumar. Cero no afirma que
              el objeto tenga exactamente rentabilidad cero dentro del juego.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Dónde está la herramienta?
            </h3>
            <p className="mt-2">
              Abre el <a className="text-accent underline" href="/black-market">módulo del Black Market</a>
              y selecciona <strong className="text-text">Planificador batch</strong>.
            </p>
          </section>
        </div>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-semibold text-text">
            Continúa aprendiendo
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                href: "/guias/black-market-caerleon-rentable",
                title: "Rentabilidad del Black Market",
                text: "Impuesto, transporte, liquidez, riesgo y equilibrio.",
              },
              {
                href: "/guias/retorno-materiales-rrr-albion-online",
                title: "Retorno de materiales",
                text: "Production Bonus, foco y materiales recuperables.",
              },
              {
                href: "/guias/rentabilidad-crafteo-albion-online",
                title: "Rentabilidad de crafteo",
                text: "Costo efectivo, ingreso neto, beneficio y ROI.",
              },
            ].map((guide) => (
              <a
                key={guide.href}
                href={guide.href}
                className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent-border hover:bg-accent-muted/35"
              >
                <h3 className="text-sm font-semibold text-text">{guide.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-text-faint">
                  {guide.text}
                </p>
              </a>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
