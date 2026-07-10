# Validación del mercado en producción

Esta verificación demuestra el recorrido público completo:

```text
Cloudflare Pages → Render → Neon PostgreSQL
```

El workflow `Production market UI` utiliza un navegador Chromium real y valida:

1. que Render devuelve un precio actual de Thetford para un ítem conocido;
2. que el sitio público carga el catálogo de crafteo;
3. que el usuario puede seleccionar el ítem y configurar Thetford, venta mediante orden y calidad normal;
4. que el navegador consulta `POST /api/v1/prices/query` en Render;
5. que el valor retornado por esa solicitud aparece en `Precio de venta unitario`;
6. que la interfaz muestra `API central conectada` o `API central: en uso`;
7. que no es necesario el receiver local para la lectura pública.

## Caso de prueba

- Servidor: `west` / `Americas`
- Mercado: `thetford`
- Ítem: `T4_MAIN_CURSEDSTAFF_CRYSTAL`
- Calidad: `1` / `Normal`
- Estrategia de venta: `sell-order`

El nombre visible se obtiene desde `src/data/datasets/items.json`, evitando depender de un texto duplicado en el script.

## Ejecución

El workflow se ejecuta:

- cuando cambian el script, el workflow o esta documentación en un PR hacia `develop` o `main`;
- manualmente mediante `workflow_dispatch`;
- después de que `Deploy production` finaliza correctamente.

## Evidencia

Cada ejecución conserva durante 14 días:

- `summary.json` con el precio obtenido por Render y el valor mostrado;
- `frontend.png` con la página completa;
- `browser-console.json` con mensajes de consola y errores del navegador.

El job falla si la API no devuelve el precio, si la interfaz no lo aplica, si la fuente central no queda visible o si la configuración de Thetford no se refleja en la pantalla.
