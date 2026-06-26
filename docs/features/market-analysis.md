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
