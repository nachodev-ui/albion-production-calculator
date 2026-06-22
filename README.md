# Albion Production Calculator

Calculadora de producción para Albion Online. Permite analizar crafteo, retorno de recursos, costos, impuestos, punto de equilibrio y rentabilidad usando precios automáticos de Albion Online Data Project con override manual.

La interfaz está preparada para incorporar un módulo de refinamiento y cuenta con navegación por ramas de crafteo, presets persistentes y exportación de resultados.

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Compartir cálculos

El resumen puede copiarse, descargarse como `.txt` o abrirse en una vista A4 para imprimirlo o guardarlo como PDF desde el navegador.

## Navegación por ramas

Armas, Armaduras, Offhands y Accesorios se agrupan por líneas de crafteo y familias T4–T8. Los detalles del agrupamiento y sus validaciones están en `NAVEGACION_RAMAS_CATALOGO.md`.

## Equipo real

Las piezas reales incluyen sus tres variantes de receta. Consulta
`RECETAS_EQUIPO_REAL.md` para las reglas de piezas base, Sellos Reales y
encantamientos.

## Tarifas de estación y especialización

La configuración incluye tarifas distintas para usuarios y asociados, cálculo
de nutrición desde Item Value, costo de foco según especialización y bono de
calidad informativo. Consulta `TARIFAS_ESTACION_Y_FOCO.md`.

## Precios de mercado

La calculadora consulta precios actuales de AODP según servidor, ciudad y
estrategia de compra o venta. Los valores manuales siempre tienen prioridad y
los snapshots automáticos se almacenan en una caché local. Cada precio muestra
su fecha exacta, antigüedad y nivel de confianza. Consulta `PRECIOS_AODP.md`.
