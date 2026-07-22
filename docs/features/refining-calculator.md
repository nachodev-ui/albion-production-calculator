# Calculadora de refinamiento

## Estado

MVP funcional para recursos crudos y refinados T2–T8. La pantalla calcula en paralelo los escenarios sin foco y con foco, reutiliza el pipeline de precios de mercado existente y mantiene las constantes balanceables fuera de los componentes.

## Investigación verificada el 22-07-2026

Fuentes primarias:

- [Resource Return Rate](https://wiki.albiononline.com/wiki/Resource_return_rate)
- [Guía oficial de refinamiento](https://albiononline.com/news/guide-refining)
- [Crafting Focus](https://wiki.albiononline.com/wiki/Crafting_Focus)
- [Especializaciones](https://wiki.albiononline.com/wiki/Specializations)
- [Tarifas y nutrición de edificios](https://wiki.albiononline.com/wiki/Building)
- [Albion Online Data Project](https://www.albion-online-data.com/api/)

Las guías recientes de la comunidad y el foro oficial se usaron como comprobación secundaria, pero los números del motor provienen de las fuentes anteriores y del dataset versionado del proyecto.

## Reglas de juego

### Producción y retorno

El retorno no cambia por tier. Se deriva del bono de producción:

```text
RRR = bonoProduccion / (1 + bonoProduccion)
```

Usando el bono como fracción:

- ciudad real: `0,18` → `15,3%` RRR;
- ciudad con especialidad de refinamiento: `0,18 + 0,40` → `36,7%`;
- ciudad real con foco: `0,18 + 0,59` → `43,5%`;
- especialidad de ciudad con foco: `0,18 + 0,40 + 0,59` → `53,9%`.

La especialidad de ciudad es fija por recurso:

- madera: Fort Sterling;
- mineral: Thetford;
- piel: Martlock;
- fibra: Lymhurst;
- roca: Bridgewatch.

La especialización personal 0–100 no aumenta el RRR. Reduce el costo de foco.

### Recetas

| Tier | Refinado previo | Recurso crudo |
| --- | ---: | ---: |
| T2 | 0 | 1 |
| T3 | 1 | 2 |
| T4 | 1 | 2 |
| T5 | 1 | 3 |
| T6 | 1 | 4 |
| T7 | 1 | 5 |
| T8 | 1 | 5 |

Para recursos encantados no pétreos, T4 utiliza refinado T3 normal; desde T5 utiliza refinado previo del mismo encantamiento.

La piedra refinada no tiene encantamiento. La roca `.1`, `.2` y `.3` multiplica el refinado previo y la salida por `2`, `4` y `8`, respectivamente.

### Especialización y foco

Cada nivel del nodo del tier seleccionado aporta:

```text
250 únicos + 30 compartidos = 280 Focus Cost Efficiency
```

Cada nivel de otro nodo T4–T8 aporta `30` compartidos. Con los cinco nodos a 100 se alcanzan `40.000` puntos.

```text
focoEfectivo = ceil(focoBase / 2^(eficiencia / 10.000))
```

Las tablas base por tier y encantamiento están en `refiningGameConfig.ts`.

Premium no da un retorno adicional directo. Permite acumular foco en el juego; en el cálculo financiero también determina el impuesto de mercado conforme a las reglas compartidas del proyecto.

### Tarifa de estación

```text
nutricionPorTirada = ItemValue * 0,1125
tarifaPorTirada = nutricionPorTirada * tarifaPor100 / 100
tarifaLote = tarifaPorTirada * tiradas
```

El acceso de asociado puede reemplazar la tarifa de usuario. Un puesto propio/gratuito aplica cero.

## Fórmulas económicas

```text
tiradas = ceil(cantidadObjetivo / salidaPorTirada)
produccion = tiradas * salidaPorTirada
brutoCrudo = tiradas * crudoPorTirada
brutoPrevio = tiradas * refinadoPrevioPorTirada
retornoCrudo = brutoCrudo * RRR
retornoPrevio = brutoPrevio * RRR
costoBruto = brutoCrudo * precioCrudo + brutoPrevio * precioPrevio
valorRetornado = retornoCrudo * precioCrudo + retornoPrevio * precioPrevio
inversionInicial = costoBruto + tarifaEstacion
costoEfectivo = inversionInicial - valorRetornado
ingresoNeto = ventaBruta - impuesto - tarifaOrden
beneficio = ingresoNeto - costoEfectivo
beneficioUnidad = beneficio / produccion
ROI = beneficio / inversionInicial
equilibrio = costoEfectivo / (produccion * (1 - comisionesVenta))
gananciaExtraFoco = beneficioConFoco - beneficioSinFoco
costoOportunidadFoco = focoTotal * plataPorFoco
valorNetoFoco = gananciaExtraFoco - costoOportunidadFoco
```

Los retornos se modelan como valor esperado. Albion redondea por tanda para aproximar el promedio, por lo que lotes pequeños pueden diferir por una unidad.

## Precios de mercado

La UI no consulta AODP directamente. Usa `useCurrentMarketPrices`, que conserva:

- API central;
- receiver local en entornos permitidos;
- caché del navegador;
- estrategias de compra y venta;
- frescura y fuentes de cada precio.

Los precios manuales pueden sobrescribir los automáticos sin alterar el pipeline.

## Constantes actualizables

`src/features/refining-calculator/config/refiningGameConfig.ts` contiene:

- recursos e identificadores de Albion;
- ciudades con especialidad;
- recetas por tier;
- multiplicadores de piedra;
- Item Value por tier;
- foco base por tier/encantamiento;
- enlaces de investigación;
- conversión de niveles de especialización a eficiencia.

No deben duplicarse estos números en componentes.

## Roadmap preparado

La separación `config → motor puro → componente` permite añadir sin reemplazar el MVP:

1. comparación automática entre ciudades;
2. refinamiento encadenado por varios tiers;
3. compra y venta en ciudades distintas;
4. ranking por plata por punto de foco;
5. planificación completa T4–T8.
