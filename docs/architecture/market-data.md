# Arquitectura de datos de mercado

## Responsabilidades

```text
Albion Data Client
  → albion-market-data-platform
      receiver, normalización, outbox y forwarders
  → albion-market-api
      PostgreSQL y contratos públicos por marketKey
  → albion-craft-calculator
      lectura, fallback, caché y presentación
```

React trabaja exclusivamente con `marketKey`, por ejemplo `martlock` o
`fort_sterling`. Nunca recibe ni envía `location_id`.

## Prioridad de lectura

Precios actuales e historial usan la misma política:

```text
API central
  ↓ si falla o falta la combinación
receiver local
  ↓ si también falla o no aporta datos
caché persistente del navegador
```

Una respuesta parcial de la API central puede completarse desde el receiver. En
precios actuales, la fuente se conserva por lado de compra y venta. En historial,
la serie completa indica una única fuente efectiva.

## Precios actuales

La consulta central es batch:

```http
POST /api/v1/prices/query
```

El receiver mantiene el contrato de compatibilidad:

```http
GET /api/v1/prices
```

## Historial

El optimizador y el gráfico consultan primero:

```http
POST /api/v1/history/query
```

Los candidatos se deduplican y se agrupan por servidor, por lo que normalmente
se realiza una solicitud central por servidor. Solo las combinaciones ausentes
se consultan individualmente en el receiver:

```http
GET /api/v1/history
```

La caché histórica se conserva hasta siete días. Un snapshot restaurado siempre
se marca como `browser-cache`, aunque originalmente proviniera de una fuente en
línea.

## Frescura visible

La UI separa:

- **Origen:** API central, receiver local o caché del navegador.
- **Último bucket:** fecha real del punto histórico más reciente.
- **Última consulta:** momento en que el navegador recuperó la serie.

Esto evita confundir una consulta reciente con datos de mercado antiguos.

## Degradación

Las fallas de una fuente se muestran como advertencias sin ocultar una serie que
sí pudo recuperarse desde otra fuente. El estado solo pasa a error cuando no
existe respuesta útil ni caché.
