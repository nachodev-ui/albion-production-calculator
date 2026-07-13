---
title: Auth0 en producción
---

# Auth0 en producción

## Configuración activa

- Frontend: `https://albion-production-calculator.pages.dev`
- API: `https://albion-market-api.onrender.com`
- Tenant domain: `albion-production-calculator.us.auth0.com`
- SPA Client ID: `LNrCFAgAUVubf14yCe10eAMx42w9XJvv`
- Audience / API Identifier: `https://albion-market-api`
- Scope delegado: `read:account`
- Algoritmo: `RS256`

El domain, Client ID y audience son identificadores públicos. Nunca debe almacenarse un Client Secret en el frontend ni en una variable `VITE_*`.

## Aplicación SPA

La aplicación `Albion Production Calculator` está configurada como **Single Page Application** con:

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

No se usan comodines, Cross-Origin Authentication, Client Credentials ni secretos de aplicación.

## API y acceso delegado

La API `Albion Market API` usa el identifier `https://albion-market-api`. En **Permissions** define:

```text
read:account
```

En **Application Access**, únicamente `Albion Production Calculator` tiene `1 / 1` permisos de acceso delegado. Client Access permanece deshabilitado.

El frontend solicita:

```text
openid profile email read:account
```

La API valida firma, issuer, audience, expiración y el scope `read:account` antes de atender `/api/v1/me` o `/api/v1/me/entitlements`.

## Despliegue

El deployment estándar de Cloudflare Pages se ejecuta primero. Al finalizar, `Deploy Auth0 production` recompila con la configuración Auth0 activa, confirma que Render ya responde `401` sin token y publica el bundle final.

La API se despliega antes que el frontend mediante `Deploy Auth0 production to Render`. Ese workflow valida discovery/JWKS, aplica migraciones de Neon, despliega la revisión exacta y verifica health, readiness, CORS y autenticación.

## Interruptor de emergencia

En production la autenticación está activa por defecto. Solo debe deshabilitarse temporalmente ante una incidencia mediante:

```text
AUTH_EMERGENCY_DISABLED=true
```

Después de resolver el incidente debe restaurarse a `false` y desplegarse nuevamente.

## Verificación funcional

1. Abrir `/account` y pulsar **Iniciar sesión**.
2. Completar Universal Login.
3. Confirmar retorno a Cloudflare Pages.
4. Comprobar que `/api/v1/me` responde y crea o actualiza `app_users` por `sub`.
5. Confirmar plan Free y entitlements efectivos.
6. Pulsar **Actualizar permisos**.
7. Cerrar sesión y confirmar retorno al origen público.
