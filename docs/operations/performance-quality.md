# Rendimiento y calidad

Esta página documenta la línea base inicial del Paso 4. El objetivo es medir antes de optimizar: cualquier lazy loading, cambio de render crítico o separación de módulos debe compararse contra este presupuesto.

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

## Presupuesto inicial

La configuración vive en `quality/bundle-budget.json`.

| Métrica | Presupuesto inicial |
| --- | ---: |
| Total raw | 1.500.000 bytes |
| Total gzip | 450.000 bytes |
| JavaScript raw | 900.000 bytes |
| JavaScript gzip | 300.000 bytes |
| CSS raw | 250.000 bytes |
| CSS gzip | 70.000 bytes |
| Archivo más grande raw | 600.000 bytes |
| Archivo más grande gzip | 200.000 bytes |

Estos límites son una barrera inicial de regresión, no el objetivo final de rendimiento. Deben ajustarse hacia abajo después de completar lazy loading y cualquier extracción del optimizador fuera del render crítico.

## Qué mide

El script recorre `dist`, ignora sourcemaps y calcula:

- tamaño total raw y gzip;
- tamaño JavaScript raw y gzip;
- tamaño CSS raw y gzip;
- archivo más grande;
- lista de assets más pesados.

Si una métrica supera el presupuesto configurado, el comando falla con código distinto de cero.

## CI

El workflow principal ejecuta:

```text
pnpm build
pnpm bundle:check
```

Esto impide fusionar PRs que aumenten el bundle por encima del presupuesto inicial sin ajustar explícitamente `quality/bundle-budget.json` y documentar la razón.

## Cómo interpretar una falla

1. Revisa el asset más grande impreso por `pnpm bundle:check`.
2. Ejecuta `pnpm bundle:analyze` para guardar el reporte JSON.
3. Decide si corresponde optimizar, aplicar lazy loading o ajustar el presupuesto.
4. Si se ajusta el presupuesto, explica el motivo en el PR.

## Próximos pasos del Paso 4

Después de esta línea base, el orden recomendado es:

1. lazy loading de componentes no críticos;
2. revisión del optimizador fuera del render crítico si la medición lo justifica;
3. pruebas de accesibilidad;
4. pruebas de integración de UI;
5. documentación adicional en CI.
