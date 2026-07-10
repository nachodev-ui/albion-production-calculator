# Desarrollo local

## Comandos de la aplicación

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm generate:dataset
```

## Modo de desarrollo normal

Copia la plantilla y usa la API central local o remota:

```powershell
Copy-Item .env.example .env.local
```

```dotenv
VITE_CENTRAL_MARKET_API_URL=http://127.0.0.1:8080/api/v1
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false
```

Este modo reproduce el comportamiento público: API central y caché del
navegador, sin peticiones al receiver.

## Modo colaborador o diagnóstico

Activa el fallback local únicamente cuando estés ejecutando
`albion-market-data-platform` en el mismo equipo:

```dotenv
VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=true
VITE_LOCAL_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

Reinicia `pnpm dev` después de cambiar variables `VITE_*`, porque Vite las
incorpora al iniciar o compilar la aplicación.

## Build de producción

Un build público exige una URL central HTTPS y rechaza configuraciones que
apunten a localhost:

```powershell
$env:VITE_CENTRAL_MARKET_API_URL = 'https://api.example.com/api/v1'
$env:VITE_ENABLE_LOCAL_RECEIVER_FALLBACK = 'false'
pnpm build
```

No agregues tokens ni credenciales a variables `VITE_*`.

## Sitio de documentación

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

El resultado estático de la documentación se genera en
`docs/.vitepress/dist`.

## Verificación manual del modelo público

1. Mantén `VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=false`.
2. Inicia la API central y confirma `API central conectada`.
3. Apaga la API central y actualiza; si existe caché debe mostrarse `Usando caché del navegador`.
4. Comprueba en DevTools que no exista ninguna petición a `127.0.0.1:8787`.
5. Revisa que el último bucket y la última consulta se muestren por separado.

## Verificación manual del modo colaborador

1. Activa `VITE_ENABLE_LOCAL_RECEIVER_FALLBACK=true`.
2. Inicia API central y receiver.
3. Confirma que la API central siga siendo la fuente primaria.
4. Apaga la API central y verifica que el receiver pueda aportar datos locales.
5. Apaga también el receiver y confirma la degradación a caché.
