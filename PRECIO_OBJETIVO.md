# Precios objetivo de rentabilidad

Se agregó una sección compacta dentro de `ProfitSummaryCard` con tres objetivos:

- 10% de rentabilidad sobre costo
- 20% de rentabilidad sobre costo
- 30% de rentabilidad sobre costo

Cada precio considera:

- costo neto total del crafteo;
- cantidad de objetos fabricados;
- Tax según Premium o no Premium;
- Setup Fee de 2,5%;
- redondeo hacia arriba a plata entera.

La fórmula usada es:

```text
precio unitario = ceil(
  costo total × (1 + rentabilidad objetivo)
  ÷ (1 - comisiones totales)
  ÷ cantidad
)
```

Los botones quedan deshabilitados mientras existan precios de materiales pendientes.
Al presionar uno, su valor se copia automáticamente al campo de precio de venta.
También se marca visualmente cuando el precio ingresado alcanza uno de los objetivos.
