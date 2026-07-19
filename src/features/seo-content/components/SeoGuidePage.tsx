import type { ReactNode } from "react";
import type { SeoGuideRoute } from "@app/types";

interface SeoGuidePageProps {
  readonly route: SeoGuideRoute;
}

interface GuideLink {
  readonly href: string;
  readonly title: string;
  readonly description: string;
}

const GUIDE_LINKS: readonly GuideLink[] = [
  {
    href: "/guias/rentabilidad-crafteo-albion-online",
    title: "Rentabilidad de crafteo",
    description: "Costo real, impuestos, tarifa y precio de equilibrio.",
  },
  {
    href: "/guias/retorno-materiales-rrr-albion-online",
    title: "Retorno de materiales (RRR)",
    description: "Production Bonus, devolución y ahorro por lote.",
  },
  {
    href: "/guias/black-market-caerleon-rentable",
    title: "Black Market de Caerleon",
    description: "Compra, fabricación, transporte, beneficio y ROI.",
  },
];

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

function GuideShell({
  title,
  description,
  updated,
  children,
  activeHref,
}: {
  readonly title: string;
  readonly description: string;
  readonly updated: string;
  readonly children: ReactNode;
  readonly activeHref: string;
}) {
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
          <span>Guías</span>
        </nav>

        <header className="mt-6 border-b border-border pb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Guía de economía de Albion Online
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-text sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            {description}
          </p>
          <p className="mt-4 text-xs text-text-faint">
            Actualizado: {updated} · Lectura práctica · Sin valores de mercado
            fijos
          </p>
        </header>

        <div className="prose-albion mt-8 space-y-6 text-[15px] leading-7 text-text-muted">
          {children}
        </div>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-semibold text-text">
            Continúa con estas guías
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {GUIDE_LINKS.filter((guide) => guide.href !== activeHref).map(
              (guide) => (
                <a
                  key={guide.href}
                  href={guide.href}
                  className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent-border hover:bg-accent-muted/35"
                >
                  <h3 className="text-sm font-semibold text-text">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-text-faint">
                    {guide.description}
                  </p>
                </a>
              ),
            )}
          </div>
        </section>
      </article>
    </main>
  );
}

