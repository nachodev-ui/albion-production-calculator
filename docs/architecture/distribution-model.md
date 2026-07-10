# Modelo de distribución

## Decisión

Albion Production Calculator adopta un modelo **hosted-first**. La aplicación
pública se distribuye como frontend web y utiliza una API central HTTPS respaldada
por PostgreSQL. El receiver local queda fuera del camino crítico de lectura.

## Usuario normal

```text
Navegador
  → frontend web hosteado
  → albion-market-api por HTTPS
  → PostgreSQL central
```

El usuario no instala Albion Data Client, receiver, Go, PostgreSQL ni scripts
locales. Si la API central no responde, la aplicación puede conservar temporalmente
los últimos datos disponibles en la caché del navegador.

## Colaborador de datos

```text
Albion Online
  → Albion Data Client
  → albion-market-data-platform local
  → albion-market-api por HTTPS y token de ingesta
  → PostgreSQL central
  → todos los usuarios
```

El receiver captura, normaliza, deduplica y persiste antes de reenviar. Su outbox
permite recuperar entregas pendientes cuando la API central vuelve a estar
disponible. La contribución no depende de que el frontend esté abierto.

## Política de configuración

### Producción y previews públicos

```dotenv
VITE_CENTRAL_MARKET_API_URL=https://api.example.com/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
VITE_MARKET_REQUEST_TIMEOUT_MS=7000
```

Reglas:

- la URL central es obligatoria;
- debe utilizar HTTPS;
- el receiver local permanece deshabilitado;
- no se almacenan secretos en variables `VITE_*`.

### Desarrollo normal

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
```

### Diagnóstico de colaborador

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=true
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

## Garantías del frontend

Con el fallback local deshabilitado:

- catálogo, precios e historial consultan exclusivamente la API central;
- las respuestas parciales no disparan peticiones a localhost;
- las caídas completas degradan a caché cuando existe información almacenada;
- la UI no muestra el receiver como fuente disponible;
- los mensajes de error no piden instalar ni iniciar el receiver.

Con el fallback habilitado, se conserva el flujo avanzado existente para pruebas
e inspección local.

## Responsabilidades de despliegue

| Componente | Responsabilidad |
|---|---|
| Frontend | hosting estático HTTPS, dominio y variables de build |
| API central | proceso Go continuo, HTTPS mediante plataforma o proxy confiable |
| PostgreSQL | almacenamiento persistente, migraciones y backups |
| Receiver | ejecución local restringida a colaboradores |
| Albion Data Client | origen local de las capturas de mercado |

La elección del proveedor de hosting no forma parte del contrato de código. El
modelo admite cualquier plataforma que mantenga HTTPS, variables de entorno,
persistencia y operación continua de la API.
