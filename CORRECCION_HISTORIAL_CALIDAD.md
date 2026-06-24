# Corrección de historial y calidad del producto

## Problemas corregidos

1. El historial y el precio de venta estaban fijados a calidad Normal sin un
   selector visible.
2. La misma calidad se aplicaba también a los materiales, aunque los recursos
   de crafteo no tienen calidad de mercado.
3. El límite final del rango histórico no alcanzaba la medianoche UTC siguiente,
   por lo que podía omitir los buckets del último día completo.
4. El parser del historial aceptaba pocas variantes de nombres de campos.
5. La caché histórica anterior podía conservar una respuesta vacía después de
   aplicar la corrección.

## Comportamiento nuevo

- **Calidad del producto** permite elegir Normal, Bueno, Sobresaliente,
  Excelente u Obra maestra.
- La calidad afecta únicamente al producto terminado: precio de venta actual e
  historial.
- Los materiales se consultan siempre con calidad Normal.
- Ciudad y calidad actualizan el historial de forma independiente.
- La tarjeta de historial posee selectores propios de ciudad y calidad para no
  obligar a volver a la configuración de mercado. Ambos controles permanecen
  sincronizados con el precio actual del producto terminado.
- El método de venta cambia el precio actual usado por la calculadora, pero no
  el historial, ya que el cliente de Albion entrega historial agregado de ventas.
- El parser acepta respuestas `snake_case`, `camelCase` y `PascalCase`, además
  de números serializados como texto.
- La caché histórica cambia a versión 2 y descarta automáticamente snapshots
  vacíos generados por la implementación anterior.
