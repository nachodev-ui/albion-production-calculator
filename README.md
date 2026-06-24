# Albion Production Calculator

Calculadora React de producción para Albion Online. Analiza crafteo, retorno de
recursos, costos, tarifas, punto de equilibrio y rentabilidad usando precios
manuales o datos capturados por `albion-market-data-platform`.

Desde el Hito 4, el navegador **no consulta directamente la API pública de
AODP**. Los precios e historiales se obtienen del servicio local:

```text
http://127.0.0.1:8787/api/v1
```

## Requisitos

- Node.js 22 o posterior.
- pnpm.
- `albion-market-data-platform` ejecutándose en el puerto `8787`.

## Ejecutar

Primero inicia el receptor desde el proyecto de mercado:

```powershell
./scripts/receiver.ps1
```

Luego, en este proyecto:

```powershell
pnpm install
pnpm dev
```

También puedes comprobar la conexión y arrancar Vite con:

```powershell
./scripts/dev-local.ps1
```

## Configuración

La URL predeterminada es `http://127.0.0.1:8787/api/v1`. Para modificarla,
copia `.env.example` a `.env.local`:

```env
VITE_MARKET_API_URL=http://127.0.0.1:8787/api/v1
```

## Datos de mercado

La calculadora solicita al servicio local:

- precios actuales batch mediante `/prices`;
- ciudad de compra individual por material, con una ciudad predeterminada como fallback;
- comparación de cada material entre todos los mercados publicados, indicando
  el mejor precio, el precio más alto y las ciudades sin datos;
- optimización automática de la ciudad de compra por material y la ciudad de
  venta del producto terminado;
- historial normalizado mediante `/history`;
- ciudad, servidor y calidad seleccionados en la interfaz. La ciudad y la
  calidad del producto también pueden cambiarse directamente desde la tarjeta
  de historial.

Los valores manuales conservan prioridad. Si la base local no contiene una
combinación, la interfaz muestra “sin datos” y no recurre silenciosamente a
Internet. Los snapshots del navegador usan nuevas claves de caché para no
mezclarse con datos guardados por la integración pública anterior.

Consulta `SERVICIO_MERCADO_LOCAL.md` para el contrato y el flujo completo, y
`MEJORAS_ACTUALIZACION_PRECIOS.md` para los estados de actualización visibles y
`MEJORA_CIUDAD_RECOMENDADA.md` para la detección automática del bono local.

## Comandos

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm generate:dataset
```

## Funciones principales

- Navegación por ramas y familias T4–T8.
- Tres variantes de receta en equipo real.
- Configuración global de retorno de recursos.
- Ciudad de producción recomendada automáticamente según el objeto, sin bloquear otras ciudades.
- Tarifas de estación, nutrición, foco y especialización.
- Precios manuales persistentes.
- Progreso, resumen y trazabilidad contextual al actualizar precios.
- Comparación de recetas y cálculo de rentabilidad.
- Estimación de fama de crafteo por cantidad, con detalle de fama base, Premium, total y progreso válido para diarios.
- Optimizador de mercados con ahorro frente a la configuración actual, mejor
  ciudad de venta y combinación completa de mayor resultado económico.
- Separación entre inversión inicial, resultado en plata, valor recuperado y resultado económico total.
- Historial de 7 y 28 días desde el servicio local.
- Exportación de resumen e impresión en PDF desde el navegador.

La documentación funcional adicional se conserva en los archivos Markdown de
la raíz del proyecto. Consulta `OPTIMIZADOR_RENTABILIDAD.md` para el alcance,
las fórmulas y los límites de la recomendación automática, y
`FAMA_CRAFTEO.md` para el cálculo y los límites de la fama estimada.

## Catálogo de mercados del servicio local

La aplicación obtiene los mercados mediante `GET /api/v1/markets`. Los
selectores no poseen una lista estática y las consultas usan `marketKey`, por
ejemplo `lymhurst` o `brecilien`. Consulta `CATALOGO_MERCADOS.md`.
