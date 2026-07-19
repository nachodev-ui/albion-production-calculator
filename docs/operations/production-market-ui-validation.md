# Validación del mercado en producción

Esta verificación demuestra el recorrido público completo:

```text
albioncalculator.app en Cloudflare Pages → Render → Neon PostgreSQL
```

El workflow `Production market UI` utiliza un navegador Chromium real y valida:

1. que Render devuelve un precio actual de Thetford para un ítem conocido;
2. que el dominio canónico `https://albioncalculator.app` carga el catálogo de crafteo;
3. que el usuario puede cambiar a la categoría correcta, seleccionar el ítem y configurar Thetford, venta mediante orden y calidad normal;
4. que el navegador consulta `POST /api/v1/prices/query` en Render;
5. que el valor retornado por esa solicitud aparece en `Precio de venta unitario`;
6. que la interfaz muestra `API central conectada` o `API central: en uso`;
7. que no es necesario el receiver local para la lectura pública;
8. que, después del deployment, la consola no registra violaciones de Content Security Policy.

La verificación utiliza el dominio canónico y no `albion-production-calculator.pages.dev`, porque ese hostname se redirige mediante `301` al dominio público principal.

## Caso de prueba

- Servidor: `west` / `Americas`
- Mercado: `thetford`
- Ítem: `T4_MAIN_CURSEDSTAFF_CRYSTAL`
- Calidad: `1` / `Normal`
- Estrategia de venta: `sell-order`

El nombre visible y la categoría se obtienen desde `src/data/datasets/items.json`, evitando depender de metadatos duplicados en el script.

## Content Security Policy

La aplicación pública autoriza solamente los orígenes externos necesarios para su interfaz:

- `https://render.albiononline.com` para imágenes de objetos;
- `https://fonts.googleapis.com` para las hojas de estilo de Google Fonts;
- `https://fonts.gstatic.com` para los archivos de fuente;
- `https://static.cloudflareinsights.com` para el beacon que Cloudflare Web Analytics inyecta automáticamente.

El control de seguridad local exige que estos orígenes permanezcan declarados de manera explícita. La validación posterior al deployment falla ante cualquier violación CSP observada por Chromium.

## Ejecución

El workflow se ejecuta:

- cuando cambian el script, el workflow, la CSP o esta documentación en un PR hacia `develop` o `main`;
- manualmente mediante `workflow_dispatch`;
- después de que `Deploy production` finaliza correctamente.

En los PR se valida el recorrido de datos contra la versión pública vigente. La ausencia de violaciones CSP se exige después del deployment, cuando `public/_headers` ya está publicado.

La ejecución posterior al deployment publica el estado de commit `market-ui/production`. Un estado `success` significa que Chromium encontró el precio real de Thetford en la interfaz pública, confirmó la fuente central y no observó violaciones CSP.

## Evidencia

Cada ejecución conserva durante 14 días:

- `summary.json` con el precio obtenido por Render y el valor mostrado;
- `frontend.png` con la página completa;
- `browser-console.json` con mensajes de consola y errores del navegador.

El job falla si la API no devuelve el precio, si la interfaz no lo aplica, si la fuente central no queda visible, si la configuración de Thetford no se refleja en la pantalla o si producción viola la CSP después del deployment.
