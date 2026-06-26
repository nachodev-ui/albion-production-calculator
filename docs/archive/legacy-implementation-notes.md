---
title: Notas históricas de implementación
outline: [2, 3]
---

# Notas históricas de implementación

> Archivo consolidado. Estas notas registran decisiones y entregas anteriores, pero no son la fuente normativa del comportamiento actual. Para el estado vigente consulta las secciones de Arquitectura, Funcionalidades y Operación.

---

## CAMBIO_FUENTES_MERCADO.md

# Integración de fuentes de mercado

## Resultado

La calculadora utiliza esta prioridad para precios actuales y catálogo:

```text
API central → receiver local → caché del navegador
```

Los precios manuales siguen siendo overrides y conservan prioridad sobre el
resultado automático.

## Variables

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

`VITE_MARKET_API_URL` continúa funcionando como alias legado del receiver.

## Comportamiento

- El catálogo se consulta por `marketKey` y nunca expone IDs internos.
- La API central recibe consultas batch mediante `POST /prices/query`.
- El receiver completa combinaciones o lados de mercado ausentes.
- Una respuesta vacía no elimina el último snapshot válido.
- Si las fuentes en línea fallan, se conservan catálogo y precios cacheados.
- Cada precio muestra origen, fecha exacta, antigüedad y nivel de frescura.
- El historial permanece en el receiver local hasta que exista un contrato
  central equivalente.

## Prueba manual recomendada

1. Con ambas fuentes levantadas, abre la calculadora y confirma `API central`.
2. Detén `albion-market-api`, actualiza y confirma `Receiver local (fallback)`.
3. Detén también el receiver, actualiza y confirma `Caché del navegador`.
4. Limpia la caché solo después de volver a levantar al menos una fuente.
5. Cambia entre orden e inmediato para comprobar que el origen corresponde al
   lado de precio utilizado.

## Verificación del proyecto

```powershell
pnpm install
pnpm test
pnpm lint
pnpm build
```

---

## CATALOGO_MERCADOS.md

# Catálogo de mercados

El servicio local es la única fuente de mercados. React consulta `/markets` y
usa las claves recibidas en todos sus selectores y peticiones.

Mercados regulares esperados:

- Bridgewatch
- Martlock
- Lymhurst
- Fort Sterling
- Thetford
- Caerleon
- Brecilien

Black Market existe en el contrato, pero no se muestra mientras el backend lo
mantenga deshabilitado o sin `marketLocationId`.

---

## CIUDADES_POR_MATERIAL.md

# Ciudades individuales por material

## Modelo

Cada material guarda una clave de mercado proveniente de `GET /api/v1/markets`.
No guarda nombres ni códigos de ubicación duplicados en React.

Ejemplo:

```text
Producto terminado → brecilien
Lingotes           → martlock
Artefacto           → brecilien
Tablas              → lymhurst
```

## Reglas

- `Ciudad de venta` solo afecta al producto terminado y a su historial.
- `Ciudad predeterminada` funciona como fallback.
- Cada hoja comprable muestra `Comprar en`.
- Al actualizar precios, la calculadora consulta el material en todos los
  mercados habilitados. El selector muestra el valor disponible y distingue
  `Mejor precio`, `Más alto`, `Mismo precio` o `Único disponible`.
- Las etiquetas comparan únicamente datos automáticos existentes para la
  estrategia de compra seleccionada. Las ciudades sin captura aparecen como
  `Sin datos` y no participan del mínimo ni del máximo.
- La calidad de materiales permanece en Normal.
- Los precios manuales tienen prioridad.
- Expandir un material usa las ciudades de sus ingredientes.
- Las claves que ya no existen en el catálogo se eliminan al cargarlo.

## Persistencia y caché

Las asignaciones se conservan por producto raíz en:

```text
albion-production-calculator.material-purchase-cities.v1
```

La caché incluye servidor, `marketKey`, objeto y calidad, por lo que un precio
de una ciudad nunca sustituye a otro.

---

## CORRECCION_HISTORIAL_CALIDAD.md

# Corrección de historial y calidad del producto

## Problemas corregidos

1. El historial y el precio de venta estaban fijados a calidad Normal sin un
   selector visible.
2. La misma calidad se aplicaba también a los materiales, aunque los recursos
   de crafteo no tienen calidad de mercado.
3. El límite final del rango histórico no alcanzaba la medianoche UTC siguiente,
   por lo que podía omitir los buckets del último día completo.
4. El parser del historial aceptaba pocas variantes de nombres de campos.
5. La caché histórica anterior podía conservar una respuesta vacía después de
   aplicar la corrección.

## Comportamiento nuevo

- **Calidad del producto** permite elegir Normal, Bueno, Sobresaliente,
  Excelente u Obra maestra.
- La calidad afecta únicamente al producto terminado: precio de venta actual e
  historial.
- Los materiales se consultan siempre con calidad Normal.
- Ciudad y calidad actualizan el historial de forma independiente.
- La tarjeta de historial posee selectores propios de ciudad y calidad para no
  obligar a volver a la configuración de mercado. Ambos controles permanecen
  sincronizados con el precio actual del producto terminado.
- El método de venta cambia el precio actual usado por la calculadora, pero no
  el historial, ya que el cliente de Albion entrega historial agregado de ventas.
- El parser acepta respuestas `snake_case`, `camelCase` y `PascalCase`, además
  de números serializados como texto.
- La caché histórica cambia a versión 2 y descarta automáticamente snapshots
  vacíos generados por la implementación anterior.

