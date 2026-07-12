# Cálculo de producción

## Capacidades

- Navegación por categorías, ramas, familias y tiers.
- Recetas reales y alternativas de equipo.
- Cantidad de fabricación y árbol de materiales.
- Retorno de recursos global y recursos retornables.
- Tarifas de estación, nutrición, foco y especialización.
- Producción en ciudades, islas y Hideouts de zona negra.
- Fama de fabricación, estudio, diarios y proyección de especialización.
- Presets de producción y venta.

## Producción en Hideout

Al seleccionar **Hideout (HO)** como lugar de producción, la configuración
permite elegir el nivel de energía o poder actual, del 1 al 9. Cada nivel muestra
la energía acumulada, el bono general que participa en el RRR y el bono
especialista disponible para reducir el foco.

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

La fórmula aplicada es:

```text
RRR = bono de producción total / (1 + bono de producción total)
```

El cálculo distingue dos efectos:

1. El bono base del HO (`15%`) y el bono general del nivel se incorporan al
   bono de producción usado por el RRR.
2. El bono especialista no se suma nuevamente al RRR. Cuando se marca
   **HO especializado para este objeto**, se combina con la eficiencia del
   Destiny Board para reducir el foco requerido.

Por ejemplo, un HO nivel 9 sin foco utiliza `15% + 26% = 41%` de bono local,
lo que produce aproximadamente `29,1%` de retorno. Con foco, el bono total llega
a `100%` y el RRR resultante es `50%` antes de considerar un bono diario.

Los niveles y bonos se modelan desde los valores de `hideouts.xml` del cliente
de Albion Online. Los presets guardan el lugar de producción, nivel del HO,
especialización, foco, bono diario y configuración económica asociada. Los
presets antiguos se migran con HO nivel 1 y especialización desactivada.

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
