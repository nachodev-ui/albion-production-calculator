# Despliegue público en Cloudflare Pages

## Arquitectura

```text
Usuario
  → Cloudflare Pages global
  → albion-market-api en Render Virginia
  → PostgreSQL Neon en São Paulo
```

El frontend se publica como archivos estáticos. No contiene credenciales de
base de datos ni tokens de ingesta. La única configuración embebida es la URL
pública de la API.

## Dominios canónicos

```text
Frontend: https://albion-production-calculator.pages.dev
API:      https://albion-market-api.onrender.com
API v1:   https://albion-market-api.onrender.com/api/v1
```

El proyecto de Cloudflare Pages debe llamarse exactamente
`albion-production-calculator` para conservar el dominio configurado. Si el nombre
no está disponible, actualiza en el mismo cambio:

- el workflow de despliegue;
- `scripts/bootstrap-cloudflare-production.ps1`;
- la variable `CORS_ALLOWED_ORIGINS` del servicio de API;
- la documentación de ambos repositorios.

## Configuración del bundle

Producción utiliza:

```dotenv
VITE_CENTRAL_MARKET_API_URL=https://albion-market-api.onrender.com/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
VITE_MARKET_REQUEST_TIMEOUT_MS=7000
```

Las variables `VITE_*` son públicas. No agregues tokens, contraseñas, claves API
ni credenciales a ellas.

## Credenciales de despliegue

Cloudflare requiere:

| Valor | Uso |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | identifica la cuenta que contiene Pages |
| `CLOUDFLARE_API_TOKEN` | permite crear y desplegar el proyecto Pages |

Crea un API token limitado a la cuenta y con permisos de edición para Cloudflare
Pages. No uses la Global API Key.

Para el primer bootstrap local, guarda los valores fuera de Git:

```text
secrets/deployment/cloudflare-account-id.secret
secrets/deployment/cloudflare-api-token.secret
```

Ambos archivos están ignorados por `.gitignore`. No pegues sus contenidos en
issues, pull requests, logs ni documentación.

## Primer despliegue

Antes de publicar el frontend, la API debe responder correctamente:

```powershell
Invoke-RestMethod https://albion-market-api.onrender.com/healthz
Invoke-RestMethod https://albion-market-api.onrender.com/readyz
```

Después ejecuta:

```powershell
.\scripts\bootstrap-cloudflare-production.ps1
```

El script:

1. lee las credenciales desde archivos ignorados;
2. crea el proyecto Pages con rama de producción `main`;
3. instala dependencias usando el lockfile;
4. valida contratos y configuración pública;
5. ejecuta las pruebas;
6. genera el bundle con la API HTTPS definitiva;
7. despliega `dist/`;
8. comprueba el HTML público y readiness de la API.

Si el proyecto ya existe:

```powershell
.\scripts\bootstrap-cloudflare-production.ps1 -SkipProjectCreate
```

## GitHub Environment

Crea un Environment llamado `production` en el repositorio y agrega:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

El workflow `.github/workflows/deploy-production.yml` se ejecuta automáticamente
cuando un cambio se fusiona en `main`. También conserva `workflow_dispatch` para
repetir una publicación manualmente cuando sea necesario.

Cada ejecución repite:

- instalación reproducible;
- contratos;
- seguridad pública;
- lint;
- pruebas;
- build de producción;
- presupuesto del bundle;
- despliegue de Pages;
- smoke test del frontend y la API.

## Headers y seguridad

Vite copia `public/_headers` al artefacto final. Cloudflare Pages aplica allí:

- Content Security Policy;
- `X-Content-Type-Options`;
- `X-Frame-Options`;
- `Referrer-Policy`;
- `Permissions-Policy`.

La CSP permite conexiones HTTPS, pero no servicios loopback. El frontend público
no intenta conectarse a `localhost` ni al receiver local.

## Verificación posterior

```powershell
$frontend = Invoke-WebRequest `
    -UseBasicParsing `
    https://albion-production-calculator.pages.dev

$frontend.StatusCode
$frontend.Headers

Invoke-RestMethod `
    https://albion-market-api.onrender.com/api/v1/status
```

En el navegador verifica:

- catálogo de mercados;
- actualización de precios;
- historial;
- origen `API central`;
- ausencia del receiver local en diagnóstico;
- fallback a caché al simular una caída de red.

## Rollback

Cloudflare Pages conserva deployments anteriores. Un rollback del frontend no
debe cambiar secretos ni PostgreSQL. Antes de restaurar un deployment antiguo,
confirma que el contrato de API siga siendo compatible con ese bundle.

La API y el frontend se despliegan por separado. Publica primero la API compatible
y después el frontend que la consume.