---

## EXPORTAR_PDF.md

# Exportar a PDF

La exportación no genera un PDF mediante una librería externa. En su lugar, crea una página imprimible dedicada y utiliza el sistema de impresión del navegador.

## Flujo

1. El usuario presiona **Exportar PDF**.
2. La calculadora crea una instantánea serializable del cálculo actual.
3. Se abre una pestaña independiente con el informe limpio.
4. El diálogo de impresión se abre automáticamente.
5. El usuario elige **Guardar como PDF**.

## Archivos principales

- `CalculationPrintPage.tsx`: carga la instantánea y controla la impresión.
- `CalculationPrintView.tsx`: diseña el informe.
- `printSummaryStorage.ts`: comparte temporalmente los datos entre pestañas.
- `calculationSummary.ts`: define la estructura serializable común.
- `index.css`: contiene los estilos A4 y reglas `@media print`.

Este enfoque evita dependencias adicionales, reutiliza los cálculos existentes y permite imprimir físicamente el informe si el usuario lo necesita.

---

## EXPORTAR_RESUMEN.md

# Exportar resumen

La calculadora permite compartir el cálculo de tres maneras:

- **Copiar resumen:** copia una versión en texto al portapapeles.
- **Descargar .txt:** guarda el mismo resumen como archivo de texto.
- **Exportar PDF:** abre una vista imprimible separada y muestra el diálogo del navegador. Desde ahí se debe elegir **Guardar como PDF**.

## Vista PDF

La vista imprimible incluye:

- Objeto, tier, encantamiento, cantidad y estado del cálculo.
- Ciudad, especialidad, foco, bono diario y RRR.
- Costo bruto, ahorro por RRR, costo neto y tarifas de estación.
- Tax, Setup Fee, precio mínimo y precios objetivo.
- Venta bruta, venta neta, resultado y rentabilidad.
- Tabla de materiales recuperados.
- Lista de precios pendientes cuando el cálculo está incompleto.

La pestaña de impresión no muestra la barra lateral, inputs, presets ni otros controles de la calculadora. Los datos temporales usados para abrirla se almacenan localmente y expiran automáticamente después de una hora.

---

## FAMA_CRAFTEO.md

# Fama de crafteo, estudio, diarios y especialización

Investigación revisada el **24 de junio de 2026**.

La calculadora muestra la fama obtenida al fabricar el objeto final y añade un
panel de progreso con tres herramientas:

1. fama por estudiar y destruir parte o todo el lote;
2. cantidad exacta de diarios compatibles completados;
3. proyección de la especialización individual entre los niveles 0 y 100.

## 1. Fama de fabricación

La fama se resuelve desde la receta real de la variante seleccionada:

1. Cada recurso refinado aporta la fama correspondiente a su tier.
2. El encantamiento aplica la progresión de la variante `.0` a `.4`.
3. Se suman solamente los recursos que aportan fama.
4. Artefactos, insignias, sellos, runas, almas y reliquias no añaden fama por sí
   mismos.
5. La cantidad seleccionada multiplica la fama base por unidad.
6. Premium añade un 50 % a la fama recibida.

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

## 2. Estudiar y destruir

Estudiar consume definitivamente el objeto. La acción de estudio entrega un
**275 % de la fama base de fabricación** del objeto estudiado.

```text
Fama de estudio sin Premium = fama base por objeto × 2,75 × objetos estudiados
Fama de estudio con Premium = fama de estudio sin Premium × 1,5
Fama conjunta = fama de fabricar + fama de estudio
```

Por tanto:

- estudiar sin Premium equivale al 275 %;
- estudiar con Premium equivale matemáticamente al 412,5 % (la documentación
  oficial lo presenta redondeado como 413 %);
- fabricar y luego estudiar sin Premium suma 375 %;
- fabricar y luego estudiar con Premium suma 562,5 %.

El número de objetos estudiados se limita a la cantidad realmente producida por
las tiradas de la receta.

El cálculo no activa estudio con foco ni bonos temporales.

## 3. Diarios completados

Los diarios de fabricación solo reciben la **fama base de fabricación**. No
reciben la bonificación Premium y la fama obtenida al estudiar tampoco los
llena.

Capacidades usadas:

| Tier | Fama por diario |
| ---: | ---: |
| T2 | 900 |
| T3 | 1.800 |
| T4 | 3.600 |
| T5 | 7.200 |
| T6 | 14.400 |
| T7 | 28.800 |
| T8 | 57.600 |

El diario debe corresponder al **mismo tier y profesión** del objeto fabricado.
La profesión se detecta según la familia y la estación del objeto:

| Estación / familia | Diario |
| --- | --- |
| Fragua del guerrero | Herrero |
| Refugio del cazador | Flechero |
| Torre del mago | Imbuídor |
| Herrero de herramientas | Manitas |

Fórmula:

```text
fama acumulada = fama previa del primer diario + fama base del lote
diarios completos = floor(fama acumulada / capacidad)
sobrante = fama acumulada % capacidad
```

La interfaz permite indicar cuánta fama tenía cargada el primer diario. Se
asume que el jugador lleva suficientes diarios vacíos del mismo tier y tipo.
El selector se autoconfigura con la profesión y el tier detectados en el objeto,
pero permite corregir manualmente la profesión si el dataset clasifica una
familia de forma incorrecta. El tier no puede cambiarse: los diarios de
fabricación se llenan con objetos de su mismo tier.

Solo se utilizan las variantes **Empty** del dataset oficial:

