# Albion Production Calculator

Calculadora React para crafteo, refinamiento y análisis económico en Albion
Online. Integra precios actuales, historial, retorno de recursos, tarifas, fama,
liquidez y optimización de mercados.

## Distribución hosted-first

La aplicación pública no requiere instalaciones locales:

```text
Usuario
  → Cloudflare Pages HTTPS
  → albion-market-api en Render HTTPS
  → PostgreSQL Neon
```

Dominios configurados:

```text
Frontend: https://albion-production-calculator.pages.dev
API v1:   https://albion-market-api.onrender.com/api/v1
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

Consulta:

- [`docs/architecture/distribution-model.md`](docs/architecture/distribution-model.md)
- [`docs/operations/production-deployment.md`](docs/operations/production-deployment.md)

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

## Configuración de producción

```dotenv
VITE_CENTRAL_MARKET_API_URL=https://albion-market-api.onrender.com/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
VITE_MARKET_REQUEST_TIMEOUT_MS=7000
```

Nunca coloques secretos, tokens ni credenciales en variables `VITE_*`, porque sus
valores quedan expuestos en el bundle del navegador.

Después de crear la cuenta y el token limitado de Cloudflare, el primer despliegue
se ejecuta con:

```powershell
.\scripts\bootstrap-cloudflare-production.ps1
```

Los despliegues siguientes pueden realizarse desde el workflow manual
`Deploy production` después de configurar en el GitHub Environment `production`:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

## Validación

```bash
pnpm contracts:check
pnpm security:check
pnpm test
pnpm lint
pnpm build
pnpm bundle:check
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
- [Despliegue público](docs/operations/production-deployment.md)
- [Arquitectura de la aplicación](docs/architecture/overview.md)
- [Arquitectura de mercado](docs/architecture/market-data.md)
- [Política de documentación](docs/operations/documentation.md)

Las notas antiguas se consolidaron en
`docs/archive/legacy-implementation-notes.md`; no son la fuente de verdad del
comportamiento actual.
