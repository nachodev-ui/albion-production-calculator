# Precios automáticos con Albion Online Data Project

La calculadora puede consultar precios actuales de Albion Online Data Project
(AODP) y utilizarlos como respaldo de los precios manuales.

## Configuración de mercado

La tarjeta **Configuración de mercado** permite seleccionar:

- servidor: Americas, Europe o Asia;
- ciudad donde se compran los materiales;
- ciudad donde se vende el producto;
- estrategia de compra;
- estrategia de venta.

Las estrategias se interpretan así:

| Operación | Estrategia | Campo AODP utilizado |
| --- | --- | --- |
| Materiales | Comprar inmediatamente | `sell_price_min` |
| Materiales | Colocar orden de compra | `buy_price_max` |
| Producto | Vender mediante orden | `sell_price_min` |
| Producto | Vender inmediatamente | `buy_price_max` |

La primera versión consulta calidad Normal (`quality = 1`).

## Prioridad de precios

Para cada material se aplica este orden:

1. precio manual asociado a la ruta del árbol;
2. precio automático AODP para el objeto, encantamiento y ciudad;
3. precio pendiente si ninguna fuente está disponible.

El precio de venta manual del producto también tiene prioridad. El botón
**Usar precio AODP** elimina únicamente ese override y vuelve al valor
automático disponible.

Un precio manual de `0` continúa siendo válido.

## Caché local

La configuración, los snapshots automáticos y los precios de venta manuales se
guardan en `localStorage`.

- Los snapshots de menos de 5 minutos se consideran suficientes para evitar una
  nueva solicitud.
- Si AODP falla, se conservan los últimos datos guardados y los precios
  manuales siguen disponibles.
- **Actualizar precios** fuerza una consulta para el objeto y sus ingredientes.
- **Limpiar caché** elimina únicamente los snapshots AODP; no borra los precios
  manuales existentes.

Cada snapshot conserva tanto las fechas de mercado entregadas por AODP como el
momento en que la aplicación realizó la consulta. Esos datos preparan la futura
clasificación de antigüedad y confianza.

## Solicitudes agrupadas

Los ingredientes visibles y las alternativas de la receta raíz se agrupan en
solicitudes por servidor, ciudades y calidad. Cuando la URL resultante se acerca
al límite del proveedor, la aplicación la divide en varios lotes.

## Alcance de este cambio

Incluido:

- precios actuales;
- servidor y ciudades;
- estrategias de compra y venta;
- override manual;
- retorno al precio automático;
- caché persistente y manejo de errores.

Pendiente para siguientes cambios:

- clasificación de antigüedad y confianza;
- historial de precios;
- volumen de ventas;
- lote máximo recomendado.