```text
T{tier}_JOURNAL_WARRIOR_EMPTY
T{tier}_JOURNAL_HUNTER_EMPTY
T{tier}_JOURNAL_MAGE_EMPTY
T{tier}_JOURNAL_TOOLMAKER_EMPTY
```

Refinamiento, cocina y alquimia no generan estos diarios de fabricación.

## 4. Proyección de especialización

La proyección usa los 100 requisitos individuales de fama del nodo. Las
**especializaciones individuales de crafteo** verificadas —arma normal, arma de
artefacto, armadura, mano secundaria, bolsa y capa— comparten la misma curva:

```text
Fama de nivel 0 → 1:      14.424
Fama total de nivel 0 → 100: 12.879.472
```

No se debe confundir una especialización individual de Ring 9 con el nodo padre
de maestría de Ring 7. Por ejemplo, `Cloth Robe Crafter` es el nodo general y
empieza en 7.212, mientras que `Feyscale Robe Crafting Specialist` es la
especialización del objeto y empieza en 14.424.

La versión anterior de esta investigación infería multiplicadores diferentes
para artefactos y ranuras. Esa inferencia fue descartada al contrastarla con los
datos del Destiny Board del parche del 19 de abril de 2026: Battleaxe, Carving
Sword, Shield y Feyscale Robe usan 14.424 para el primer nivel y 12.879.472 en
total.

El valor inicial queda editable en la interfaz únicamente como protección ante
un cambio futuro del juego o un nodo excepcional todavía no detectado.

Entradas disponibles:

- nivel actual;
- fama ya acumulada dentro del nivel actual;
- nivel objetivo;
- fama requerida para el primer nivel.

Resultados:

- nivel alcanzado después del lote;
- progreso dentro del nivel proyectado;
- fama restante al objetivo;
- cantidad de lotes iguales necesarios;
- fama total de nivel 0 a 100.

La fama aplicada a la especialización es la suma de fabricación y estudio según
la cantidad configurada. No se incluyen Puntos de Aprendizaje, Quick Learn,
bonos diarios ni otros multiplicadores temporales.

## Ejemplo: cinco túnicas de escamas feéricas T4.4

```text
Fama por túnica:                5.760
Fama base al fabricar 5:       28.800
Premium de fabricación:        14.400
Fama total de fabricación:     43.200
Fama válida para diarios:      28.800
Diarios T4 completados:             8

Estudio de 5 sin Premium:      79.200
Estudio de 5 con Premium:     118.800
Fabricar + estudiar Premium:  162.000
```

La especialización individual de la túnica feérica comienza en 14.424 de fama y
requiere 12.879.472 desde nivel 0 hasta 100.

## Fuentes consultadas

- Albion Online, **Focus Points**: estudio al 275 %, objeto destruido y efecto
  de Premium sobre la fama de estudio.
  <https://albiononline.com/guides/article/focus-points+73>
- Albion Online Wiki, **Journal**: capacidades, mismo tier/profesión y exclusión
  de la fama de estudio.
  <https://wiki.albiononline.com/wiki/Journal>
- Albion Online Wiki, páginas de estaciones y profesiones de trabajadores.
- Albion Online Grind, **Item Crafting Fame**, para contrastar fama por tipo,
  tier y encantamiento.
  <https://albiononlinegrind.com/table/item-crafting-fame>
- Albion Database, datos del Destiny Board del parche del 19 de abril de 2026:
  especializaciones individuales de Axe, Carving Sword, Shield, Feyscale Robe,
  bolsas y otras familias.
  <https://www.albiondatabase.com/destiny-board>
- Albion Online Data Project, `ao-bin-dumps`, actualizado el 1 de junio de
  2026, usado como referencia de datos del juego.
  <https://github.com/ao-data/ao-bin-dumps>

---

## MEJORAS_ACTUALIZACION_PRECIOS.md

# Trazabilidad de actualización de precios

La actualización global de precios ahora informa lo que ocurre antes, durante
y después de consultar el receptor local.

## Progreso visible

Mientras se consulta el backend, la barra de mercado muestra:

- porcentaje procesado;
- solicitudes completadas;
- combinaciones de ciudad, objeto y calidad procesadas.

## Resumen final

Al terminar se muestran los precios automáticos:

- actualizados;
- sin cambios;
- sin datos;
- valores manuales que conservaron prioridad.

El detalle desplegable identifica el objeto, la ciudad consultada y el
resultado de la combinación activa.

## Retroalimentación contextual

Cada material y el producto terminado muestran el resultado de la última actualización:

- precio anterior y nuevo;
- precio encontrado por primera vez;
- precio sin cambios;
- ausencia de datos;
- precio manual conservado junto con la referencia automática disponible.

El informe se descarta cuando cambia el servidor, la ciudad, la estrategia, la
calidad o la cantidad de overrides manuales, evitando mostrar una comparación
que ya no corresponde a la configuración actual.

---

## MEJORAS_MERCADO_UI.md

# Distribución de la interfaz de mercado

La configuración de mercado dejó de mostrarse como una tarjeta central con
controles de compra, venta, calidad y caché mezclados. Cada opción aparece ahora
junto a la tarea que modifica.

## Conexión global

La sección **Mercado local** mantiene únicamente:

- servidor de Albion;
- estado de conexión con el receptor local;
- actualización global de precios e historial;
- diagnóstico avanzado desplegable.

El diagnóstico contiene el catálogo recibido, el estado del caché, la frescura
de los precios, los errores del servicio y la opción para limpiar datos locales.

