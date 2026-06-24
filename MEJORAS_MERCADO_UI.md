# Distribución de la interfaz de mercado

La configuración de mercado dejó de mostrarse como una tarjeta central con
controles de compra, venta, calidad y caché mezclados. Cada opción aparece ahora
junto a la tarea que modifica.

## Conexión global

La sección **Mercado local** mantiene únicamente:

- servidor de Albion;
- estado de conexión con el receptor local;
- actualización global de precios e historial;
- diagnóstico avanzado desplegable.

El diagnóstico contiene el catálogo recibido, el estado del caché, la frescura
de los precios, los errores del servicio y la opción para limpiar datos locales.

## Compra de materiales

Dentro de **Materiales de la receta** se encuentran:

- ciudad base para materiales sin asignación individual;
- método de compra;
- cantidad de ciudades individuales;
- acción para aplicar la ciudad base a todos.

Cada material conserva su selector de ciudad y la comparación entre mercados
con las etiquetas `Mejor precio`, `Más alto`, `Mismo precio`,
`Único disponible` y `Sin datos`.

## Venta del producto

Dentro de **Resumen de ganancia** se encuentran:

- ciudad de venta;
- método de venta;
- calidad del producto terminado.

Al modificar esos controles, la referencia automática y el resultado económico
se recalculan. Si existe un precio manual, este continúa teniendo prioridad y la
interfaz lo informa explícitamente.

## Comparación histórica

El historial sigue inicialmente la ciudad y calidad configuradas para la venta.
El botón **Comparar otro mercado** permite consultar otra combinación sin
alterar la rentabilidad.

La comparación solo se convierte en configuración de venta al pulsar
**Aplicar como configuración de venta**. También es posible volver a seguir la
venta sin aplicar cambios.

## Validación local

```powershell
pnpm install
pnpm test
pnpm build
pnpm dev
```

## Identidad visual de ciudades y comparación

El selector de compra por material utiliza ahora un menú visual propio. Las
etiquetas de comparación se muestran como estados compactos con borde y fondo,
siguiendo el mismo lenguaje de `Reciente`, `Aceptable`, `Antiguo` y `Sin datos`:

- `Mejor precio`: verde apagado;
- `Más alto`: rojo apagado;
- `Mismo precio`: dorado de la interfaz;
- `Único disponible`: neutro;
- `Sin datos`: gris discreto.

Cada ciudad se identifica además con una versión desaturada del color de su
estandarte: azul para Martlock, naranja para Bridgewatch, verde para Lymhurst,
marfil para Fort Sterling, púrpura para Thetford, rojo para Caerleon y verde
azulado para Brecilien. Estos tonos solo funcionan como guía visual y no
reemplazan el nombre escrito de la ciudad.
