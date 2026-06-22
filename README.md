# Albion Production Calculator

Calculadora local de producción para Albion Online. Permite analizar crafteo, retorno de recursos, costos, impuestos, punto de equilibrio y rentabilidad usando precios ingresados manualmente por el usuario.

La interfaz está preparada para incorporar un módulo de refinamiento y cuenta con navegación por ramas de crafteo, presets persistentes y exportación de resultados.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

## Compartir cálculos

El resumen puede copiarse, descargarse como `.txt` o abrirse en una vista A4 para imprimirlo o guardarlo como PDF desde el navegador.

## Navegación por ramas

Armas, Armaduras, Offhands y Accesorios se agrupan por líneas de crafteo y familias T4–T8. Los detalles del agrupamiento y sus validaciones están en `NAVEGACION_RAMAS_CATALOGO.md`.

## Equipo real

Las piezas reales incluyen sus tres variantes de receta. Consulta
`RECETAS_EQUIPO_REAL.md` para las reglas de piezas base, Sellos Reales y
encantamientos.