## Compra de materiales

Dentro de **Materiales de la receta** se encuentran:

- ciudad base para materiales sin asignación individual;
- método de compra;
- cantidad de ciudades individuales;
- acción para aplicar la ciudad base a todos.

Cada material conserva su selector de ciudad y la comparación entre mercados
con las etiquetas `Mejor precio`, `Más alto`, `Mismo precio`,
`Único disponible` y `Sin datos`.

## Venta del producto

Dentro de **Resumen de ganancia** se encuentran:

- ciudad de venta;
- método de venta;
- calidad del producto terminado.

Al modificar esos controles, la referencia automática y el resultado económico
se recalculan. Si existe un precio manual, este continúa teniendo prioridad y la
interfaz lo informa explícitamente.

## Comparación histórica

El historial sigue inicialmente la ciudad y calidad configuradas para la venta.
El botón **Comparar otro mercado** permite consultar otra combinación sin
alterar la rentabilidad.

La comparación solo se convierte en configuración de venta al pulsar
**Aplicar como configuración de venta**. También es posible volver a seguir la
venta sin aplicar cambios.

## Validación local

```powershell
pnpm install
pnpm test
pnpm build
pnpm dev
```

## Identidad visual de ciudades y comparación

El selector de compra por material utiliza ahora un menú visual propio. Las
etiquetas de comparación se muestran como estados compactos con borde y fondo,
siguiendo el mismo lenguaje de `Reciente`, `Aceptable`, `Antiguo` y `Sin datos`:

- `Mejor precio`: verde apagado;
- `Más alto`: rojo apagado;
- `Mismo precio`: dorado de la interfaz;
- `Único disponible`: neutro;
- `Sin datos`: gris discreto.

Cada ciudad se identifica además con una versión desaturada del color de su
estandarte: azul para Martlock, naranja para Bridgewatch, verde para Lymhurst,
marfil para Fort Sterling, púrpura para Thetford, rojo para Caerleon y verde
azulado para Brecilien. Estos tonos solo funcionan como guía visual y no
reemplazan el nombre escrito de la ciudad.

---

## MEJORAS_RESULTADO_ECONOMICO.md

# Resultado económico y materiales recuperados

La interfaz distingue ahora tres resultados que antes podían confundirse:

```text
Inversión inicial = costo neto tras RRR + valor recuperado
Resultado en plata = venta neta - inversión inicial
Resultado económico total = resultado en plata + valor recuperado
```

Los materiales recuperados se consideran inventario reutilizable. No se
presentan como plata líquida ni se suman dos veces al resultado.

El precio mínimo y los precios objetivo usan la inversión inicial, de modo que
el precio sugerido permite recuperar realmente la plata desembolsada después
de comisiones.

La etiqueta superior cambió de “Receta completa” a “Cálculo completo”. El
monto asociado se identifica como “Costo neto tras RRR” y debajo se muestran
la inversión inicial y el valor recuperado.

La misma separación se aplica en:

- Resumen de ganancia.
- Resumen copiable y descargable.
- Vista imprimible / PDF.
- Tooltips de ayuda.

---

## MEJORA_CIUDAD_RECOMENDADA.md

# Ciudad de producción recomendada

La configuración de producción detecta automáticamente la ciudad que posee el
bono local de especialidad para el objeto seleccionado.

## Comportamiento

Al seleccionar un objeto nuevo:

1. Se identifica su familia de crafteo o tipo de refinado.
2. Se selecciona automáticamente la ciudad con el bono correspondiente.
3. El selector marca esa opción como `Recomendada`.
4. El bono de especialidad se activa únicamente cuando la ciudad elegida
   coincide con la recomendación.

El usuario puede seleccionar cualquier otra ciudad. La combinación no se
bloquea; simplemente se informa que el bono de especialidad no aplica allí y
se conserva visible la ciudad recomendada.

## Ejemplos

- Bastones malditos: Bridgewatch.
- Hachas: Martlock.
- Túnicas de tela: Fort Sterling.
- Guantes de guerra: Caerleon.
- Manos secundarias: Martlock.
- Refinado de tablas: Fort Sterling.

Las islas personales o de gremio nunca reciben el bono de especialidad.

## Presets

Los presets continúan pudiendo guardar cualquier ciudad. Al aplicar uno, la
configuración se normaliza según el objeto actual:

- ciudad recomendada: bono activo;
- otra ciudad: bono inactivo;
- isla: bono inactivo.

Esto evita que una configuración guardada atribuya un bono a una ciudad que no
lo posee para la categoría seleccionada.

---

## NAVEGACION_CATEGORIAS.md

# Navegación principal de categorías

La vista global **Todos** fue eliminada. Mezclaba objetos con jerarquías distintas y volvía a crear una lista extensa difícil de explorar.

## Nuevo selector

El encabezado del panel muestra una sola categoría activa. Al presionarla, se abre una cuadrícula compacta con:

- Nombre e ícono de la categoría.
- Cantidad de ítems disponibles.
- Indicador visual de la categoría activa.

Esto reemplaza los chips horizontales y elimina su scroll lateral.

## Dirección del proyecto

Cada categoría declara un modo de navegación:

```ts
browserMode: 'branches' | 'list'
```

Actualmente **Armaduras** usa ramas del Destiny Board. Las demás categorías conservan temporalmente el listado propio de su categoría hasta incorporar sus respectivos agrupamientos.

