# Cuentas, autenticación y entitlements

## Alcance del Hito 2

La aplicación integra identidad mediante Auth0 y mantiene la autorización en la API central. El navegador no decide si una cuenta es Pro: solo representa los entitlements efectivos devueltos por `albion-market-api`.

```text
Usuario
  → Auth0 Universal Login
  → access token para albion-market-api
  → GET /api/v1/me
  → usuario y suscripción en Neon
  → entitlements efectivos
  → Zustand
  → FeatureGate y límites visibles
```

## Responsabilidades

### Auth0

- registra e inicia sesión;
- emite access tokens para la audiencia configurada;
- mantiene la sesión del navegador;
- entrega identidad básica como `sub`, correo y nombre.

### API central

- valida firma, issuer, audience y vigencia del JWT;
- sincroniza el usuario por `sub`;
- resuelve la suscripción vigente;
- combina entitlements del plan con overrides activos;
- devuelve `/api/v1/me` y `/api/v1/me/entitlements`.

### Frontend

- inicia y cierra sesión mediante redirect;
- solicita el access token silenciosamente;
- envía `Authorization: Bearer` únicamente a la API central;
- conserva el acceso efectivo en memoria con Zustand;
- aplica límites Free mientras no existe una sesión válida;
- muestra capacidades bloqueadas sin ejecutar sus consultas avanzadas.

## Variables públicas

```dotenv
VITE_AUTH0_ENABLED=false
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_AUTH0_AUDIENCE=https://albion-market-api
VITE_AUTH0_SCOPE=openid profile email
```

Estas variables son identificadores públicos de una SPA. Nunca se debe agregar un client secret, token, contraseña o credencial privada con prefijo `VITE_`.

## Activación coordinada

La autenticación solo debe habilitarse cuando ambos lados estén configurados:

1. Crear la aplicación SPA y la API en Auth0.
2. Autorizar callbacks, logout y web origins de localhost y Cloudflare Pages.
3. Configurar las variables `VITE_AUTH0_*` en Cloudflare Pages.
4. Configurar `AUTH_ISSUER` y `AUTH_AUDIENCE` en Render.
5. Cambiar `AUTH_ENABLED=true` en Render y `VITE_AUTH0_ENABLED=true` en Cloudflare.
6. Desplegar y verificar login, `/api/v1/me`, logout y renovación de sesión.

## Pro manual durante este hito

Todavía no hay facturación. El flujo de prueba es:

1. El usuario inicia sesión y abre `/account`.
2. La API crea o actualiza `app_users`.
3. Administración asigna una suscripción Pro en PostgreSQL.
4. El usuario pulsa **Actualizar permisos**.
5. El optimizador de liquidez y el resto de capacidades Pro se desbloquean.
6. Al retirar o vencer la suscripción, la siguiente sincronización vuelve a bloquearlas.

## Rutas

- `/plans`: comparación de Free y Pro.
- `/account`: perfil, suscripción y entitlements efectivos.

Cloudflare Pages usa `public/_redirects` para que ambas rutas carguen correctamente incluso al recargar directamente.
