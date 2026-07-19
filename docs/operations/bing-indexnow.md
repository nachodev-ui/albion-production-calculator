# Bing Webmaster Tools e IndexNow

## Propiedad de Bing

La propiedad canónica es:

```text
https://albioncalculator.app
```

La forma preferida de registrarla es importar la propiedad ya verificada desde Google Search Console:

1. iniciar sesión en Bing Webmaster Tools;
2. elegir **Importar desde Google Search Console**;
3. autorizar temporalmente el acceso a la cuenta de Google;
4. seleccionar `https://albioncalculator.app`;
5. confirmar la importación.

Bing importa la verificación y los sitemaps disponibles en Search Console. Si el sitemap no aparece automáticamente, debe enviarse manualmente:

```text
https://albioncalculator.app/sitemap.xml
```

Los informes iniciales pueden tardar aproximadamente 48 horas en poblarse.

## IndexNow

La aplicación utiliza el endpoint compartido del protocolo:

```text
https://api.indexnow.org/indexnow
```

La propiedad se demuestra mediante el archivo público:

```text
https://albioncalculator.app/fb4f391d3542fdf7d5da5ab51cc35dc9.txt
```

La clave no es un secreto de infraestructura: el protocolo requiere que el archivo sea públicamente rastreable y que su contenido coincida con la clave enviada.

## Automatización

El workflow `Notify IndexNow` se ejecuta después de un deployment de producción exitoso.

El proceso:

1. obtiene la revisión exacta desplegada;
2. valida la clave, el nombre del archivo y el host canónico;
3. reconstruye la lista de rutas con `index: true` desde `route-seo.json`;
4. incorpora URLs que hayan desaparecido respecto del commit anterior para notificar eliminaciones;
5. comprueba que el archivo de propiedad publicado contiene la clave esperada;
6. envía un lote JSON a `api.indexnow.org`;
7. acepta respuestas HTTP `200` o `202`;
8. conserva `summary.json` durante 30 días;
9. publica el estado `indexnow/production` en el commit desplegado.

Como el sitio comparte navegación, metadatos y shell de aplicación entre páginas, cada deployment notifica todas las URLs canónicas indexables actuales. El lote es pequeño y permanece muy por debajo del máximo de 10.000 URLs por solicitud.

## Validación local

```bash
pnpm indexnow:check
INDEXNOW_DRY_RUN=true pnpm indexnow:submit
```

El modo `dry-run` genera el mismo lote y el artifact local sin contactar buscadores.

## Comprobación en Bing

Después del primer envío de producción:

1. abrir la propiedad en Bing Webmaster Tools;
2. entrar en **IndexNow**;
3. confirmar que las URLs fueron recibidas;
4. revisar **Sitemaps** y comprobar que `sitemap.xml` figura como procesado;
5. usar **Inspección de URL** sobre la página principal y las tres guías;
6. revisar **Site Scan** y **Site Explorer** cuando Bing termine de recopilar datos.

IndexNow notifica el cambio, pero no garantiza que una URL sea rastreada o indexada.
