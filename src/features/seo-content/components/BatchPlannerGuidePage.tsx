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

function Term({
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
            Actualizado: 22 de julio de 2026 · Lectura para principiantes y jugadores
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
            El planificador usa capturas de mercado para preparar una decisión. Las
            órdenes y los precios deben confirmarse nuevamente dentro del juego.
          </figcaption>
        </figure>

        <div className="prose-albion mt-8 space-y-8 text-[15px] leading-7 text-text-muted">
          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Respuesta rápida: qué hace el planificador
            </h2>
            <p className="mt-3">
              Una calculadora normal estudia un solo objeto. El planificador batch
              estudia un <strong className="text-text">lote de objetos distintos</strong>
              y responde tres preguntas:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>¿Qué estrategia deja más beneficio para cada objeto?</li>
              <li>¿Cuánta plata y cuántos materiales necesita todo el lote?</li>
              <li>¿En qué ciudad conviene comprar cada material?</li>
            </ol>
            <p className="mt-3">
              Para cada fila compara comprar el objeto terminado, fabricarlo sin foco
              o fabricarlo con foco. Después suma únicamente los materiales de las
              estrategias que recomienda fabricar.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Antes de empezar: conceptos del juego
            </h2>
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              <Term title="Black Market">
                Mercado especial de Caerleon que publica órdenes de compra para
                objetos terminados. El plan usa el precio de esas órdenes como ingreso
                potencial.
              </Term>
              <Term title="Encantamiento">
                El nivel .0, .1, .2, .3 o .4 del objeto. Un objeto T6.2 no es la misma
                variante que T6.1 y necesita materiales y órdenes diferentes.
              </Term>
              <Term title="Calidad">
                Normal, Buena, Sobresaliente, Excelente u Obra maestra. La calidad
                seleccionada debe poder cubrir la calidad mínima solicitada por la
                orden del Black Market.
              </Term>
              <Term title="RRR o retorno de recursos">
                Porcentaje esperado de ingredientes recuperables que vuelve al
                inventario al fabricar. Devuelve materiales, no plata ni objetos
                terminados.
              </Term>
              <Term title="Foco">
                Recurso limitado del personaje que aumenta el retorno de materiales.
                Una estrategia con foco puede costar menos, pero consume puntos que
                podrían usarse en otra receta.
              </Term>
              <Term title="Orden de compra">
                Oferta de otro mercado o del Black Market para comprar inmediatamente.
                Puede desaparecer o reducirse mientras preparas el lote.
              </Term>
            </dl>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 1: añade los objetos exactos
            </h2>
            <p className="mt-3">
              Busca cada objeto terminado que quieres incluir. La cantidad significa
              cuántas unidades planeas comprar o fabricar, no cuántas tiradas harás.
              La calculadora transforma esa cantidad en tiradas según la salida de la
              receta.
            </p>
            <Note>
              No mezcles una cantidad de venta con una cantidad de fabricación. Si
              necesitas vender diez cascos, escribe diez aunque una receta futura
              pudiera producir más de una unidad por tirada.
            </Note>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 2: configura servidor, encantamiento, calidad e impuesto
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">Servidor</h3>
            <p className="mt-2">
              Selecciona Americas, Europe o Asia según el personaje que ejecutará la
              operación. Los mercados de servidores distintos no son intercambiables.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Encantamiento y calidad
            </h3>
            <p className="mt-2">
              Estos dos campos limitan la variante estudiada. Si eliges una calidad
              muy específica puede no existir una orden compatible. Cambiar la calidad
              no cambia el tier ni el encantamiento del objeto.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">Impuesto BM</h3>
            <p className="mt-2">
              Es el porcentaje descontado del ingreso de venta. El precio visible de
              la orden es ingreso bruto; la plata que realmente recibes es menor.
            </p>
            <Formula>
              ingreso neto = precio de la orden × cantidad × (1 − impuesto)
            </Formula>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 3: entiende las tres estrategias
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">
              Comprar terminado
            </h3>
            <p className="mt-2">
              Compra el objeto en la ciudad donde aparece la mejor oportunidad y lo
              vende al Black Market. No necesita materiales ni puesto de fabricación,
              pero inmoviliza el precio completo del objeto terminado.
            </p>
            <Formula>
              beneficio de compra = ingreso neto − costo del objeto − logística
            </Formula>

            <h3 className="mt-4 text-lg font-semibold text-text">
              Fabricar sin foco
            </h3>
            <p className="mt-2">
              Compra los ingredientes, aplica el retorno normal de la ubicación,
              añade tarifas de fabricación y vende el resultado. Los artefactos y
              componentes no recuperables permanecen al costo completo.
            </p>

            <h3 className="mt-4 text-lg font-semibold text-text">
              Fabricar con foco
            </h3>
            <p className="mt-2">
              Repite el cálculo con mayor retorno. La estrategia solo debería ganar si
              el ahorro adicional justifica el foco usado. El planificador compara el
              beneficio económico, pero tú debes decidir cuánto vale cada punto de
              foco en tu cuenta.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 4: lee beneficio, capital y ROI juntos
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">Beneficio</h3>
            <p className="mt-2">
              Es la plata restante después de los costos incluidos. Un beneficio de
              50.000 no indica por sí solo si la operación es eficiente.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Capital requerido
            </h3>
            <p className="mt-2">
              Es la plata que debes comprometer antes de vender: costo de objetos o
              materiales, puesto y logística directa. No es una pérdida; es capital
              temporalmente inmovilizado.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">ROI</h3>
            <Formula>ROI = beneficio / capital requerido × 100</Formula>
            <p>
              Dos lotes pueden dejar el mismo beneficio usando capital muy distinto.
              El ROI permite compararlos, pero no mide cuánto tardará la orden en
              llenarse ni el riesgo de transportar el lote.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Paso 5: interpreta la confianza
            </h2>
            <p className="mt-3">
              La confianza no mide si el objeto es bueno. Mide cuánta evidencia existe
              para confiar en los precios usados. El plan toma la peor señal entre la
              compra y la orden del Black Market.
            </p>
            <dl className="mt-4 grid gap-3 md:grid-cols-3">
              <Term title="Alta">
                Precio reciente, suficientes observaciones, volumen razonable y valor
                cercano a su mediana histórica.
              </Term>
              <Term title="Media">
                La operación tiene evidencia utilizable, pero alguno de los factores
                es moderado o el precio está envejeciendo.
              </Term>
              <Term title="Baja">
                Precio antiguo, poco historial, volumen bajo o diferencia fuerte
                frente al comportamiento habitual.
              </Term>
            </dl>
            <Note>
              Confianza alta no significa beneficio garantizado. Solo significa que
              la señal está mejor respaldada por los datos disponibles.
            </Note>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Materiales brutos, recuperados y consumo efectivo
            </h2>
            <p className="mt-3">
              La sección de materiales incluye únicamente los objetos cuya estrategia
              recomendada es fabricar. Si una fila recomienda comprar terminado, ese
              objeto no añade ingredientes a la lista de compra.
            </p>
            <Formula>
              recuperado esperado = material recuperable bruto × RRR
              <br />
              consumo efectivo = material bruto − recuperado esperado
            </Formula>
            <p>
              La lista de compra redondea hacia arriba las cantidades efectivas para
              evitar quedarse corto. Por eso puede mostrar una unidad más que la cifra
              decimal del cálculo económico.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Lista de compra por ciudad
            </h2>
            <p className="mt-3">
              Para cada material, la herramienta compara los precios disponibles en
              las ciudades configuradas y lo asigna a la más barata. Después agrupa
              todos los materiales que deberían comprarse en Bridgewatch, Martlock,
              Lymhurst, Fort Sterling, Thetford o Caerleon.
            </p>
            <p>
              “Más barato” se refiere al precio observado, no al costo completo de la
              ruta. Si ahorrar 2.000 de plata exige viajar con un mamut a otra ciudad,
              puede ser mejor comprar localmente. Usa la agrupación como plan inicial,
              no como obligación.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Peso estimado y orden de fabricación
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">Peso estimado</h3>
            <p className="mt-2">
              Es una aproximación para dimensionar el transporte. No sustituye el
              peso mostrado por Albion, las bonificaciones de montura, bolsas,
              habilidades o Premium. Confirma la carga dentro del juego antes de
              iniciar la ruta.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Orden de fabricación sugerido
            </h3>
            <p className="mt-2">
              Si un objeto seleccionado funciona como ingrediente de otro, el plan lo
              coloca primero. Esto evita intentar fabricar un producto final antes de
              preparar sus componentes. Cuando no hay dependencias, el orden es una
              recomendación organizativa y no cambia el beneficio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Qué significa “Sin cobertura”
            </h2>
            <p className="mt-3">
              “Sin cobertura” no significa que el beneficio sea cero. Significa que no
              se encontró una combinación compatible y utilizable para producir el
              cálculo. Las causas más habituales son:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>No existe una orden observada para ese objeto y calidad.</li>
              <li>La captura disponible es demasiado antigua o incompleta.</li>
              <li>El servidor, encantamiento o calidad no coincide.</li>
              <li>Faltan precios para uno o más materiales de fabricación.</li>
              <li>La API todavía no recibió datos recientes de ese mercado.</li>
            </ul>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Qué hacer cuando aparece
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-6">
              <li>Confirma el servidor seleccionado.</li>
              <li>Prueba calidad Normal si elegiste una calidad superior.</li>
              <li>Verifica el objeto exacto y su encantamiento.</li>
              <li>Revisa el estado de los datos y vuelve a calcular.</li>
              <li>Busca la orden directamente dentro del Black Market.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Ejemplo completo con dos objetos
            </h2>
            <p className="mt-3">
              Supón un lote con diez cascos y cinco armas. Después de consultar
              precios, el plan recomienda comprar los cascos terminados y fabricar las
              armas con foco.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Los cascos aportan beneficio y capital, pero no materiales.</li>
              <li>Las armas aportan sus materiales brutos y su retorno estimado.</li>
              <li>Los lingotes más baratos aparecen en Bridgewatch.</li>
              <li>Los artefactos aparecen en Caerleon y no reciben RRR.</li>
            </ul>
            <p className="mt-3">
              Si fabricar las armas requiere 400 lingotes recuperables y 5 artefactos,
              con un RRR de 30% el plan estima recuperar 120 lingotes. La compra
              efectiva queda en 280 lingotes y 5 artefactos.
            </p>
            <Formula>
              bruto: 400 lingotes + 5 artefactos
              <br />
              recuperado: 120 lingotes
              <br />
              efectivo: 280 lingotes + 5 artefactos
            </Formula>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Cómo funciona técnicamente sin ser un precio en vivo
            </h2>
            <p className="mt-3">
              La aplicación consulta capturas almacenadas de precios e historial. Para
              evitar una petición por cada fila, reúne los objetos y materiales únicos
              y los consulta en lotes. Después reutiliza esas respuestas en todos los
              cálculos del reporte.
            </p>
            <p>
              Esta arquitectura hace el cálculo más rápido y coherente, pero no puede
              impedir que una orden cambie después de la captura. La antigüedad, el
              volumen y el historial se muestran precisamente para que puedas medir esa
              incertidumbre.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Errores frecuentes
            </h2>
            <h3 className="mt-3 text-lg font-semibold text-text">
              Elegir calidad alta sin revisar la orden
            </h3>
            <p className="mt-2">
              Una calidad superior puede costar más y no tener demanda suficiente. No
              la elijas solo porque el objeto disponible en tu inventario tiene esa
              calidad.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Multiplicar beneficio sin comprobar volumen
            </h3>
            <p className="mt-2">
              Una orden puede absorber menos unidades que tu lote. Limita la ejecución
              al volumen que realmente existe dentro del juego.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Tratar el retorno como materiales gratis garantizados
            </h3>
            <p className="mt-2">
              El RRR es una estimación económica. Lotes pequeños pueden variar por
              redondeos y los ingredientes no recuperables no deben descontarse.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              Ignorar el costo de reunir ciudades
            </h3>
            <p className="mt-2">
              La ciudad más barata por material puede generar una ruta poco práctica.
              Valora tiempo, montura, riesgo y capacidad antes de seguir la lista al pie
              de la letra.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Lista de comprobación antes de ejecutar
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>Confirma servidor, objeto, encantamiento y calidad.</li>
              <li>Revisa qué estrategia ganó en cada fila.</li>
              <li>Comprueba beneficio, capital y ROI juntos.</li>
              <li>Abre las razones de confianza baja o media.</li>
              <li>Limita la cantidad al volumen real de la orden.</li>
              <li>Confirma los precios de materiales en cada ciudad.</li>
              <li>Verifica el peso real con tu montura y equipamiento.</li>
              <li>Comprueba nuevamente la orden del Black Market.</li>
              <li>Ejecuta primero un lote pequeño si la señal es incierta.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold text-text">
              Preguntas frecuentes
            </h2>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Los materiales consolidados incluyen objetos que conviene comprar?
            </h3>
            <p className="mt-2">
              No. Solo se consolidan ingredientes de las filas cuya estrategia
              recomendada es fabricar.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Beneficio total es la plata que recibiré con certeza?
            </h3>
            <p className="mt-2">
              No. Es una estimación basada en los precios y supuestos disponibles. El
              resultado real depende de que las órdenes sigan activas y del costo de
              ejecución.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Por qué aparece cero en el resumen cuando hay filas sin cobertura?
            </h3>
            <p className="mt-2">
              Las filas sin un cálculo resoluble no se suman. Cero significa que no hay
              líneas resueltas en el resumen actual, no que la oportunidad comprobada
              dentro del juego tenga exactamente beneficio cero.
            </p>
            <h3 className="mt-4 text-lg font-semibold text-text">
              ¿Dónde encuentro la herramienta?
            </h3>
            <p className="mt-2">
              Abre el <a className="text-accent underline" href="/black-market">módulo del Black Market</a>
              y selecciona la pestaña <strong className="text-text">Planificador batch</strong>.
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
                text: "Impuesto, transporte, liquidez, riesgo y precio de equilibrio.",
              },
              {
                href: "/guias/retorno-materiales-rrr-albion-online",
                title: "Retorno de materiales (RRR)",
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
