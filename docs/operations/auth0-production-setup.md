---
title: Activación de Auth0 en producción
---

# Activación de Auth0 en producción

## Identificadores acordados

- Frontend público: `https://albion-production-calculator.pages.dev`
- API pública: `https://albion-market-api.onrender.com`
- Audience / API Identifier: `https://albion-market-api`

El identifier de Auth0 es lógico y no depende del proveedor donde se despliega la API.

## Recursos de Auth0

Crear en el mismo tenant:

1. Una aplicación **Single Page Application** llamada `Albion Production Calculator`.
2. Una API llamada `Albion Market API` con identifier `https://albion-market-api` y algoritmo `RS256`.

Configurar la SPA con:

```text
Allowed Callback URLs
https://albion-production-calculator.pages.dev,
http://localhost:5173

Allowed Logout URLs
https://albion-production-calculator.pages.dev,
http://localhost:5173

Allowed Web Origins
https://albion-production-calculator.pages.dev,
http://localhost:5173

Allowed Origins (CORS)
https://albion-production-calculator.pages.dev,
http://localhost:5173
```

No usar comodines en producción y no copiar el Client Secret al frontend.

## GitHub Environment `production`

El frontend se compila en GitHub Actions y después se publica mediante Cloudflare Pages Direct Upload. Por eso los valores públicos deben configurarse como variables del Environment `production` del repositorio:

```text
AUTH0_ENABLED=true
AUTH0_DOMAIN=<tenant-domain-sin-https>
AUTH0_CLIENT_ID=<spa-client-id>
AUTH0_AUDIENCE=https://albion-market-api
```

El workflow transforma estos valores en `VITE_AUTH0_*` durante el build. No se deben guardar como secretos porque el dominio, Client ID y audience quedan visibles en el bundle del navegador.

## Render

Configurar en el servicio `albion-market-api`:

```text
AUTH_ENABLED=true
AUTH_ISSUER=https://<tenant-domain>/
AUTH_AUDIENCE=https://albion-market-api
```

Mantener los valores de caché, timeout y clock skew definidos en `render.yaml`.

## Orden seguro de activación

1. Crear la SPA y la API en Auth0.
2. Configurar callbacks, logout y web origins.
3. Configurar `AUTH_ISSUER` y `AUTH_AUDIENCE` en Render, dejando `AUTH_ENABLED=false`.
4. Configurar las variables públicas en el Environment `production` de GitHub, dejando `AUTH0_ENABLED=false`.
5. Cambiar `AUTH_ENABLED=true` en Render y desplegar la API.
6. Confirmar que `/api/v1/me` sin token responde `401`.
7. Cambiar `AUTH0_ENABLED=true` en GitHub y publicar el frontend.
8. Probar login, `/account`, actualización de permisos, renovación silenciosa y logout.

Si la API no está lista, el frontend debe permanecer deshabilitado para evitar una experiencia de login que termine en error.
