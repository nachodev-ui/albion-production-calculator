# Optimizador de rentabilidad con liquidez

## Objetivo

El optimizador compara la configuración actual con una combinación automática formada por:

1. la ciudad viable más barata para cada material de la receta activa;
2. la ciudad viable con mejor precio para vender el producto terminado;
3. el costo neto y el resultado económico de esa combinación;
4. el ahorro y la mejora total frente a las ciudades seleccionadas actualmente.

La comparación conserva receta, cantidad, ciudad de producción, RRR, foco, tarifa de estación, Premium, calidad, métodos de compra/venta y precios manuales.

## Validación histórica por candidato

Un precio positivo ya no basta para participar en la recomendación. Por cada combinación de ítem, ciudad y calidad con precio actual disponible, la aplicación consulta 28 días de historial del servicio local.

Cada candidato se evalúa con:

- mediana histórica de precio;
- volumen total de 28 días;
- promedio diario de unidades;
- días con actividad;
- cantidad neta necesaria para el cálculo actual;
- tiempo estimado para completar esa cantidad;
- antigüedad del precio actual;
- desviación del precio actual respecto de la mediana.

La cantidad de materiales incorpora el tamaño del lote, las salidas por tirada, las recetas expandidas y el RRR de cada etapa. Es una cantidad económica neta: explica el costo esperado, pero no representa necesariamente el inventario inicial exacto requerido para encadenar todos los crafteos.

## Detección de precios atípicos

La mediana diaria se usa como referencia robusta. Un candidato se descarta cuando el precio actual es extremadamente bajo o alto frente a esa mediana.

Los métodos que naturalmente operan con descuento —orden de compra y venta inmediata— usan un margen inferior más amplio que la compra inmediata y la orden de venta. Esto evita marcar como anomalía una diferencia normal entre ambos lados del mercado, pero sigue descartando casos absurdos como precios de pocas unidades de plata frente a historiales de decenas o cientos de miles.

## Confianza y elegibilidad

La aplicación clasifica cada candidato como:

- **Confianza alta:** actividad frecuente, historial amplio y tiempo estimado corto.
- **Confianza media:** volumen suficiente para la cantidad y actividad razonable.
- **Confianza baja o no elegible:** historial escaso, mercado lento, precio atípico o ausencia de ventas.

Solo los candidatos con confianza alta o media pueden formar parte de la combinación recomendada y del botón **Aplicar ciudades recomendadas**.

La fecha del precio actual funciona como señal de confianza, no como bloqueo absoluto. Si la fecha está ausente o es antigua, pero el historial de 28 días está actualizado, posee actividad suficiente y el precio es coherente con la mediana, el candidato puede seguir siendo elegible con confianza media. Nunca recibe confianza alta hasta contar con una fecha reciente.

Como límites de seguridad, un candidato se rechaza cuando, entre otros casos:

- no existe un precio actual válido;
- no posee ventas históricas útiles;
- la actividad se concentra en menos de dos días;
- completar la cantidad demoraría más de 14 días según el promedio de 28 días;
- el precio actual es atípico frente a la mediana histórica.

## Mercados descartados y advertencias

La interfaz cuenta los candidatos descartados, pero la advertencia roja se vincula a la configuración actual. Si la ciudad seleccionada no es elegible, se muestra la causa principal. Al cambiar a una ciudad viable, esa advertencia desaparece inmediatamente.

Cuando no existe ninguna recomendación viable, la interfaz puede mostrar el mejor precio teórico descartado para explicar por qué no fue utilizado, por ejemplo:

- precio atípico frente a la mediana;
- sin ventas históricas;
- actividad insuficiente;
- más de 14 días estimados para completar la cantidad.

De este modo Caerleon no se excluye globalmente: puede ser recomendado para objetos con mercado real, pero no gana por una orden residual o un precio sin liquidez.

## Caché

Los historiales se guardan por servidor, ciudad, ítem y calidad. La caché:

- dura 30 minutos antes de volver a consultar automáticamente;
- se persiste en `localStorage`;
- conserva hasta 400 combinaciones recientes;
- reutiliza solicitudes en curso para evitar consultas duplicadas;
- procesa las consultas del optimizador con concurrencia limitada a cuatro.

El botón **Reintentar historial** permite forzar una actualización cuando existen errores parciales.

## Límites

La evaluación usa ventas históricas como indicador de liquidez. No conoce la profundidad exacta del libro de órdenes, cuántas unidades están disponibles al primer precio, la posición futura de una orden, costos de transporte ni riesgo de traslado. Por eso la confianza es una estimación y no una garantía de ejecución.
