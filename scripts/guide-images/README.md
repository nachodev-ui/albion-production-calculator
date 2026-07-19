# Generación de imágenes para guías

Este directorio contiene el generador reproducible de las imágenes editoriales usadas por las tres guías SEO.

- Los íconos se cargan desde `render.albiononline.com`, el servicio público de renders de Albion Online.
- Las cifras se identifican como ejemplos educativos y no representan precios actuales.
- Cada escena se exporta en PNG con proporciones 16:9, 4:3 y 1:1.
- Los archivos generados se guardan en `public/images/guides/`.
- El validador comprueba la firma PNG, las dimensiones exactas y el mínimo de píxeles.
- La integración añade `<picture>`, Article JSON-LD, Open Graph, Twitter Cards y sitemap de imágenes.

El workflow `Generate guide images` ejecuta Playwright en Chromium, verifica nueve archivos y los versiona en la rama de trabajo.

Generación e integración editorial completadas: 2026-07-19.
