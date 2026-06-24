# Optimizador de rentabilidad

## Alcance de esta primera versión

El optimizador compara la configuración de mercado actual con una combinación automática formada por:

1. la ciudad con el menor precio válido para cada material;
2. la ciudad con el mayor precio válido para vender el producto terminado;
3. el costo neto y el resultado económico obtenidos al aplicar ambas decisiones;
4. el ahorro de compra y la mejora total frente a las ciudades seleccionadas actualmente.

La comparación respeta la receta, cantidad, ciudad de producción, retorno de recursos, foco, tarifa de estación, estado Premium, calidad y métodos de compra/venta que ya están configurados.

## Datos utilizados

Al actualizar precios, la calculadora solicita:

- cada material en todos los mercados habilitados, con calidad normal;
- el producto terminado en todos los mercados habilitados, usando la calidad seleccionada;
- `sellPriceMin` para comprar inmediatamente o vender mediante orden;
- `buyPriceMax` para colocar una orden de compra o vender inmediatamente.

Los snapshots siguen usando la caché local de cinco minutos. El botón de actualización fuerza una consulta nueva de todas las combinaciones necesarias.

## Cómo se calcula

### Compra recomendada

Para cada identidad de material se selecciona el menor precio disponible. Cuando varias ciudades tienen el mismo precio mínimo, se conserva la ciudad actual para evitar un cambio innecesario.

### Venta recomendada

Se selecciona el mayor precio disponible para el método de venta actual. En caso de empate también se conserva la ciudad actual.

### Combinación completa

La calculadora vuelve a ejecutar el mismo caso de uso de costos con el mapa de precios recomendado. Así se mantienen correctamente:

- cantidades reales de la receta;
- materiales reutilizables y retorno de recursos;
- recetas expandidas o compradas directamente;
- tarifas de estación;
- opciones de receta seleccionadas;
- precios manuales por nodo, que siempre tienen prioridad.

El resultado económico óptimo usa la venta recomendada y descuenta las comisiones vigentes. La mejora total corresponde a:

```text
resultado económico optimizado - resultado económico de la configuración actual
```

El ahorro de compra corresponde a:

```text
costo neto actual - costo neto optimizado
```

## Aplicar la recomendación

El botón **Aplicar ciudades recomendadas** guarda una ciudad individual para cada material y actualiza la ciudad de venta. No modifica:

- la ciudad de producción;
- los métodos de compra o venta;
- la calidad;
- los precios manuales;
- el estado Premium;
- el RRR, foco o tarifas.

Si existe un precio manual de venta, la proyección del optimizador continúa comparando referencias automáticas, pero aplicar la recomendación no elimina ese precio manual.

## Límites actuales

Esta versión no incorpora costos de transporte, riesgo de traslado, volumen disponible, profundidad de órdenes ni velocidad histórica de venta. Tampoco cambia automáticamente la receta, la ciudad de producción o los bonos de producción. Esos factores pueden añadirse como siguientes etapas sin alterar el motor de comparación de mercados.
