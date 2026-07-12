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

## Hideouts

Al seleccionar **Hideout (HO)** como lugar de producción, la configuración permite elegir el nivel de energía o poder actual, del 1 al 9. Cada nivel muestra:

- la energía acumulada necesaria;
- el bono base del Hideout;
- el bono general de producción aportado por el nivel;
- el bono especialista disponible;
- el bono local total que participa en el cálculo del Resource Return Rate.

La fórmula aplicada es:

```text
RRR = bono de producción total / (1 + bono de producción total)
```

El bono general del Hideout se suma al bono base, al foco y al bono diario. El bono especialista no se suma una segunda vez al RRR: cuando el HO está especializado para el objeto, se utiliza como eficiencia adicional para reducir el costo de foco.

Los niveles y bonos están modelados desde los valores de `hideouts.xml` del cliente de Albion Online. La configuración del HO también forma parte de los presets guardados.

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
