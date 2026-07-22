# Análisis de mercado

## Comparación de precios

Los materiales pueden usar ciudades individuales, mientras el producto final
mantiene una ciudad y calidad de venta. La interfaz muestra origen, fecha y
frescura del precio efectivo.

## Historial de 7 y 28 días

El gráfico usa días UTC completos para no introducir el día actual incompleto en
los promedios. Presenta:

- precio promedio ponderado por volumen;
- mínimo y máximo diario;
- volumen total y promedio diario;
- días activos;
- volatilidad.

## Optimizador de rentabilidad

El optimizador combina precio actual, cantidad requerida e historial. Antes de
recomendar una ciudad evalúa:

- disponibilidad de precio;
- frescura;
- volumen histórico;
- tiempo estimado para completar la operación;
- precios atípicos respecto del historial;
- confianza de la recomendación.

Las consultas históricas del conjunto de candidatos se realizan en uno o pocos
batches centrales. El receiver solo completa combinaciones ausentes.

## Estrategias masivas del Black Market

La tabla del escáner compara, para cada resultado visible:

- comprar el objeto terminado y transportarlo;
- fabricar sin foco;
- fabricar con foco.

Las recetas de la página se recorren primero sin precios para obtener un conjunto
único de materiales. Ese conjunto se consulta en batch mediante el servicio de
precios existente y se reutiliza en todos los cálculos, evitando una petición por
fila. El análisis se limita a 100 oportunidades por página para mantener acotados
el uso de memoria, la cantidad de combinaciones y el trabajo del navegador.

La recomendación se puede filtrar u ordenar por estrategia, beneficio ajustado,
ROI ajustado o ventaja frente a comprar terminado.

## Planificador batch y lista de compra

El planificador Pro admite hasta 25 objetos por lote. Para cada objeto conserva la
cantidad, el encantamiento y la calidad objetivo. Al calcular:

- solicita las oportunidades compatibles mediante el endpoint batch existente del
  Black Market;
- reúne los ingredientes únicos de todas las recetas y los consulta mediante el
  mismo flujo batch, caché y fallback usado por la calculadora;
- compara comprar terminado, fabricar sin foco y fabricar con foco;
- muestra beneficio, ROI, capital requerido y confianza por objeto;
- consolida cantidades brutas, materiales recuperados por RRR y consumo efectivo;
- asigna cada material a la ciudad con el menor precio disponible;
- estima el peso del lote y ordena la fabricación respetando dependencias entre
  objetos seleccionados;
- exporta filas, resumen, materiales y orden de fabricación a CSV cuando el
  entitlement `exports.csv` está habilitado.

La confianza del lote no inventa una señal nueva: para cada fila usa las reglas
compartidas de antigüedad, observaciones, volumen y desviación frente a la mediana.
El nivel visible corresponde a la peor señal entre la compra de ciudad y la orden
del Black Market.

El peso es deliberadamente aproximado. Se usa únicamente para planificación y se
presenta como estimación, ya que el dataset de recetas no contiene el peso oficial
de inventario de cada objeto.

### Alcance económico actual del planificador

El resumen batch usa impuesto, precios de compra, materiales, retorno y tarifas de
fabricación. En esta versión, sus costos de transporte, escolta, pérdida por muerte
y tiempo están configurados en cero. El usuario debe descontarlos antes de ejecutar
o revisar el detalle del escáner, donde esos supuestos sí son configurables.

Por esta razón, `beneficio` significa beneficio bajo los costos incluidos y no una
ganancia garantizada después de la ruta real.

### Ayuda para el usuario

La pestaña incluye una guía breve desplegable que explica:

- el flujo de cuatro pasos;
- las tres estrategias comparadas;
- capital, ROI, consumo efectivo y confianza;
- por qué `Sin cobertura` no equivale a beneficio cero.

La guía pública completa se publica en
`/guias/planificador-batch-lista-compra-albion-online`. Explica conceptos del juego,
fórmulas, estados sin cobertura, arquitectura batch, un ejemplo completo, errores
frecuentes y una lista de comprobación antes de invertir.

## Valor económico del foco

El beneficio con foco se presenta de dos formas:

- beneficio contable, que descuenta fabricación, impuesto y logística directa;
- beneficio ajustado, que también descuenta el costo de oportunidad del foco.

La interfaz muestra foco requerido, beneficio adicional frente a fabricar sin
foco, plata obtenida por punto de foco y un valor mínimo configurable. Una
estrategia con foco solo gana la comparación ajustada cuando su mejora compensa
ese valor configurado.

## Calidad esperada

El escáner estima una distribución para Normal, Buena, Sobresaliente, Excelente
y Obra maestra. El valor `Increase in Quality` se interpreta como probabilidad de
tiradas adicionales y se conserva la mejor tirada. El foco modifica el retorno de
recursos, pero no añade una tirada de calidad en este modelo.

Para una orden de calidad superior se muestran:

- probabilidad de alcanzar la calidad mínima;
- unidades esperadas que pueden cubrir la orden;
- unidades esperadas en otras calidades;
- ingreso de órdenes alternativas observadas;
- ingreso bruto ponderado.

Cuando una calidad inferior no tiene una orden observada en la página, el usuario
puede asignar un porcentaje conservador del precio objetivo. El valor
predeterminado es cero para no inventar ingresos.

## Logística y riesgo

La fabricación del escáner de oportunidades separa los siguientes costos:

- materiales hacia la ciudad de producción;
- producto terminado hacia Caerleon;
- escolta, consumibles o protección;
- pérdida esperada por muerte;
- valor del tiempo invertido.

La pérdida esperada se calcula como inversión directa por probabilidad de pérdida
del lote. Estos supuestos no alteran los precios almacenados ni la orden del Black
Market; únicamente producen un beneficio económico ajustado para comparar las
estrategias con criterios homogéneos.
