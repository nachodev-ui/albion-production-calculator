# Primeros pasos

## Requisitos

- Node.js 22 o posterior.
- pnpm.
- `albion-market-api` en `http://127.0.0.1:8080` para lectura central.
- `albion-market-data-platform` en `http://127.0.0.1:8787` como receiver y fallback local.

## Instalación

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

La aplicación puede abrir sin servicios de mercado. En ese caso conserva la
caché disponible y permite usar precios manuales.

## Variables de entorno

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

`VITE_MARKET_API_URL` se conserva únicamente como alias legado del receiver.
Las instalaciones nuevas deben usar las dos variables explícitas.

## Orden local recomendado

1. PostgreSQL.
2. `albion-market-api`.
3. Receiver de `albion-market-data-platform`.
4. `albion-craft-calculator`.

También está disponible:

```powershell
./scripts/dev-local.ps1
```
