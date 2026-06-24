# Costo del puesto, nutrición y especialización

## Flujo recomendado: Total Cost directo

La configuración de producción permite copiar directamente el `Total Cost` que
Albion muestra justo antes de confirmar el crafteo. Ese monto corresponde al
lote seleccionado y se suma tal cual al costo de producción.

Ejemplo:

```text
Cantidad seleccionada: 15
Total Cost mostrado por Albion: 1.015 plata
Costo aplicado por la calculadora: 1.015 plata
```

Si después se modifica la cantidad, la calculadora escala el monto de forma
proporcional según el número de tiradas. La interfaz avisa cuando está usando
ese ajuste.

El costo directo se guarda por objeto y encantamiento mientras la aplicación
permanece abierta. Tiene prioridad sobre cualquier estimación avanzada.

## Estimación avanzada por nutrición

Cuando no se puede consultar el `Total Cost` en el juego, el panel avanzado
permite reconstruirlo con:

- `Usage fee per 100 Nutrition consumed (users)`
- `Usage fee per 100 Nutrition consumed (associates)`
- `Item Value`
- acceso como usuario, asociado o estación gratuita

El cálculo de referencia es:

```text
Nutrición por tirada = Item Value × 0,1125
Costo estimado del puesto = Nutrición total × tarifa aplicada / 100
```

`Item Value` es un dato interno y no corresponde al precio de mercado ni al
`Total Cost`. La estimación permanece visible como referencia, pero no reemplaza
un costo directo ingresado.

El costo aplicado afecta el resultado en plata, punto de equilibrio,
rentabilidad, comparación de variantes y exportaciones.

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
