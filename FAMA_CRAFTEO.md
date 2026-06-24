# Fama de crafteo

La calculadora muestra una estimación compacta de la fama obtenida al fabricar
el objeto final seleccionado. El valor visible aparece junto a la cantidad,
acompañado por el icono clásico de fama, y el detalle se abre al pasar el cursor,
pulsar el bloque o usarlo desde un dispositivo táctil.

El panel desplegable emplea el icono de fama como identidad visual principal y
la corona de Premium únicamente en la bonificación correspondiente. Cuando
Premium está activo, la corona también aparece como una insignia pequeña sobre
el indicador de fama. El mismo recurso se reutiliza junto al control `Cuenta
Premium` del resultado económico; desactivado se muestra atenuado para comunicar
su estado sin añadir otra tarjeta.

## Información mostrada

- Fama del objeto final por unidad.
- Fama base del lote configurado.
- Bonificación Premium del 50 %, cuando Premium está activado.
- Total de fama obtenido.
- Fama válida para llenar diarios de trabajadores.

La fama válida para diarios corresponde a la fama base: la bonificación Premium
se muestra en el total recibido, pero no se suma al progreso del diario.

## Cálculo

La fama se resuelve desde la receta real de la variante seleccionada:

1. Cada recurso refinado aporta la fama correspondiente a su tier.
2. El encantamiento aplica la progresión de la variante `.0` a `.4`.
3. Se suman solamente los recursos que aportan fama.
4. Artefactos, insignias, sellos, runas, almas y reliquias no añaden fama por sí
   mismos.
5. Las recetas que transforman otro objeto, como capas de facción y equipo real,
   conservan la fama equivalente del objeto base utilizado.
6. La cantidad seleccionada multiplica la fama base por unidad.
7. Premium añade un 50 % al total recibido.

Factores base por unidad de recurso refinado:

| Tier | Fama |
| ---: | ---: |
| T2 | 1,5 |
| T3 | 7,5 |
| T4 | 22,5 |
| T5 | 90 |
| T6 | 270 |
| T7 | 645 |
| T8 | 1.395 |

El multiplicador de encantamiento es `2^encantamiento`: `.0 ×1`, `.1 ×2`,
`.2 ×4`, `.3 ×8` y `.4 ×16`.

## Ejemplo

Cinco Túnicas de escamas feéricas T4.4 usan 16 recursos refinados que aportan
fama por unidad:

```text
Fama por túnica:       5.760
Fama base (5):        28.800
Premium +50 %:        14.400
Total obtenido:       43.200
Fama para diarios:    28.800
```

## Alcance

La estimación incluye únicamente la fabricación del objeto final. No suma:

- fama de refinar materiales;
- fama obtenida al fabricar ingredientes intermedios por separado;
- fama por estudiar o destruir el objeto;
- bonificaciones temporales distintas de Premium.

Los objetos sin receta o las transformaciones que no conceden fama no muestran
el indicador. La ciudad, el retorno de recursos, el foco, las tarifas y la
calidad resultante no modifican la fama por unidad fabricada.