La categoría inicial es **Armaduras**, para que la primera vista del catálogo ya utilice la navegación organizada.

## Corrección del acordeón

Al seleccionar un tier se abre su rama automáticamente, pero el usuario conserva el control después de la selección:

- Puede cerrar la rama seleccionada.
- Puede abrir cualquier otra rama.
- Solo una rama permanece abierta a la vez.

El error anterior ocurría porque el efecto que sincronizaba la selección también observaba el estado del acordeón; cada intento de cambiarlo volvía a abrir la rama del objeto seleccionado.

---

## NAVEGACION_RAMAS_ARMADURA.md

# Navegación por ramas de armadura

La categoría **Armaduras** deja de mostrar una fila por cada tier cuando no existe una búsqueda activa.

## Estructura

- `Trainee Crafter`: nueve objetos T2 de placas, cuero y tela.
- Tres nodos Journeyman T3, separados por estación.
- Nueve especializaciones T4–T8:
  - Plate Helmet / Armor / Boots Crafter.
  - Leather Hood / Jacket / Shoes Crafter.
  - Cloth Cowl / Robe / Sandals Crafter.

Cada especialización agrupa una familia por identificador interno de Albion. Por ejemplo:

```text
T4_HEAD_PLATE_SET1
T5_HEAD_PLATE_SET1
T6_HEAD_PLATE_SET1
T7_HEAD_PLATE_SET1
T8_HEAD_PLATE_SET1
```

se presenta como una sola fila **Casco de soldado**, con botones T4–T8.

## Comprobaciones del catálogo incluido

- 13 ramas.
- 423 objetos agrupados.
- 9 objetos T2.
- 9 objetos T3.
- 9 especializaciones con 9 familias y 45 objetos cada una.
- Los prototipos internos sin nombre traducido se excluyen del navegador por ramas.

Los cosméticos y objetos que no forman parte de estas ramas siguen disponibles al usar el buscador por nombre.

---

## NAVEGACION_RAMAS_CATALOGO.md

# Navegación por ramas del catálogo

El navegador de objetos utiliza ahora ramas y familias para las cuatro categorías principales de equipamiento:

- Armas
- Armaduras
- Offhands
- Accesorios

## Reglas de agrupamiento

El agrupamiento usa los identificadores internos de Albion, no los nombres traducidos. Por ejemplo:

```text
T4_MAIN_SWORD
T5_MAIN_SWORD
T6_MAIN_SWORD
T7_MAIN_SWORD
T8_MAIN_SWORD
```

se presentan como una sola familia, con botones de tier.

Los tiers introductorios T2 y T3 se muestran en ramas separadas. Desde T4 hasta T8, cada línea del Destiny Board se presenta como una especialización.

## Armas

Se organizan en 20 ramas:

- Trainee Crafter
- Tres nodos Journeyman por estación
- Sword, Axe, Mace, Hammer, Crossbow y War Gloves
- Bow, Spear, Nature Staff, Dagger y Quarterstaff
- Fire, Holy, Arcane, Frost y Cursed Staff

Los materiales de artefacto con IDs `ARTEFACT_*` no se mezclan con las armas equipables. Continúan disponibles mediante el buscador.

## Offhands

Se organizan en:

- Introducción T2 y T3
- Shield Crafter
- Tome Crafter
- Torch Crafter

Cada especialización contiene seis familias T4–T8.

## Accesorios

Se organizan en:

- Introducción T2 y T3
- Bolsas
- Capas normales
- Capas de ciudad
- Capas especiales
- Insignias para capas
- Capas decorativas

Los cosméticos únicos que no siguen una familia por tier continúan disponibles mediante el buscador.

## Búsqueda

Al escribir en el buscador, la jerarquía se reemplaza temporalmente por resultados agrupados por familia. Los objetos que no pertenecen a una rama reconocida aparecen en “Otros resultados”.

## Acordeones

Solo una rama puede permanecer abierta. Seleccionar un objeto abre su rama, pero después el usuario puede cerrarla o abrir otra sin que la selección vuelva a forzarla.

---

## OPTIMIZADOR_RENTABILIDAD.md

# Optimizador de rentabilidad con liquidez

## Objetivo

El optimizador compara la configuración actual con una combinación automática formada por:

1. la ciudad viable más barata para cada material de la receta activa;
2. la ciudad viable con mejor precio para vender el producto terminado;
3. el costo neto y el resultado económico de esa combinación;
4. el ahorro y la mejora total frente a las ciudades seleccionadas actualmente.

La comparación conserva receta, cantidad, ciudad de producción, RRR, foco, tarifa de estación, Premium, calidad, métodos de compra/venta y precios manuales.

## Validación histórica por candidato

Un precio positivo ya no basta para participar en la recomendación. Por cada combinación de ítem, ciudad y calidad con precio actual disponible, la aplicación consulta 28 días de historial del servicio local.

Cada candidato se evalúa con:

- mediana histórica de precio;
- volumen total de 28 días;
- promedio diario de unidades;
- días con actividad;
- cantidad neta necesaria para el cálculo actual;
- tiempo estimado para completar esa cantidad;
- antigüedad del precio actual;
- desviación del precio actual respecto de la mediana.

La cantidad de materiales incorpora el tamaño del lote, las salidas por tirada, las recetas expandidas y el RRR de cada etapa. Es una cantidad económica neta: explica el costo esperado, pero no representa necesariamente el inventario inicial exacto requerido para encadenar todos los crafteos.

## Detección de precios atípicos

