# Reporte de bundle en CI

El workflow principal ejecuta `pnpm bundle:check -- --write-report` después de `pnpm build`.

Ese paso valida el presupuesto de bundle y genera:

```text
artifacts/performance/bundle-report.json
```

Luego CI sube ese archivo como artifact llamado `bundle-report`.

Uso esperado:

1. abrir el workflow run de un PR;
2. descargar el artifact `bundle-report`;
3. revisar `totals`, `javascript`, `css`, `media`, `largestFile` y `assets`;
4. decidir si corresponde separar chunks o endurecer `quality/bundle-budget.json`.

El reporte no se versiona en Git porque `artifacts/` está ignorado.
