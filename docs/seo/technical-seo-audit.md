# Auditoría SEO técnica e infraestructura

Fecha: 2026-07-19

## Dominio canónico

El origen público canónico es `https://albioncalculator.app` y se adopta la variante **sin `www`**. Todas las rutas indexables deben emitir una canónica autorreferenciada sobre este origen.

Los hosts `*.pages.dev` se mantienen como endpoints operativos de Cloudflare Pages, pero no deben competir en el índice. La configuración versionada añade `X-Robots-Tag: noindex, nofollow` y una cabecera `Link` canónica para esos hosts.

La redirección completa entre dominios debe configurarse en Cloudflare mediante una regla de redirección de zona o Bulk Redirect, porque el archivo `_redirects` de Pages solo resuelve rutas del mismo sitio.

## Hallazgos del frontend

Antes de esta intervención existían metadatos correctos para la página principal y HTML específico únicamente para `/black-market` y `/plans`. La navegación interna de la SPA no actualizaba título, descripción, Open Graph, Twitter Cards, robots, canónica ni JSON-LD.

La nueva fuente única `src/app/seo/route-seo.json` controla:

- metadatos de las ocho rutas existentes;
- indexación o `noindex` por ruta;
- URL canónica;
- frecuencia y prioridad del sitemap;
- datos estructurados;
- aliases y redirecciones internas.

El generador `scripts/generate-seo-assets.mjs` produce automáticamente:

- HTML específico por ruta durante el build;
- `sitemap.xml` solo con URLs indexables;
- `robots.txt` con la URL canónica del sitemap;
- `_redirects` para aliases, `.html` y barras finales.

## Edge y rendimiento

Cloudflare Pages ya entrega los recursos desde su red y negocia compresión con los navegadores. Se añadieron cabeceras `Cache-Control: public, max-age=31536000, immutable` únicamente para JavaScript y CSS versionados dentro de `/assets/`.

No se aplica una regla de caché agresiva al HTML porque debe poder actualizar canónicas, metadatos y despliegues sin servir documentos obsoletos.

La política de referencia cambia de `no-referrer` a `strict-origin-when-cross-origin`, manteniendo privacidad entre orígenes y permitiendo atribución básica en analítica y Growth.

## Render y Core Web Vitals

Render aloja la API central, no el HTML del frontend. Por ello, las cabeceras del servicio Go no controlan LCP, CLS o INP de las páginas. La optimización relevante en Render consiste en:

- permitir el dominio canónico en CORS;
- mantener readiness y timeouts;
- evitar redirecciones de facturación hacia el host `pages.dev`;
- vigilar latencia de las consultas que alimentan la interfaz.

La corrección declarativa de esos orígenes se gestiona en el repositorio `albion-market-api` mediante un PR separado.

## Neon y arquitectura de contenido

La base `albion_market` contiene datos operativos de mercado, historial, cuentas, perfiles y suscripciones. No existen tablas de posts ni metadatos SEO.

El contenido inicial debe permanecer versionado en GitHub porque:

- cambia junto con las rutas y sus metadatos;
- puede revisarse mediante PR;
- no requiere un CMS ni escritura dinámica;
- evita incorporar una dependencia de base de datos al renderizado de contenido estático.

Los índices actuales cubren las claves de lectura principales. En la revisión no se detectó una necesidad justificada de crear índices o tablas SEO en producción. No se ejecutó ninguna migración.

## Pendientes exclusivos del panel Cloudflare

1. Redirigir permanentemente `www.albioncalculator.app/*` a `https://albioncalculator.app/${path}` conservando query string.
2. Redirigir permanentemente `albion-production-calculator.pages.dev/*` a `https://albioncalculator.app/${path}` conservando query string.
3. Confirmar que Always Use HTTPS está habilitado para la zona.

Hasta completar esas reglas, las cabeceras `noindex` y canónicas reducen el riesgo de duplicidad, pero no sustituyen una redirección HTTP 301 entre hosts.