La mediana diaria se usa como referencia robusta. Un candidato se descarta cuando el precio actual es extremadamente bajo o alto frente a esa mediana.

Los métodos que naturalmente operan con descuento —orden de compra y venta inmediata— usan un margen inferior más amplio que la compra inmediata y la orden de venta. Esto evita marcar como anomalía una diferencia normal entre ambos lados del mercado, pero sigue descartando casos absurdos como precios de pocas unidades de plata frente a historiales de decenas o cientos de miles.

## Confianza y elegibilidad

La aplicación clasifica cada candidato como:

- **Confianza alta:** actividad frecuente, historial amplio y tiempo estimado corto.
- **Confianza media:** volumen suficiente para la cantidad y actividad razonable.
- **Confianza baja o no elegible:** historial escaso, mercado lento, precio atípico o ausencia de ventas.

Solo los candidatos con confianza alta o media pueden formar parte de la combinación recomendada y del botón **Aplicar ciudades recomendadas**.

La fecha del precio actual funciona como señal de confianza, no como bloqueo absoluto. Si la fecha está ausente o es antigua, pero el historial de 28 días está actualizado, posee actividad suficiente y el precio es coherente con la mediana, el candidato puede seguir siendo elegible con confianza media. Nunca recibe confianza alta hasta contar con una fecha reciente.

Como límites de seguridad, un candidato se rechaza cuando, entre otros casos:

- no existe un precio actual válido;
- no posee ventas históricas útiles;
- la actividad se concentra en menos de dos días;
- completar la cantidad demoraría más de 14 días según el promedio de 28 días;
- el precio actual es atípico frente a la mediana histórica.

## Mercados descartados y advertencias

La interfaz cuenta los candidatos descartados, pero la advertencia roja se vincula a la configuración actual. Si la ciudad seleccionada no es elegible, se muestra la causa principal. Al cambiar a una ciudad viable, esa advertencia desaparece inmediatamente.

Cuando no existe ninguna recomendación viable, la interfaz puede mostrar el mejor precio teórico descartado para explicar por qué no fue utilizado, por ejemplo:

- precio atípico frente a la mediana;
- sin ventas históricas;
- actividad insuficiente;
- más de 14 días estimados para completar la cantidad.

De este modo Caerleon no se excluye globalmente: puede ser recomendado para objetos con mercado real, pero no gana por una orden residual o un precio sin liquidez.

## Caché

Los historiales se guardan por servidor, ciudad, ítem y calidad. La caché:

- dura 30 minutos antes de volver a consultar automáticamente;
- se persiste en `localStorage`;
- conserva hasta 400 combinaciones recientes;
- reutiliza solicitudes en curso para evitar consultas duplicadas;
- procesa las consultas del optimizador con concurrencia limitada a cuatro.

El botón **Reintentar historial** permite forzar una actualización cuando existen errores parciales.

## Límites

La evaluación usa ventas históricas como indicador de liquidez. No conoce la profundidad exacta del libro de órdenes, cuántas unidades están disponibles al primer precio, la posición futura de una orden, costos de transporte ni riesgo de traslado. Por eso la confianza es una estimación y no una garantía de ejecución.

---

## PERSISTENCIA_PRECIOS.md

# Persistencia de precios manuales

Los precios manuales ahora se guardan automáticamente en `localStorage`.

## Comportamiento

- Cada precio se confirma al salir del campo o presionar Enter.
- Los valores se separan por ítem raíz, encantamiento y ruta dentro de la receta.
- Al volver a la misma receta, incluso después de cerrar el navegador, los precios se restauran.
- El valor `0` se conserva como precio válido confirmado.
- Los datos permanecen únicamente en el navegador del usuario y no se envían a un servidor.

## Controles

Sobre el árbol de materiales aparece una barra de guardado local con opciones para:

- borrar los precios de la receta actual;
- borrar todos los precios guardados en el navegador.

## Almacenamiento

Clave utilizada:

```text
albion-craft-calculator.manual-prices.v1
```

El formato está versionado y valida los datos antes de cargarlos. Entradas corruptas, negativas o incompatibles se ignoran de forma segura.

---

## PRECIOS_AODP.md

# Precios automáticos con Albion Online Data Project

La calculadora puede consultar precios actuales de Albion Online Data Project
(AODP) y utilizarlos como respaldo de los precios manuales.

## Configuración de mercado

La tarjeta **Configuración de mercado** permite seleccionar:

- servidor: Americas, Europe o Asia;
- ciudad donde se compran los materiales;
- ciudad donde se vende el producto;
- estrategia de compra;
- estrategia de venta;
- calidad del producto terminado: Normal, Bueno, Sobresaliente, Excelente u
  Obra maestra.

Las estrategias se interpretan así:

| Operación | Estrategia | Campo AODP utilizado |
| --- | --- | --- |
| Materiales | Comprar inmediatamente | `sell_price_min` |
| Materiales | Colocar orden de compra | `buy_price_max` |
| Producto | Vender mediante orden | `sell_price_min` |
| Producto | Vender inmediatamente | `buy_price_max` |

La calidad elegida se utiliza para el precio de venta y el historial del
producto terminado. Los materiales se consultan siempre con calidad Normal
(`quality = 1`), porque los recursos empleados por las recetas no poseen
calidad de mercado.

## Prioridad de precios

Para cada material se aplica este orden:

1. precio manual asociado a la ruta del árbol;
2. precio automático AODP para el objeto, encantamiento y ciudad;
3. precio pendiente si ninguna fuente está disponible.

