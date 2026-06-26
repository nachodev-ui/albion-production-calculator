# Prueba end-to-end de los tres proyectos

La prueba formal se orquesta desde `albion-market-data-platform` porque ese
repositorio conecta la captura local, la API central y el frontend.

Ubica los tres repositorios como carpetas hermanas y ejecuta:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd ..\albion-market-data-platform
.\scripts\e2e-three-projects.ps1 `
  -DatabaseUrl "postgres://postgres:TU_CLAVE@localhost:5432/albion_market_e2e?sslmode=disable"
```

El script inicia instancias aisladas en los puertos `18080` y `18787`, usa una
carpeta temporal dentro de `.e2e`, aplica migraciones y genera evidencia en
`.e2e/artifacts`.

El test vivo del frontend también puede ejecutarse por etapa:

```powershell
$env:VITE_RUN_LIVE_E2E = "1"
$env:VITE_E2E_STAGE = "online" # online | local | cache
$env:VITE_CENTRAL_MARKET_API_URL = "http://127.0.0.1:18080/api/v1"
$env:VITE_LOCAL_MARKET_API_URL = "http://127.0.0.1:18787/api/v1"
pnpm test:e2e:live
```

La etapa `online` exige API central y receiver activos. `local` exige la API
central apagada y el receiver activo. `cache` exige ambas fuentes apagadas y
verifica que catálogo, precios e historial se restauren como
`browser-cache`. En precios también confirma que los valores y sus fuentes se
conserven cuando fallan la API central y el receiver.
