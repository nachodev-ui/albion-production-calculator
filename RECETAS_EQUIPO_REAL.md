# Recetas alternativas de equipo real

La calculadora soporta las tres variantes de receta para todas las piezas
reales de tela, cuero y placas entre T4 y T8:

- cascos/capuchas/hábitos reales;
- armaduras/chaquetas/túnicas reales;
- botas/zapatos/sandalias reales.

Cada receta permite elegir una de las tres primeras piezas de la rama
(`SET1`, `SET2` o `SET3`) y añade Sellos Reales del mismo tier.

## Reglas de encantamiento

- La pieza base utiliza el encantamiento del objeto real seleccionado.
- El Sello Real siempre conserva encantamiento `0`.
- Ni la pieza de equipo base ni el Sello Real reciben retorno de recursos.

## Cantidad de Sellos Reales

| Tier | Pecho | Cabeza/Pies |
|---|---:|---:|
| T4 | 4 | 2 |
| T5 | 8 | 4 |
| T6 | 16 | 8 |
| T7 | 16 | 8 |
| T8 | 16 | 8 |

## Implementación

- `RecipeTier.alternatives` conserva las recetas adicionales.
- El selector de variante aparece solo cuando el tier tiene más de una opción.
- Las rutas de precios incluyen el índice de alternativa para evitar reutilizar
  accidentalmente el precio de una pieza base en otra variante.
- `scripts/generate-dataset.ts` procesa todos los bloques
  `<craftingrequirements>` y ya no elimina los Sellos Reales.