El precio de venta manual del producto también tiene prioridad. El botón
**Usar precio AODP** elimina únicamente ese override y vuelve al valor
automático disponible.

Un precio manual de `0` continúa siendo válido.

## Fecha y confianza del precio

Cada precio automático muestra:

- fecha y hora exactas informadas por AODP para el campo utilizado;
- tiempo relativo, por ejemplo, `actualizado hace 24 minutos`;
- un estado visual de confianza.

La clasificación utilizada es transparente:

| Antigüedad | Estado |
| --- | --- |
| Hasta 30 minutos | Reciente |
| Más de 30 minutos y hasta 6 horas | Aceptable |
| Más de 6 horas | Antiguo |
| Precio o fecha ausentes | Sin datos |

La fecha corresponde al precio seleccionado por la estrategia. Por ejemplo,
**Comprar inmediatamente** usa la fecha de `sell_price_min`, mientras que una
orden de compra usa la fecha de `buy_price_max`.

Cuando un precio automático antiguo está siendo utilizado, la interfaz muestra
una advertencia junto al valor. Si existe un override manual, el estado del
precio AODP permanece visible como referencia, pero no se considera activo.

La tarjeta de mercado resume cuántos precios están recientes, aceptables,
antiguos o sin datos. Esta confianza es una clasificación propia de la
aplicación; AODP entrega la fecha, no una garantía de vigencia ni liquidez.

## Caché local

La configuración, los snapshots automáticos y los precios de venta manuales se
guardan en `localStorage`.

- Los snapshots de menos de 5 minutos se consideran suficientes para evitar una
  nueva solicitud.
- Si AODP falla, se conservan los últimos datos guardados y los precios
  manuales siguen disponibles.
- **Actualizar precios** fuerza una consulta para el objeto, sus ingredientes y
  el historial del producto terminado.
- **Limpiar caché** elimina los snapshots actuales e históricos de AODP; no borra
  los precios manuales existentes.

Cada snapshot conserva por separado:

- la fecha del precio informada por AODP;
- el momento en que la aplicación realizó la consulta.

La confianza se calcula con la primera fecha, no con el momento de la consulta.
Por ello, volver a consultar un precio antiguo no lo convierte en reciente.

## Solicitudes agrupadas

Los materiales se agrupan por servidor y ciudad de compra con calidad Normal.
El producto terminado se consulta por separado con la ciudad de venta y la
calidad seleccionada. Cuando una URL se acerca al límite del proveedor, la
aplicación la divide en varios lotes.

## Alcance implementado

Incluido:

- precios actuales;
- servidor y ciudades;
- estrategias de compra y venta;
- selector de calidad para el producto terminado;
- override manual;
- retorno al precio automático;
- caché persistente y manejo de errores;
- fecha exacta y tiempo relativo;
- clasificación de confianza;
- advertencia por precios antiguos;
- historial diario de 7 y 28 días;
- precio promedio ponderado, mínimo y máximo;
- volumen total y promedio diario;
- volatilidad de precios;
- gráfico combinado de precio y volumen.

## Historial de precio y volumen

Para el producto terminado se consulta el endpoint histórico de AODP en la
ciudad de venta y calidad seleccionadas. La solicitud utiliza agregación diaria
(`time-scale = 24`) y conserva los últimos 28 días UTC completos. El límite
superior enviado a AODP avanza hasta la medianoche del día siguiente para no
perder los buckets del último día completo. La vista de 7 días se deriva desde
el mismo snapshot.

La aplicación normaliza la serie para incluir con volumen `0` los días que
AODP omite. Así, el volumen diario promedio no se infla contando únicamente
días con registros.

Las métricas se calculan de la siguiente manera:

- **Precio promedio:** ponderado por `item_count` cuando existe volumen.
- **Mínimo y máximo:** extremos de los precios promedio diarios observados.
- **Volumen diario:** volumen total dividido por 7 o 28 días, incluidos ceros.
- **Volatilidad:** desviación estándar de los precios promedio diarios dividida
  por su media, expresada como porcentaje.

El gráfico muestra la evolución del precio promedio diario y barras de volumen.
Los puntos históricos se guardan en una caché separada durante 30 minutos; si
la consulta falla, puede utilizarse el último snapshot local disponible.

AODP documenta el historial como datos de **órdenes de venta**. Por lo tanto,
cambiar entre **Vender mediante orden** y **Vender inmediatamente** modifica el
precio actual usado por la calculadora, pero no el gráfico histórico. El volumen
no representa todas las órdenes de compra, ventas garantizadas ni la liquidez
futura del objeto.

Pendiente para el siguiente cambio:

- lote máximo recomendado según volumen histórico.

---

## PRECIO_OBJETIVO.md

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

---

## PRESETS_CONFIGURACION.md

# Presets de producción y venta

Los presets guardan configuraciones frecuentes en el navegador mediante `localStorage`.

## Datos incluidos

- Ciudad.
- Bono de especialidad.
- Uso de foco.
- Bono diario y su magnitud.
- Estado Premium para las comisiones de venta.

No se guardan el objeto seleccionado, el encantamiento, la cantidad, los precios de materiales ni el precio de venta.

## Specialty kind

El preset no guarda `specialtyKind`. Al aplicarlo, la calculadora conserva automáticamente el tipo correcto del objeto actual: `crafting` o `refining`.

## Acciones disponibles

- Aplicar un preset.
- Guardar la configuración actual como uno nuevo.
- Actualizar un preset modificado.
- Renombrar.
- Eliminar con confirmación.
- Marcar o quitar un preset predeterminado.

