# Planificador multinivel de refinamiento

El planificador avanzado extiende la calculadora de refinamiento sin reemplazar el cálculo individual existente.

## Alcance

- compara automáticamente todas las combinaciones de ciudad de compra, refinamiento y venta;
- modela cadenas desde T4 hasta el tier final seleccionado, con soporte T4→T8;
- reutiliza el retorno esperado del refinado anterior para alimentar el tier siguiente;
- permite que compra, refinamiento y venta ocurran en ciudades diferentes;
- calcula beneficio, ROI, capital inicial, costo efectivo, tarifa de estación y transporte por tramo;
- calcula la plata producida por foco en cada tier y ordena los tiers por eficiencia;
- muestra una lista de compra externa y las diez mejores rutas completas.

## Modelo de cadena

La cadena se construye desde el tier final hacia T4 para determinar cuánto refinado previo necesita cada nivel. Luego se evalúa de T4 hacia arriba.

Para cada tier:

1. se redondean las tiradas necesarias hacia arriba;
2. se calcula el material bruto requerido;
3. se calcula el retorno esperado según ciudad y uso de foco;
4. el consumo neto del refinado previo se convierte en el objetivo del tier inferior;
5. el retorno esperado se reutiliza en la misma planificación.

El plan compra externamente los recursos crudos de cada tier y el refinado T3 requerido por la receta T4. Los refinados T4 o superiores se producen dentro de la cadena.

## Ciudades y transporte

Cada ruta contiene tres decisiones independientes:

- ciudad de compra;
- ciudad de refinamiento;
- ciudad de venta.

El transporte se cobra por tramo cuando dos etapas consecutivas usan ciudades distintas:

- compra → refinamiento;
- refinamiento → venta.

El ranking evalúa todas las combinaciones disponibles y descarta las rutas con precios incompletos.

## Foco

La eficiencia de foco se calcula por tier con el nivel seleccionado y los niveles compartidos de los otros nodos. El planificador expone:

- foco total requerido;
- valor adicional de los retornos obtenidos por foco;
- plata por foco para cada tier;
- costo de oportunidad configurable;
- beneficio final después de descontar ese costo de oportunidad.

## Capital y resultado económico

El plan separa:

- **capital inicial:** compras externas brutas, tarifas y transporte antes de recibir retornos;
- **costo efectivo:** capital menos el valor de los materiales recuperados;
- **beneficio económico:** ingreso neto de mercado menos costo efectivo;
- **beneficio ajustado:** beneficio económico menos costo de oportunidad del foco;
- **resultado de caja:** ingreso neto menos capital inicial.

## Datos de mercado

No se requieren cambios en el receiver ni en la API central. El store actual ya consulta los ítems de la operación en todos los mercados regulares y conserva ambos lados del libro para resolver las estrategias de compra y venta seleccionadas.

Los retornos son valores esperados. En lotes pequeños, el redondeo real de Albion puede requerir inventario adicional respecto del promedio calculado.
