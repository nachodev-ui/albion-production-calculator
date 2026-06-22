# Tarifas de estación, nutrición y especialización

## Tarifa de uso

La configuración de producción permite ingresar las dos tarifas visibles en
cada puesto:

- `Usage fee per 100 Nutrition consumed (users)`
- `Usage fee per 100 Nutrition consumed (associates)`

También puede seleccionarse `Gratis / isla` para no sumar tarifa.

El cálculo aplicado es:

```text
Nutrición por tirada = Item Value × 0,1125
Costo del puesto = Nutrición total × tarifa aplicada / 100
```

El puesto se detecta desde la receta. El `Item Value` se toma del dataset cuando
está disponible; de lo contrario puede ingresarse manualmente y queda asociado
al objeto y encantamiento actuales.

La tarifa de uso se suma al costo total, por lo que afecta profit líquido,
punto de equilibrio, rentabilidad, comparación de variantes y exportaciones.

## Focus Cost Efficiency

El usuario ingresa el total visible en el Destiny Board para el objeto que va a
fabricar. El costo efectivo se calcula con:

```text
Foco efectivo = techo(foco base / 2^(eficiencia / 10.000))
```

También se muestra el foco requerido para el lote y la cantidad máxima de
objetos que permite fabricar el foco disponible.

## Increase in Quality

El bono se guarda en la configuración y en los presets, y se incluye en el
resumen exportable. Por ahora es informativo: todavía no se convierte en una
distribución de calidades ni modifica el precio de venta esperado.