El preset predeterminado se carga al iniciar la aplicación. La configuración se mantiene al cambiar de receta.

## Clave de almacenamiento

```text
albion-craft-calculator:craft-presets:v1
```

---

## RECETAS_EQUIPO_REAL.md

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

---

## REMODELACION_UI.md

# Remodelación visual y estructura de navegación

La aplicación ahora funciona sobre un `AppShell` reutilizable y una navegación por módulos.

## Módulos visibles

- **Crafteo:** calculadora actual con catálogo lateral.
- **Refinamiento:** página preparada para el futuro módulo.
- **Presets:** biblioteca local para revisar, aplicar, marcar como predeterminados o eliminar presets.

## Componentes globales añadidos

```text
src/app/
├─ AppHeader.tsx
├─ AppIcons.tsx
├─ AppShell.tsx
├─ MainNavigation.tsx
├─ ModuleHeader.tsx
└─ types.ts
```

## Mejoras de UX

- Identidad actualizada a **Albion Production Calculator**.
- Encabezado global con navegación, estado del catálogo y módulo activo.
- Encabezados contextuales para cada módulo.
- Estado vacío con onboarding, flujo recomendado y beneficios.
- Catálogo lateral convertido en drawer en pantallas pequeñas.
- Página funcional de administración rápida de presets.
- Página informativa de Refinamiento preparada para su implementación.
- Fondo y jerarquía visual renovados sin modificar la lógica de cálculo.

---

## RRR_RECURSOS_RETORNABLES.md

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

---

## SERVICIO_MERCADO_LOCAL.md

# Fuentes de lectura de mercado

La calculadora no consulta AODP directamente. Los precios actuales se obtienen
del pipeline propio con degradación automática.

```text
Albion Data Client
      ↓
albion-market-data-platform
  receiver + forwarder
      ↓                         ↘ fallback local :8787
albion-market-api :8080
      ↓
Albion Production Calculator
      ↓ si ambas fuentes fallan
caché del navegador
```

## Variables de entorno

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

`VITE_MARKET_API_URL` solo se mantiene como alias legado de
`VITE_LOCAL_MARKET_API_URL`.

## Prioridad

1. **API central:** fuente principal persistida en PostgreSQL.
2. **Receiver local:** completa combinaciones ausentes o reemplaza a la API
   central si está desconectada.
3. **Caché del navegador:** conserva el último snapshot válido cuando ninguna
   fuente en línea puede responder.
4. **Precio manual:** no forma parte del fallback automático; es un override del
   usuario y siempre tiene prioridad en el cálculo.

Una respuesta vacía no borra un precio cacheado válido. Las filas sin precio de
compra y sin precio de venta se consideran ausentes y permiten probar el
siguiente nivel de fallback.

El fallback también se aplica por lado del mercado: la API central conserva la
prioridad para cada campo disponible y el receiver puede completar solamente
`sellPriceMin` o `buyPriceMax` cuando el otro proveedor no lo posee. La interfaz
muestra el origen correspondiente al precio realmente seleccionado.

## Catálogo

La aplicación intenta:

```text
GET :8080/api/v1/markets
GET :8787/api/v1/markets   # fallback
```

El modelo público contiene solamente:

```json
{
  "key": "martlock",
  "name": "Martlock",
  "type": "regular",
  "enabled": true
}
```

React no recibe `location_id`, `cityLocationId` ni `marketLocationId`.
La última respuesta válida se guarda con
`albion-production-calculator.market-catalog-cache.v1` y se restaura si ambos
servicios están desconectados.

## Precios actuales

Consulta principal:

```http
POST :8080/api/v1/prices/query
Content-Type: application/json
```

```json
{
  "server": "west",
  "marketKeys": ["martlock"],
  "entries": [{ "itemIdentifier": "T4_BAG", "quality": 1 }]
}
```

Fallback local:

```text
GET :8787/api/v1/prices?server=west&marketKey=martlock&itemIds=T4_BAG&quality=1
```

| Operación        | Estrategia              | Campo utilizado |
| ---------------- | ----------------------- | --------------- |
| Comprar material | Comprar inmediatamente  | `sellPriceMin`  |
| Comprar material | Colocar orden de compra | `buyPriceMax`   |
| Vender producto  | Vender mediante orden   | `sellPriceMin`  |
| Vender producto  | Vender inmediatamente   | `buyPriceMax`   |

La frescura se calcula con `sellPriceMinDate` o `buyPriceMaxDate`, según el lado
del mercado realmente usado.

## Historial

La API central todavía no publica historial. Esta función mantiene el contrato
local:

```text
GET :8787/api/v1/history?server=west&marketKey=brecilien&itemId=ITEM&quality=4&period=4-weeks&limit=1
```

## Caché

```text
albion-production-calculator.market-cache.v3
albion-production-calculator.market-catalog-cache.v1
albion-production-calculator.local-market-history-cache.v2
```

Los snapshots de versiones anteriores se migran al cargarse y se marcan como
`browser-cache`. Un snapshot restaurado no impide intentar una consulta en
línea al comenzar una nueva sesión.

## Diagnóstico visible

La barra “Datos de mercado” muestra:

- estado de la API central y del fallback efectivo;
- origen activo de los precios usados;
- cantidad de precios centrales, locales, cacheados y ausentes;
- advertencias de degradación;
- frescura de los snapshots.

---

## TARIFAS_ESTACION_Y_FOCO.md

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
