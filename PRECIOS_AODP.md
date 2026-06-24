# Precios automáticos con Albion Online Data Project

La calculadora puede consultar precios actuales de Albion Online Data Project
(AODP) y utilizarlos como respaldo de los precios manuales.

## Configuración de mercado

La tarjeta **Configuración de mercado** permite seleccionar:

- servidor: Americas, Europe o Asia;
- ciudad donde se compran los materiales;
- ciudad donde se vende el producto;
- estrategia de compra;
- estrategia de venta;
- calidad del producto terminado: Normal, Bueno, Sobresaliente, Excelente u
  Obra maestra.

Las estrategias se interpretan así:

| Operación | Estrategia | Campo AODP utilizado |
| --- | --- | --- |
| Materiales | Comprar inmediatamente | `sell_price_min` |
| Materiales | Colocar orden de compra | `buy_price_max` |
| Producto | Vender mediante orden | `sell_price_min` |
| Producto | Vender inmediatamente | `buy_price_max` |

La calidad elegida se utiliza para el precio de venta y el historial del
producto terminado. Los materiales se consultan siempre con calidad Normal
(`quality = 1`), porque los recursos empleados por las recetas no poseen
calidad de mercado.

## Prioridad de precios

Para cada material se aplica este orden:

1. precio manual asociado a la ruta del árbol;
2. precio automático AODP para el objeto, encantamiento y ciudad;
3. precio pendiente si ninguna fuente está disponible.

El precio de venta manual del producto también tiene prioridad. El botón
**Usar precio AODP** elimina únicamente ese override y vuelve al valor
automático disponible.

Un precio manual de `0` continúa siendo válido.

## Fecha y confianza del precio

Cada precio automático muestra:

- fecha y hora exactas informadas por AODP para el campo utilizado;
- tiempo relativo, por ejemplo, `actualizado hace 24 minutos`;
- un estado visual de confianza.

La clasificación utilizada es transparente:

| Antigüedad | Estado |
| --- | --- |
| Hasta 30 minutos | Reciente |
| Más de 30 minutos y hasta 6 horas | Aceptable |
| Más de 6 horas | Antiguo |
| Precio o fecha ausentes | Sin datos |

La fecha corresponde al precio seleccionado por la estrategia. Por ejemplo,
**Comprar inmediatamente** usa la fecha de `sell_price_min`, mientras que una
orden de compra usa la fecha de `buy_price_max`.

Cuando un precio automático antiguo está siendo utilizado, la interfaz muestra
una advertencia junto al valor. Si existe un override manual, el estado del
precio AODP permanece visible como referencia, pero no se considera activo.

La tarjeta de mercado resume cuántos precios están recientes, aceptables,
antiguos o sin datos. Esta confianza es una clasificación propia de la
aplicación; AODP entrega la fecha, no una garantía de vigencia ni liquidez.

## Caché local

La configuración, los snapshots automáticos y los precios de venta manuales se
guardan en `localStorage`.

- Los snapshots de menos de 5 minutos se consideran suficientes para evitar una
  nueva solicitud.
- Si AODP falla, se conservan los últimos datos guardados y los precios
  manuales siguen disponibles.
- **Actualizar precios** fuerza una consulta para el objeto, sus ingredientes y
  el historial del producto terminado.
- **Limpiar caché** elimina los snapshots actuales e históricos de AODP; no borra
  los precios manuales existentes.

Cada snapshot conserva por separado:

- la fecha del precio informada por AODP;
- el momento en que la aplicación realizó la consulta.

La confianza se calcula con la primera fecha, no con el momento de la consulta.
Por ello, volver a consultar un precio antiguo no lo convierte en reciente.

## Solicitudes agrupadas

Los materiales se agrupan por servidor y ciudad de compra con calidad Normal.
El producto terminado se consulta por separado con la ciudad de venta y la
calidad seleccionada. Cuando una URL se acerca al límite del proveedor, la
aplicación la divide en varios lotes.

## Alcance implementado

Incluido:

- precios actuales;
- servidor y ciudades;
- estrategias de compra y venta;
- selector de calidad para el producto terminado;
- override manual;
- retorno al precio automático;
- caché persistente y manejo de errores;
- fecha exacta y tiempo relativo;
- clasificación de confianza;
- advertencia por precios antiguos;
- historial diario de 7 y 28 días;
- precio promedio ponderado, mínimo y máximo;
- volumen total y promedio diario;
- volatilidad de precios;
- gráfico combinado de precio y volumen.

## Historial de precio y volumen

Para el producto terminado se consulta el endpoint histórico de AODP en la
ciudad de venta y calidad seleccionadas. La solicitud utiliza agregación diaria
(`time-scale = 24`) y conserva los últimos 28 días UTC completos. El límite
superior enviado a AODP avanza hasta la medianoche del día siguiente para no
perder los buckets del último día completo. La vista de 7 días se deriva desde
el mismo snapshot.

La aplicación normaliza la serie para incluir con volumen `0` los días que
AODP omite. Así, el volumen diario promedio no se infla contando únicamente
días con registros.

Las métricas se calculan de la siguiente manera:

- **Precio promedio:** ponderado por `item_count` cuando existe volumen.
- **Mínimo y máximo:** extremos de los precios promedio diarios observados.
- **Volumen diario:** volumen total dividido por 7 o 28 días, incluidos ceros.
- **Volatilidad:** desviación estándar de los precios promedio diarios dividida
  por su media, expresada como porcentaje.

El gráfico muestra la evolución del precio promedio diario y barras de volumen.
Los puntos históricos se guardan en una caché separada durante 30 minutos; si
la consulta falla, puede utilizarse el último snapshot local disponible.

AODP documenta el historial como datos de **órdenes de venta**. Por lo tanto,
cambiar entre **Vender mediante orden** y **Vender inmediatamente** modifica el
precio actual usado por la calculadora, pero no el gráfico histórico. El volumen
no representa todas las órdenes de compra, ventas garantizadas ni la liquidez
futura del objeto.

Pendiente para el siguiente cambio:

- lote máximo recomendado según volumen histórico.
