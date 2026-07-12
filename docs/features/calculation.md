# Cálculo de producción

## Capacidades

- Navegación por categorías, ramas, familias y tiers.
- Recetas reales y alternativas de equipo.
- Cantidad de fabricación y árbol de materiales.
- Retorno de recursos global y recursos retornables.
- Tarifas de estación, nutrición, foco y especialización.
- Producción en ciudades, islas y Hideouts.
- Fama de fabricación, estudio, diarios y proyección de especialización.
- Presets de producción y venta.

## Recetas Royal

Las recetas de equipo Royal consumen una pieza base y Sellos Reales. Al seleccionar
una variante, el resumen de materiales cambia automáticamente a **Requisitos de
receta Royal** y muestra las cantidades totales necesarias para el lote actual.

La detección se realiza por la presencia del Sello Real oficial en la opción de
receta seleccionada, por lo que cubre las variantes de armadura de tela, cuero y
placas en todos los tiers soportados.

La interfaz diferencia claramente:

- la pieza base elegida y su encantamiento;
- la cantidad total de Sellos Reales;
- el número de tiradas necesarias;
- los materiales recuperados dentro de subrecetas expandidas, si existen.

La pieza base terminada y los Sellos Reales se consumen por completo durante la
conversión Royal. El RRR no reduce esas cantidades. Si la pieza base se fabrica
dentro del árbol expandido, sus recursos refinados sí pueden generar retorno en
esa etapa anterior y se muestran en una sección independiente.

## Producción en Hideout

Al seleccionar **Hideout (HO)** como lugar de producción aparecen dos parámetros:

- **Calidad de zona**, del 1 al 6.
- **Nivel de energía o poder**, del 1 al 9.

La combinación de ambos determina el Resource Return Rate base del HO. La interfaz
muestra simultáneamente el RRR sin foco, el RRR con foco y el bono de producción
equivalente para la selección actual.

El nivel de energía mantiene además sus datos operativos:

| Nivel | Energía acumulada | Bono general | Bono especialista |
|---:|---:|---:|---:|
| 1 | 800 | 0% | 0% |
| 2 | 1.650 | 6% | 3,75% |
| 3 | 3.250 | 11% | 7,50% |
| 4 | 6.500 | 15% | 11,25% |
| 5 | 11.250 | 18% | 15% |
| 6 | 18.750 | 20% | 18,75% |
| 7 | 30.000 | 22% | 22,50% |
| 8 | 45.000 | 24% | 26,25% |
| 9 | 60.000 | 26% | 30% |

El bono especialista no se suma nuevamente al RRR. Cuando se marca **HO
especializado para este objeto**, se combina con la eficiencia del Destiny Board
para reducir el foco requerido.

Los bonos diarios se aplican sobre el bono de producción equivalente del RRR de
la tabla:

```text
Production Bonus equivalente = RRR / (1 - RRR)
Production Bonus total = equivalente + bono diario
RRR final = Production Bonus total / (1 + Production Bonus total)
```

Los presets guardan calidad de zona, nivel de energía, especialización, foco,
bono diario y configuración económica asociada. Los presets anteriores se migran
con calidad de zona 1.

## Resultado económico

La interfaz distingue:

- inversión inicial;
- resultado en plata;
- valor de materiales recuperados;
- resultado económico total.

El valor recuperado no se trata como una venta obligatoria. Representa recursos
que pueden reinvertirse en crafteos posteriores.

## Precios manuales

Los precios manuales tienen prioridad sobre cualquier snapshot automático. Se
persisten por objeto y encantamiento y pueden eliminarse para volver a la fuente
automática.
