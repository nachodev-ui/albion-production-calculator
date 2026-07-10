# Arquitectura de datos de mercado

## Responsabilidades

```text
Captura colaborativa

Albion Data Client
  → albion-market-data-platform
      receiver local, normalización, outbox y forwarders
  → albion-market-api HTTPS
      PostgreSQL y contratos públicos por marketKey

Consumo público

albion-craft-calculator hosteado
  → albion-market-api HTTPS
      precios e historial compartidos
  → caché del navegador
      degradación temporal si la API central no responde
```

React trabaja exclusivamente con `marketKey`, por ejemplo `martlock` o
`fort_sterling`. Nunca recibe ni envía `location_id`.

## Prioridad pública de lectura

Precios actuales, catálogo e historial usan la misma política en producción:

```text
API central HTTPS
  ↓ si falla
caché persistente del navegador
```

El navegador de un usuario normal no intenta conectarse a `localhost` ni
requiere Albion Data Client, receiver, Go o PostgreSQL local.

## Modo colaborador y desarrollo

El receiver local puede habilitarse explícitamente para diagnóstico:

```dotenv
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=true
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

Solo en ese modo la política pasa a ser:

```text
API central
  ↓ si falla o falta una combinación
receiver local
  ↓ si tampoco aporta datos
caché persistente del navegador
```

Este fallback no reemplaza el forwarder del receiver. La contribución normal de
datos ocurre directamente desde `albion-market-data-platform` hacia la API
central autenticada.

## Precios actuales

La consulta central es batch:

```http
POST /api/v1/prices/query
```

Cuando el modo local está habilitado, el receiver mantiene el contrato de
compatibilidad:

```http
GET /api/v1/prices
```

Una respuesta central parcial solo puede completarse desde el receiver en modo
local explícito. En producción pública se conserva la respuesta central tal como
fue entregada y la caché protege ante fallos completos de red.

## Historial

El optimizador y el gráfico consultan primero:

```http
POST /api/v1/history/query
```

Los candidatos se deduplican y agrupan por servidor, por lo que normalmente se
realiza una solicitud central por servidor. El endpoint local individual se usa
solo con la flag avanzada habilitada:

```http
GET /api/v1/history
```

La caché histórica se conserva hasta siete días. Un snapshot restaurado siempre
se marca como `browser-cache`, aunque originalmente proviniera de una fuente en
línea.

## Frescura visible

La UI separa:

- **Origen:** API central, receiver local avanzado o caché del navegador.
- **Último bucket:** fecha real del punto histórico más reciente.
- **Última consulta:** momento en que el navegador recuperó la serie.

Esto evita confundir una consulta reciente con datos de mercado antiguos.

## Degradación

Una caída de la API central conserva los datos útiles ya almacenados en el
navegador. El estado pasa a error únicamente cuando no existe respuesta útil ni
caché. En modo público, los mensajes no sugieren instalar o iniciar un receiver.