function CraftingProfitGuide() {
  return (
    <GuideShell
      title="Cómo calcular la rentabilidad de crafteo en Albion Online"
      description="Aprende a calcular el costo real de fabricación, el ingreso neto, el beneficio por unidad y el precio de equilibrio sin confundir el costo bruto de materiales con lo que realmente consumes."
      updated="19 de julio de 2026"
      activeHref="/guias/rentabilidad-crafteo-albion-online"
    >
      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Respuesta rápida: la ganancia no es venta menos materiales
        </h2>
        <p className="mt-3">
          Para saber si un crafteo es rentable debes descontar del ingreso de
          venta los impuestos, el costo efectivo de los materiales después del
          retorno y la tarifa del puesto. También debes calcular por cuántas
          tiradas reales se fabrica el lote: una receta que produce varias
          unidades no se comporta igual que una receta de una unidad.
        </p>
        <Formula>
          beneficio = venta neta − materiales consumidos − tarifa del puesto
        </Formula>
        <p>
          La fórmula parece simple, pero cada término necesita una fuente
          correcta. El precio de venta debe corresponder a la misma calidad,
          encantamiento y ciudad. El costo del puesto debe ser el <em>Total
          Cost</em> que Albion muestra para la cantidad elegida. El retorno de
          materiales debe aplicarse únicamente a los ingredientes recuperables.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          1. Calcula el costo bruto de los materiales
        </h2>
        <p className="mt-3">
          Multiplica la cantidad requerida de cada ingrediente por su precio
          unitario. Si compras materiales en ciudades distintas, conserva la
          ciudad de cada precio: usar Bridgewatch para un lingote y Martlock
          para un artefacto puede ser válido, pero debes incluir el esfuerzo o
          costo de reunirlos.
        </p>
        <Formula>
          costo bruto = Σ (cantidad del material × precio unitario)
        </Formula>
        <h3 className="text-lg font-semibold text-text">
          No mezcles precios incomparables
        </h3>
        <p className="mt-2">
          Una orden de compra normalmente representa un costo menor, pero exige
          espera y liquidez. Comprar inmediatamente utiliza la venta más barata
          disponible. Elige una estrategia y mantenla para todos los materiales
          del escenario que estás evaluando.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          2. Descuenta el retorno de materiales de forma correcta
        </h2>
        <p className="mt-3">
          El RRR reduce la cantidad esperada de recursos consumidos. No es un
          descuento sobre el precio del producto terminado ni una devolución de
          plata. El juego devuelve unidades de ciertos materiales después de
          cada tirada y esas unidades pueden reutilizarse o valorarse al precio
          de reposición.
        </p>
        <Formula>
          costo efectivo esperado = costo bruto recuperable × (1 − RRR) + costo
          no recuperable
        </Formula>
        <p>
          Los artefactos y otros ingredientes excluidos de la devolución deben
          permanecer al costo completo. En lotes pequeños, el resultado real
          puede variar por redondeos; por eso la calculadora presenta una
          estimación económica y no promete una cantidad exacta en cada tirada.
        </p>
        <p>
          Para profundizar en Production Bonus, foco y materiales excluidos,
          consulta la guía de <a className="text-accent underline" href="/guias/retorno-materiales-rrr-albion-online">retorno de materiales en Albion Online</a>.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          3. Añade la tarifa real del puesto
        </h2>
        <p className="mt-3">
          La forma más segura es seleccionar la cantidad que fabricarás, abrir
          el cuadro de confirmación y copiar el valor <strong className="text-text">Coste total</strong>
          antes de pagar. Ese valor evita reconstruir manualmente nutrición,
          Item Value y tarifa por cien de nutrición.
        </p>
        <Note>
          Si copias el coste para una unidad y luego calculas cien unidades sin
          escalarlo, el beneficio quedará artificialmente inflado. Guarda
          siempre la cantidad asociada al valor copiado.
        </Note>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          4. Convierte el precio de venta en ingreso neto
        </h2>
        <p className="mt-3">
          El precio publicado no es lo mismo que el dinero recibido. Descuenta
          el impuesto aplicable y cualquier tarifa de preparación de la orden
          que tu escenario considere. Si vendes inmediatamente a una orden de
          compra, utiliza ese lado del mercado; si colocarás una orden de venta,
          usa un precio y una tasa coherentes con esa decisión.
        </p>
        <Formula>
          ingreso neto = precio de venta × (1 − tasa efectiva)
        </Formula>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          5. Obtén beneficio, ROI y precio de equilibrio
        </h2>
        <Formula>
          beneficio unitario = ingreso neto unitario − costo total unitario
          <br />
          ROI = beneficio / costo total × 100
        </Formula>
        <p>
          El beneficio responde cuánto ganas; el ROI permite comparar objetos
          de precios muy distintos. Un beneficio alto con ROI mínimo puede
          inmovilizar mucha plata. Un ROI alto con volumen casi inexistente
          puede no venderse. Revisa ambos junto con antigüedad y liquidez.
        </p>
        <h3 className="text-lg font-semibold text-text">
          Precio de equilibrio
        </h3>
        <p className="mt-2">
          Es el precio mínimo de venta necesario para cubrir el costo después
          del impuesto. Si el mercado está por debajo, fabricar destruye valor
          en ese escenario; si está por encima, existe margen antes de riesgo,
          tiempo y transporte.
        </p>
        <Formula>
          precio de equilibrio = costo total unitario / (1 − tasa efectiva)
        </Formula>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Ejemplo de decisión
        </h2>
        <p className="mt-3">
          Supón materiales brutos por 100.000 de plata, de los cuales 90.000 son
          recuperables. Con un RRR esperado de 30%, el consumo esperado de esos
          recursos es 63.000; al sumar 10.000 no recuperables y 4.000 de puesto,
          el costo económico queda en 77.000. Si la venta neta después de
          impuesto es 92.000, el beneficio esperado es 15.000.
        </p>
        <p>
          El mismo objeto puede dejar de ser rentable si el artefacto sube, el
          precio de venta envejece o el puesto cobra más. Por eso conviene
          guardar la configuración y recalcular con datos recientes, no memorizar
          un margen histórico.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Preguntas frecuentes
        </h2>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿La especialización aumenta directamente el RRR?
        </h3>
        <p className="mt-2">
          La especialización mejora principalmente la eficiencia de costo de
          foco y la probabilidad de calidad. Con el mismo foco disponible puedes
          completar más producción, pero no debes tratar el número de
          especialización como un porcentaje adicional de retorno.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿Debo valorar los materiales recuperados al precio de compra?
        </h3>
        <p className="mt-2">
          Para medir costo de reposición, sí: una unidad recuperada evita comprar
          otra unidad al precio utilizado en el escenario. Para contabilidad
          histórica podrías usar otro método, pero no mezcles criterios dentro
          del mismo cálculo.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿Dónde hago el cálculo?
        </h3>
        <p className="mt-2">
          Abre la <a className="text-accent underline" href="/">calculadora de crafteo de Albion Online</a>,
          selecciona el objeto, configura cantidades, ciudades, RRR y costo del
          puesto, y compara el beneficio neto antes de fabricar.
        </p>
      </section>
    </GuideShell>
  );
}

