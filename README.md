# Albion Production Calculator

Calculadora React para crafteo, refinamiento y análisis económico en Albion
Online. Integra precios actuales, historial, retorno de recursos, tarifas,
fama, liquidez y optimización de mercados.

## Mercado resiliente

Precios e historial siguen la misma prioridad:

```text
albion-market-api (:8080)
          ↓ si falla o falta una combinación
receiver de albion-market-data-platform (:8787)
          ↓ si tampoco hay una respuesta útil
caché persistente del navegador
```

El frontend utiliza `marketKey` y nunca conoce `location_id`. La interfaz muestra
el origen efectivo, la última consulta y, para historial, el bucket más reciente.

## Inicio rápido

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Variables principales:

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

## Validación

```bash
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
- [Arquitectura de la aplicación](docs/architecture/overview.md)
- [Arquitectura de mercado](docs/architecture/market-data.md)
- [Política de documentación](docs/operations/documentation.md)

Las notas antiguas se consolidaron en
`docs/archive/legacy-implementation-notes.md`; no son la fuente de verdad del
comportamiento actual.
