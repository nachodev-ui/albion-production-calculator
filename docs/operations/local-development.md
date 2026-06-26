# Desarrollo local

## Comandos de la aplicación

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm generate:dataset
```

## Sitio de documentación

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

El resultado estático de la documentación se genera en
`docs/.vitepress/dist`.

## Verificación manual del fallback histórico

1. Con API y receiver activos, actualiza el historial y comprueba `Origen: API central`.
2. Apaga la API central y actualiza; debe aparecer `Origen: Receiver local`.
3. Apaga también el receiver y recarga; debe aparecer `Origen: Caché del navegador`.
4. Revisa que el último bucket y la última consulta se muestren por separado.
