# RRR y recursos retornables

La calculadora distingue entre el costo total de una receta y la parte de ese
costo que realmente puede recibir Resource Return Rate.

## Crafteo de equipamiento

Solo los ingredientes clasificados como `refined_resource` pueden volver al
inventario. Por lo tanto, quedan excluidos del retorno:

- Artefactos de armas, armaduras y offhands.
- Runas, almas, reliquias y fragmentos.
- Componentes especiales de capas u otros objetos.

Estos ingredientes siguen formando parte del costo bruto y del costo neto,
pero no generan ahorro por RRR ni aparecen en “Materiales recuperados”.

## Refinamiento

En una etapa cuyo resultado es un recurso refinado, pueden recuperarse tanto
el recurso crudo como el recurso refinado del tier anterior.

## Implementación

La regla vive en:

```text
src/core/domain/entities/ResourceReturnEligibility.ts
```

La utilizan tanto el cálculo económico como la lista de materiales devueltos,
para que el ahorro, el costo neto, el resumen exportado y el PDF coincidan.
