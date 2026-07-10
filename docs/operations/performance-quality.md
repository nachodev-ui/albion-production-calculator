# Rendimiento y calidad

Esta página documenta la línea base del Paso 4. El objetivo es medir antes de optimizar: cualquier lazy loading, cambio de render crítico o separación de módulos debe compararse contra este presupuesto.

## Scripts

```bash
pnpm build
pnpm bundle:check
```

`pnpm bundle:check` analiza el directorio `dist` generado por Vite. No reconstruye la aplicación; por eso debe ejecutarse después de `pnpm build`.

Para análisis local con reporte JSON:

```bash
pnpm bundle:analyze
```

Ese comando reconstruye la aplicación y escribe el reporte en:

```text
artifacts/performance/bundle-report.json
```

`artifacts/` está ignorado por Git porque contiene reportes generados localmente o por CI.

## Presupuesto medido

La configuración vive en `quality/bundle-budget.json`.

| Métrica | Presupuesto |
| --- | ---: |
| Total aplicación raw | 3.800.000 bytes |
| Total aplicación gzip | 320.000 bytes |
| JavaScript raw | 3.600.000 bytes |
| JavaScript gzip | 300.000 bytes |
| CSS raw | 90.000 bytes |
| CSS gzip | 20.000 bytes |
| Archivo de aplicación más grande raw | 3.000.000 bytes |
| Archivo de aplicación más grande gzip | 100.000 bytes |
| Entry JavaScript raw | 300.000 bytes |
| Entry JavaScript gzip | 90.000 bytes |

Estos límites se basan en el reporte generado después del primer lazy loading y dejan margen para cambios menores sin volver al presupuesto amplio inicial.

## Línea base observada

Después de separar el dataset y el panel de receta del bundle inicial, el reporte de CI mostró:

| Métrica observada | Valor |
| --- | ---: |
| Total aplicación raw | 3.111.919 bytes |
| Total aplicación gzip | 247.393 bytes |
| JavaScript raw | 3.039.009 bytes |
| JavaScript gzip | 223.545 bytes |
| CSS raw | 59.215 bytes |
| CSS gzip | 11.134 bytes |
| Entry JavaScript raw | 234.426 bytes |
| Entry JavaScript gzip | 71.037 bytes |
| Archivo más grande | `JsonItemRepository-*.js` |
| Archivo más grande raw | 2.497.549 bytes |
| Archivo más grande gzip | 73.989 bytes |

La conclusión de esa medición fue que no hacía falta separar inmediatamente historial u optimizador: el problema principal era que `items.json` entraba en el chunk inicial mediante `JsonItemRepository`. Ese dataset ahora se carga como chunk separado.

## Qué mide

El script recorre `dist`, ignora sourcemaps y calcula:

- tamaño total de aplicación raw y gzip, excluyendo media estática;
- tamaño JavaScript raw y gzip;
- tamaño CSS raw y gzip;
- archivo de aplicación más grande;
- entry JavaScript `assets/index-*.js`;
- media estática como dato informativo, sin presupuesto bloqueante;
- lista de assets más pesados.

La separación entre bundle de aplicación y media estática evita que imágenes, íconos u otros archivos copiados desde `public/` distorsionen la línea base del código que vamos a optimizar con lazy loading.

Si una métrica presupuestada supera el límite configurado, el comando falla con código distinto de cero.

## Lazy loading aplicado

El primer corte de lazy loading mantiene el shell, encabezado, estado vacío y controles básicos en el render inicial. Se difieren los bloques que no son necesarios antes de interactuar:

- dataset y repositorio de ítems (`JsonItemRepository` + `items.json`);
- catálogo lateral de crafteo;
- panel completo de receta, incluyendo historial, gráficos, optimizador, comparación de recetas y acciones de resumen;
- módulo de presets;
- módulo de refinamiento en estado próximamente.

Cada bloque lazy usa `Suspense` o carga dinámica con fallback visual para evitar pantallas en blanco mientras Vite descarga el chunk correspondiente.

## Pruebas de accesibilidad

Las pruebas de accesibilidad actuales se ejecutan con Vitest en entorno Node usando `react-dom/server`. No reemplazan una auditoría con navegador real, pero sí protegen regresiones básicas sin añadir dependencias nuevas:

- navegación principal con `aria-label`, `aria-current` y botones nativos;
- acciones del header con nombres accesibles;
- drawer móvil del catálogo con `role="dialog"`, `aria-modal` y botones de cierre etiquetados;
- landmark principal con nombre accesible;
- estados de carga lazy visibles;
- selector de encantamiento como grupo etiquetado, con botones nativos, `aria-pressed` y niveles no soportados deshabilitados sin ocultarlos.

## Pruebas de integración de UI

Las pruebas de integración de UI también usan SSR para mantenerse rápidas y sin dependencias adicionales. Cubren:

- arranque de la app en el módulo de crafteo;
- estado lazy visible del catálogo/dataset;
- navegación entre módulos mediante estados `activeModule`;
- acción de abrir catálogo solo en el header de crafteo;
- drawer móvil del catálogo abierto como diálogo etiquetado;
- listado de resultados con botones seleccionables, `aria-pressed` y estado vacío explícito.

Estas pruebas no simulan eventos reales de navegador. Si más adelante incorporamos `jsdom`, Testing Library o Playwright, se pueden ampliar para disparar clicks/teclado reales sobre el DOM.

## CI

El workflow principal ejecuta:

```text
pnpm test
pnpm build
pnpm exec tsx scripts/check-bundle-budget.ts --write-report
pnpm docs:build
```

Luego sube `artifacts/performance/bundle-report.json` como artifact `bundle-report`.

Esto impide fusionar PRs que rompan tests, build de aplicación, presupuesto de bundle o build de documentación. Los PRs que aumenten el bundle de aplicación por encima del presupuesto deben ajustar explícitamente `quality/bundle-budget.json` y documentar la razón.

## Cómo interpretar una falla

1. Revisa el artifact `bundle-report` del workflow run.
2. Mira `entryJavaScript`, `largestFile`, `totals`, `javascript`, `css` y `assets`.
3. Decide si corresponde optimizar, aplicar lazy loading adicional o ajustar el presupuesto.
4. Si falla `pnpm docs:build`, revisa enlaces, frontmatter, configuración de VitePress o ejemplos de código inválidos.

## Cierre del Paso 4

El Paso 4 se considera cerrado cuando CI valida:

- bundle analysis y presupuesto;
- lazy loading no crítico;
- pruebas de accesibilidad;
- pruebas de integración de UI;
- build de documentación.
