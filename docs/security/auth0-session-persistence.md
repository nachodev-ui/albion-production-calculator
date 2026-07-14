# Persistencia de sesión con Auth0

La aplicación conserva la sesión al recargar mediante el caché persistente del SDK de Auth0 y refresh tokens rotatorios.

## Configuración del frontend

La configuración productiva efectiva es:

```env
VITE_AUTH0_SCOPE=openid profile email offline_access read:account
VITE_AUTH0_CACHE_LOCATION=localstorage
VITE_AUTH0_SESSION_REFRESH_ENABLED=true
VITE_AUTH0_SESSION_FALLBACK_ENABLED=true
```

El frontend añade `offline_access` automáticamente cuando la renovación de sesión está activa. El fallback mantiene compatibilidad temporal con tenants donde todavía no se ha habilitado la emisión de refresh tokens.

## Configuración manual del tenant

En Auth0 Dashboard:

1. En **Applications > APIs > Albion Market API > Settings**, habilitar **Allow Offline Access**.
2. En **Applications > Applications > Albion Production Calculator Web > Settings**, comprobar que **Application Type** sea **Single Page App**.
3. En **Refresh Token Rotation**, habilitar **Rotation** y conservar la detección de reutilización.
4. En **Refresh Token Expiration**, habilitar expiración absoluta y por inactividad con valores apropiados para una sesión web.
5. En **Advanced Settings > Grant Types**, comprobar que estén habilitados **Authorization Code** y **Refresh Token**.
6. Confirmar que `https://albion-production-calculator.pages.dev` figure exactamente, sin comodines, en **Allowed Callback URLs**, **Allowed Logout URLs** y **Allowed Web Origins**.
7. Guardar los cambios al final de la página.

El permiso `read:account` continúa autorizado en **User-Delegated Access** para el Client ID `4Bhvhd3PcxNwmMyvK5ocLi9Q33hHr74y` y el audience `https://albion-market-api`.

No se deben agregar secretos de Auth0 a variables `VITE_*`: el dominio, Client ID, audience, scope y opciones del SDK son configuración pública del SPA.

## Seguridad

Guardar tokens en `localStorage` evita perder la sesión durante una recarga, pero aumenta el impacto potencial de una vulnerabilidad XSS. Por eso el despliegue mantiene una Content Security Policy estricta, bloquea scripts de terceros y no permite `unsafe-eval`.

El objetivo posterior recomendado es configurar un dominio personalizado de Auth0 bajo el dominio propio de la aplicación y evaluar volver al caché en memoria cuando la autenticación silenciosa de primera parte sea estable.
