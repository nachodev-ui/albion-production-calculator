# Trazabilidad de actualización de precios

La actualización global de precios ahora informa lo que ocurre antes, durante
y después de consultar el receptor local.

## Progreso visible

Mientras se consulta el backend, la barra de mercado muestra:

- porcentaje procesado;
- solicitudes completadas;
- combinaciones de ciudad, objeto y calidad procesadas.

## Resumen final

Al terminar se muestran los precios automáticos:

- actualizados;
- sin cambios;
- sin datos;
- valores manuales que conservaron prioridad.

El detalle desplegable identifica el objeto, la ciudad consultada y el
resultado de la combinación activa.

## Retroalimentación contextual

Cada material y el producto terminado muestran el resultado de la última actualización:

- precio anterior y nuevo;
- precio encontrado por primera vez;
- precio sin cambios;
- ausencia de datos;
- precio manual conservado junto con la referencia automática disponible.

El informe se descarta cuando cambia el servidor, la ciudad, la estrategia, la
calidad o la cantidad de overrides manuales, evitando mostrar una comparación
que ya no corresponde a la configuración actual.