function ResourceReturnRateGuide() {
  return (
    <GuideShell
      title="Retorno de materiales (RRR) en Albion Online: fórmula y ejemplos"
      description="Entiende qué significa Resource Return Rate, cómo se relaciona con Production Bonus y foco, cuántos materiales recuperas y por qué no debes aplicar el porcentaje a artefactos no retornables."
      updated="19 de julio de 2026"
      activeHref="/guias/retorno-materiales-rrr-albion-online"
    >
      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Qué es el RRR en Albion Online
        </h2>
        <p className="mt-3">
          El <strong className="text-text">Resource Return Rate</strong> o RRR
          es el porcentaje esperado de materiales recuperados al fabricar o
          refinar. El juego devuelve recursos, no plata. Si una receta consume
          ocho lingotes y el retorno esperado es 25%, el valor económico medio
          equivale a recuperar dos lingotes por tirada, aunque el redondeo real
          puede distribuirse entre varias fabricaciones.
        </p>
        <Formula>
          materiales recuperados esperados = materiales recuperables × RRR
        </Formula>
        <p>
          La palabra “esperados” es importante: en cantidades pequeñas el juego
          debe devolver unidades enteras. A medida que aumenta el número de
          tiradas, el promedio tiende a aproximarse al porcentaje mostrado.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Production Bonus y RRR no son el mismo número
        </h2>
        <p className="mt-3">
          El Production Bonus expresa producción adicional posible si reinviertes
          continuamente todos los recursos devueltos. El RRR expresa qué fracción
          de los ingredientes vuelve en cada ciclo. Por eso no debes copiar un
          bono de producción como si fuera el porcentaje directo de devolución.
        </p>
        <Formula>
          RRR = 1 − 1 / (1 + Production Bonus / 100)
        </Formula>
        <p>
          Por ejemplo, un Production Bonus de 50% no equivale a devolver 50% de
          cada lote. La fórmula convierte ese bono acumulativo en un retorno por
          ciclo cercano a 33,3%.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          De dónde proviene el retorno
        </h2>
        <h3 className="mt-3 text-lg font-semibold text-text">
          Ciudad o ubicación de producción
        </h3>
        <p className="mt-2">
          Las ciudades, islas vinculadas, escondites y otros lugares pueden
          ofrecer bonos generales o especializados. Una ciudad adecuada para
          fabricar una familia de objetos puede reducir el consumo efectivo de
          materiales frente a una ciudad sin esa especialización.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">Uso de foco</h3>
        <p className="mt-2">
          El foco aumenta la devolución al fabricar o refinar. Los personajes
          con Premium regeneran foco y pueden invertirlo en las producciones con
          mejor valor por punto. La pregunta correcta no es solo cuánto ahorra
          el foco por unidad, sino cuánto beneficio adicional produce cada punto
          limitado.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          Bono diario y otras bonificaciones
        </h3>
        <p className="mt-2">
          Los bonos temporales pueden alterar el retorno del escenario. Como
          cambian, deben configurarse como una condición de la tirada y no como
          una propiedad permanente del objeto.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Qué hace Focus Cost Efficiency
        </h2>
        <p className="mt-3">
          La eficiencia de costo de foco reduce los puntos necesarios para
          activar el beneficio de foco. No es un porcentaje de RRR que se sume
          directamente. Dos personajes pueden ver el mismo retorno con foco,
          pero el personaje especializado gastará menos puntos para fabricar la
          misma cantidad.
        </p>
        <Formula>
          foco efectivo por lote = foco base ajustado por eficiencia × tiradas
        </Formula>
        <p>
          Esto transforma la especialización en capacidad diaria: con el mismo
          límite de foco puedes fabricar más tiradas y capturar más ahorro total.
          Para comparar objetos, calcula beneficio adicional por punto de foco,
          no solo beneficio por unidad.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Materiales recuperables y no recuperables
        </h2>
        <p className="mt-3">
          No todos los ingredientes deben recibir el descuento del RRR. En
          objetos de artefacto, los recursos normales pueden devolverse, pero el
          artefacto se consume. Aplicar el retorno al costo completo del objeto
          subestima el costo real y puede convertir una pérdida en una falsa
          oportunidad.
        </p>
        <Formula>
          ahorro RRR = costo de materiales recuperables × RRR
          <br />
          costo real = costo bruto − ahorro RRR
        </Formula>
        <Note>
          Verifica la elegibilidad por ingrediente. Nunca apliques el porcentaje
          automáticamente a artefactos, componentes especiales o elementos que
          la receta consuma de manera permanente.
        </Note>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Ejemplo con un lote
        </h2>
        <p className="mt-3">
          Un lote necesita 800 lingotes y 100 artefactos. Si el RRR configurado
          es 30%, la devolución esperada se calcula sobre los 800 lingotes: 240
          unidades. Los 100 artefactos siguen consumiéndose. Si cada lingote vale
          1.000 de plata, el ahorro esperado es 240.000; el precio de los
          artefactos no recibe descuento.
        </p>
        <p>
          Para estimar el siguiente ciclo puedes reinvertir los lingotes
          recuperados. Para calcular beneficio contable del lote inicial, basta
          con valorar el ahorro de reposición una vez y evitar contar la misma
          devolución dos veces.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Errores frecuentes al calcular retorno
        </h2>
        <h3 className="mt-3 text-lg font-semibold text-text">
          Aplicar RRR al producto terminado
        </h3>
        <p className="mt-2">
          El retorno afecta ingredientes. No multipliques el precio de venta por
          el RRR ni lo trates como unidades extra del objeto, salvo mecánicas
          específicas que produzcan rendimiento adicional.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          Sumar porcentajes sin convertir Production Bonus
        </h3>
        <p className="mt-2">
          Usa el RRR final mostrado por el juego o una conversión validada. Sumar
          directamente bonos visibles y llamarlos devolución genera resultados
          exagerados.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          Esperar una devolución exacta en una tirada
        </h3>
        <p className="mt-2">
          El porcentaje representa un promedio. Un lote pequeño puede devolver
          una unidad más o menos por redondeo; el cálculo económico es más
          estable al evaluar varias tiradas.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Preguntas frecuentes
        </h2>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿El RRR reduce la tarifa del puesto?
        </h3>
        <p className="mt-2">
          No. La tarifa es un costo de fabricación separado. Copia el Coste
          total mostrado por Albion o utiliza la estimación avanzada de tarifa y
          nutrición.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿Conviene usar foco en cualquier objeto?
        </h3>
        <p className="mt-2">
          No necesariamente. Compara el ahorro adicional y el beneficio por
          punto de foco. Un objeto de margen bajo puede consumir un recurso
          diario limitado que produciría más plata en otra receta.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿Cómo uso el RRR en una decisión real?
        </h3>
        <p className="mt-2">
          Configúralo en la <a className="text-accent underline" href="/">calculadora de producción</a>,
          revisa los materiales devueltos y luego consulta la guía de <a className="text-accent underline" href="/guias/rentabilidad-crafteo-albion-online">rentabilidad de crafteo</a>
          para integrar tarifa, impuesto e ingreso neto.
        </p>
      </section>
    </GuideShell>
  );
}

