# RRR y recursos retornables

La calculadora separa explícitamente la plata desembolsada del valor económico
que permanece en los materiales retornados.

## Conceptos mostrados en la interfaz

- **Inversión inicial:** materiales, componentes, artefactos y tarifas antes de
  recibir retornos.
- **Valor recuperado:** valor de reposición estimado de los materiales que
  vuelven al inventario. No representa plata líquida.
- **Costo neto tras RRR:** inversión inicial menos valor recuperado.
- **Resultado en plata:** venta neta menos inversión inicial.
- **Resultado económico total:** resultado en plata más valor recuperado.

La relación usada es:

```text
resultado económico total = resultado en plata + valor recuperado
```

De esta forma, los retornos no se cuentan dos veces y tampoco se presentan
como si hubiesen sido vendidos.

## Estado “Cálculo completo”

La etiqueta indica que todos los ingredientes necesarios tienen un precio.
No significa que el monto mostrado sea la suma bruta de la receta. El valor
junto a esa etiqueta es el **costo neto tras RRR**; debajo se informa la
inversión inicial y el valor recuperado.

## Crafteo de equipamiento

Solo los ingredientes clasificados como `refined_resource` pueden volver al
inventario. Por lo tanto, quedan excluidos del retorno:

- Artefactos de armas, armaduras y offhands.
- Runas, almas, reliquias y fragmentos.
- Componentes especiales de capas u otros objetos.

Estos ingredientes forman parte de la inversión inicial y del costo neto, pero
no generan valor recuperado ni aparecen en “Materiales recuperados”.

## Refinamiento

En una etapa cuyo resultado es un recurso refinado, pueden recuperarse tanto
el recurso crudo como el recurso refinado del tier anterior.

## Implementación

La regla de elegibilidad vive en:

```text
src/core/domain/entities/ResourceReturnEligibility.ts
```

La separación entre flujo de plata y resultado económico vive en:

```text
src/features/craft-calculator/utils/profitCalculations.ts
```

La utilizan la interfaz, el resumen copiable y la vista imprimible para que
todas las cifras coincidan.
