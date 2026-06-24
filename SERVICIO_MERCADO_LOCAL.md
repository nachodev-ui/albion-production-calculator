# Consumo del servicio local de mercado

La calculadora no consulta AODP directamente. El servicio local captura,
normaliza, persiste y publica tanto los datos como el catálogo de mercados.

```text
Albion Data Client
      ↓
albion-market-data-platform
      ↓ http://127.0.0.1:8787/api/v1
Albion Production Calculator
```

## URL

```env
VITE_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

## Catálogo único

Al iniciar, React consulta:

```text
GET /markets
```

Los selectores se construyen con esa respuesta. El frontend no contiene una
lista paralela de ciudades ni códigos. Cada selección guarda una clave estable,
por ejemplo `lymhurst`, y el backend resuelve esa clave al código de mercado
verificado (`1002`).

Black Market permanece deshabilitado en el catálogo hasta verificar su código.

## Precios actuales

```text
GET /prices?server=west&marketKey=brecilien&itemIds=ITEM_A,ITEM_B&quality=4
```

- `sellPriceMin`: menor orden de venta vigente conocida;
- `buyPriceMax`: mayor orden de compra vigente conocida.

| Operación | Estrategia | Campo local |
|---|---|---|
| Comprar material | Comprar inmediatamente | `sellPriceMin` |
| Comprar material | Colocar orden de compra | `buyPriceMax` |
| Vender producto | Vender mediante orden | `sellPriceMin` |
| Vender producto | Vender inmediatamente | `buyPriceMax` |

## Ciudades individuales por material

La ciudad de venta solo afecta al producto terminado. Cada material compra en
su propio `marketKey`; la ciudad predeterminada se utiliza únicamente cuando no
existe una asignación individual.

## Historial

```text
GET /history?server=west&marketKey=brecilien&itemId=ITEM&quality=4&period=4-weeks&limit=1
```

## Caché

Las cachés nuevas están versionadas para no reutilizar valores obtenidos antes
de corregir la resolución de ubicaciones:

```text
albion-production-calculator.local-market-cache.v2
albion-production-calculator.local-market-history-cache.v2
```

## Ausencia de datos

El servicio solo conoce combinaciones capturadas. Si falta una combinación, el
frontend conserva los precios manuales y no consulta una fuente pública de
respaldo.