function BlackMarketProfitGuide() {
  return (
    <GuideShell
      title="Cómo saber si vender en el Black Market de Caerleon es rentable"
      description="Calcula el beneficio neto de comprar o fabricar un objeto para el Black Market, incluyendo impuesto, transporte, retorno de materiales, antigüedad del precio, liquidez y riesgo de llegar a Caerleon."
      updated="19 de julio de 2026"
      activeHref="/guias/black-market-caerleon-rentable"
    >
      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Qué significa una oportunidad rentable en el Black Market
        </h2>
        <p className="mt-3">
          El Black Market es un comprador del sistema ubicado en Caerleon. Una
          diferencia positiva entre su orden de compra y el precio de una ciudad
          no garantiza ganancia. La oportunidad solo es real cuando el ingreso
          neto supera compra o fabricación, impuesto, transporte y el costo del
          riesgo asumido.
        </p>
        <Formula>
          beneficio neto = pago del Black Market − impuesto − costo de origen −
          transporte
        </Formula>
        <p>
          Además, la orden observada puede cambiar antes de tu llegada. Por eso
          debes considerar antigüedad, volumen y margen de seguridad, no solo el
          mejor resultado de una captura.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Estrategia 1: comprar el objeto y transportarlo
        </h2>
        <p className="mt-3">
          Esta estrategia compara el costo de comprar el producto terminado en
          una ciudad con el pago disponible en Caerleon. Es rápida y no exige
          especialización ni foco, pero depende de encontrar suficiente volumen
          al precio observado.
        </p>
        <Formula>
          beneficio de transporte = ingreso neto BM − precio de compra − costo
          de transporte
        </Formula>
        <h3 className="text-lg font-semibold text-text">
          Compra inmediata u orden de compra
        </h3>
        <p className="mt-2">
          Comprar inmediatamente permite ejecutar antes, pero reduce el margen.
          Una orden de compra puede mejorar el costo, aunque la oportunidad del
          Black Market podría desaparecer mientras esperas. Evalúa ambas como
          escenarios separados.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Estrategia 2: fabricar con RRR y vender en Caerleon
        </h2>
        <p className="mt-3">
          Fabricar puede superar a comprar cuando la ciudad de producción ofrece
          buen retorno, el personaje usa foco eficientemente o los materiales
          están baratos. El cálculo debe incluir todos los ingredientes, la
          devolución elegible, el puesto y la cantidad real fabricada.
        </p>
        <Formula>
          costo de fabricación = materiales brutos − ahorro RRR + puesto
          <br />
          beneficio de fabricación = ingreso neto BM − costo de fabricación −
          transporte
        </Formula>
        <p>
          Compara este costo con el precio del objeto terminado. Si fabricar
          ahorra 5.000 por unidad pero requiere foco valioso que podría producir
          más beneficio en otra receta, la aparente ventaja no es necesariamente
          la mejor decisión global.
        </p>
        <p>
          Revisa la <a className="text-accent underline" href="/guias/retorno-materiales-rrr-albion-online">guía de RRR</a>
          para evitar descontar artefactos no recuperables.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Impuesto e ingreso neto
        </h2>
        <p className="mt-3">
          La cifra que ves en la orden no siempre es el ingreso final. Configura
          la tasa efectiva correspondiente y evita reutilizar una tasa antigua
          como si fuera permanente. La calculadora debe mostrar por separado el
          pago bruto, el impuesto y el ingreso neto.
        </p>
        <Formula>
          ingreso neto BM = precio de la orden × (1 − tasa efectiva)
        </Formula>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Cómo valorar el transporte y el riesgo
        </h2>
        <p className="mt-3">
          Caerleon está rodeada por zonas rojas. El costo no es únicamente la
          reparación o el tiempo: existe una probabilidad de perder carga y
          montura. Para comparar oportunidades puedes usar una provisión por
          unidad basada en el valor transportado, la frecuencia de pérdidas y el
          tamaño del lote.
        </p>
        <Formula>
          costo esperado de riesgo por unidad = pérdida esperada del viaje /
          unidades transportadas
        </Formula>
        <p>
          No existe un porcentaje universal. Un jugador con escolta, horarios y
          rutas controladas tendrá un costo esperado distinto de alguien que
          cruza solo con todo su capital. Configura una cifra conservadora que
          refleje tu operación.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Frescura, liquidez y competencia
        </h2>
        <h3 className="mt-3 text-lg font-semibold text-text">
          Antigüedad del precio
        </h3>
        <p className="mt-2">
          Una captura antigua aumenta la probabilidad de que la orden ya no
          exista o haya bajado. Exige mayor margen cuando el dato está envejecido
          y descarta oportunidades que superen tu límite de frescura.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">Liquidez</h3>
        <p className="mt-2">
          Beneficio por unidad no indica cuántas unidades puede absorber la
          orden. Multiplica solo por el volumen que razonablemente podrás vender,
          no por una cantidad arbitraria del lote.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          Competencia desde Caerleon
        </h3>
        <p className="mt-2">
          Crafters y comerciantes locales pueden llenar la orden antes que tú.
          Una diferencia pequeña frente al mercado de Caerleon es más frágil que
          una oportunidad con margen amplio y demanda persistente.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Beneficio por unidad, beneficio por lote y ROI
        </h2>
        <Formula>
          beneficio del lote = beneficio unitario × unidades vendibles
          <br />
          ROI = beneficio neto / capital comprometido × 100
        </Formula>
        <p>
          Usa unidades vendibles, no unidades transportadas, si el volumen de la
          orden es menor. El ROI ayuda a elegir entre una oportunidad grande que
          inmoviliza mucho capital y varias operaciones pequeñas. Acompáñalo con
          tiempo de ejecución: un 5% que rota varias veces puede superar un 20%
          que tarda semanas.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Lista de comprobación antes de salir
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>Actualiza precios de la ciudad y del Black Market.</li>
          <li>Confirma calidad, tier y encantamiento exactos.</li>
          <li>Limita la cantidad al volumen disponible.</li>
          <li>Descuenta impuesto y transporte.</li>
          <li>Compara comprar terminado contra fabricar con RRR.</li>
          <li>Reserva margen para cambios de precio y riesgo.</li>
          <li>No comprometas plata que necesitas para operar.</li>
        </ol>
        <Note>
          Una recomendación del escáner es una señal basada en capturas, no una
          garantía de venta. Comprueba la orden dentro del juego antes de comprar
          o fabricar el lote completo.
        </Note>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-text">
          Preguntas frecuentes
        </h2>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿El Black Market compra recursos?
        </h3>
        <p className="mt-2">
          Su función principal es comprar objetos terminados que alimentan el
          sistema de botín. Verifica la categoría exacta en el juego y en el
          escáner antes de preparar una ruta.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿Siempre paga más que una ciudad normal?
        </h3>
        <p className="mt-2">
          No. Las órdenes cambian según demanda y existencias. Algunos objetos
          tienen margen, otros pagan menos que el mercado regular o no tienen una
          orden útil.
        </p>
        <h3 className="mt-4 text-lg font-semibold text-text">
          ¿Dónde comparo oportunidades?
        </h3>
        <p className="mt-2">
          Abre el <a className="text-accent underline" href="/black-market">escáner del Black Market</a>
          para filtrar beneficio, ROI, frescura y categorías. Después abre el
          detalle y compara compra y fabricación antes de ejecutar.
        </p>
      </section>
    </GuideShell>
  );
}

export function SeoGuidePage({ route }: SeoGuidePageProps) {
  if (route === "guide-resource-return-rate") {
    return <ResourceReturnRateGuide />;
  }
  if (route === "guide-black-market-profit") {
    return <BlackMarketProfitGuide />;
  }
  return <CraftingProfitGuide />;
}
