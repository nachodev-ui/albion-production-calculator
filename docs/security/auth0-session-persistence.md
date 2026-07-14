# Persistencia de sesión con Auth0

La aplicación conserva la sesión al recargar mediante el caché persistente del SDK de Auth0 y refresh tokens rotatorios.

## Configuración del frontend

La configuración productiva efectiva es:

```env
VITE_AUTH0_SCOPE=openid profile email offline_access read:account
VITE_AUTH0_CACHE_LOCATION=localstorage
VITE_AUTH0_USE_REFRESH_TOKENS=true
VITE_AUTH0_USE_REFRESH_TOKENS_FALLBACK=true
```

El frontend añade `offline_access` automáticamente cuando los refresh tokens están activos. El fallback mantiene compatibilidad temporal con tenants donde todavía no se ha habilitado la emisión de refresh tokens.

## Configuración manual del tenant

En Auth0 Dashboard:

1. En **Applications > APIs > Albion Market API > Settings**, habilitar **Allow Offline Access**.
2. En **Applications > Applications > Albion Production Calculator > Settings**, comprobar que el tipo sea **Single Page Application**.
3. En la misma aplicación, abrir **Refresh Token Rotation** y habilitar **Rotation**.
4. Usar detección de reutilización y una expiración absoluta razonable para la sesión.
5. Confirmar que `https://albion-production-calculator.pages.dev` figure en **Allowed Callback URLs**, **Allowed Logout URLs** y **Allowed Web Origins**.

No se deben agregar secretos de Auth0 a variables `VITE_*`: el dominio, Client ID, audience, scope y opciones del SDK son configuración pública del SPA.

## Seguridad

Guardar tokens en `localStorage` evita perder la sesión durante una recarga, pero aumenta el impacto potencial de una vulnerabilidad XSS. Por eso el despliegue mantiene una Content Security Policy estricta, bloquea scripts de terceros y no permite `unsafe-eval`.

El objetivo posterior recomendado es configurar un dominio personalizado de Auth0 bajo el dominio propio de la aplicación y evaluar volver al caché en memoria cuando la autenticación silenciosa de primera parte sea estable.
