# Albion Production Calculator

Calculadora React para crafteo, refinamiento y análisis económico en Albion
Online. Integra precios actuales, historial, retorno de recursos, tarifas,
fama, liquidez y optimización de mercados.

## Distribución hosted-first

La aplicación pública no requiere instalaciones locales:

```text
Usuario normal
  → frontend web HTTPS
  → albion-market-api HTTPS
  → PostgreSQL central
```

La lectura pública usa esta prioridad:

```text
API central HTTPS
  ↓ si no responde
caché persistente del navegador
```

El receiver de `albion-market-data-platform` es una herramienta independiente de
captura para colaboradores. Recibe datos desde Albion Data Client y los envía a
la API central; no es un requisito para utilizar la aplicación web.

El fallback hacia el receiver permanece disponible solo para desarrollo local y
diagnóstico avanzado mediante una flag explícita. Consulta
[`docs/architecture/distribution-model.md`](docs/architecture/distribution-model.md).

## Inicio rápido local

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Configuración normal de desarrollo contra la API central:

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
VITE_MARKET_REQUEST_TIMEOUT_MS=7000
```

Para diagnosticar un receiver local:

```dotenv
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=true
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

Los builds públicos deben proporcionar una URL central HTTPS y mantener el
fallback local desactivado:

```dotenv
VITE_CENTRAL_MARKET_API_URL=https://api.example.com/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
```

Nunca se deben colocar secretos, tokens ni credenciales en variables `VITE_*`,
porque sus valores quedan expuestos en el bundle del navegador.

## Validación

```bash
pnpm contracts:check
pnpm security:check
pnpm test
pnpm lint
pnpm build
pnpm docs:build
```

## Documentación

La documentación vigente vive en `docs/` y se publica como sitio VitePress:

```bash
pnpm docs:dev
```

Empieza por:

- [Primeros pasos](docs/getting-started.md)
- [Modelo de distribución](docs/architecture/distribution-model.md)
- [Arquitectura de la aplicación](docs/architecture/overview.md)
- [Arquitectura de mercado](docs/architecture/market-data.md)
- [Política de documentación](docs/operations/documentation.md)

Las notas antiguas se consolidaron en
`docs/archive/legacy-implementation-notes.md`; no son la fuente de verdad del
comportamiento actual.
