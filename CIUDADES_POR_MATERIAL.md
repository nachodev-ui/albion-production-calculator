# Ciudades individuales por material

## Modelo

Cada material guarda una clave de mercado proveniente de `GET /api/v1/markets`.
No guarda nombres ni códigos de ubicación duplicados en React.

Ejemplo:

```text
Producto terminado → brecilien
Lingotes           → martlock
Artefacto           → brecilien
Tablas              → lymhurst
```

## Reglas

- `Ciudad de venta` solo afecta al producto terminado y a su historial.
- `Ciudad predeterminada` funciona como fallback.
- Cada hoja comprable muestra `Comprar en`.
- Al actualizar precios, la calculadora consulta el material en todos los
  mercados habilitados. El selector muestra el valor disponible y distingue
  `Mejor precio`, `Más alto`, `Mismo precio` o `Único disponible`.
- Las etiquetas comparan únicamente datos automáticos existentes para la
  estrategia de compra seleccionada. Las ciudades sin captura aparecen como
  `Sin datos` y no participan del mínimo ni del máximo.
- La calidad de materiales permanece en Normal.
- Los precios manuales tienen prioridad.
- Expandir un material usa las ciudades de sus ingredientes.
- Las claves que ya no existen en el catálogo se eliminan al cargarlo.

## Persistencia y caché

Las asignaciones se conservan por producto raíz en:

```text
albion-production-calculator.material-purchase-cities.v1
```

La caché incluye servidor, `marketKey`, objeto y calidad, por lo que un precio
de una ciudad nunca sustituye a otro.
