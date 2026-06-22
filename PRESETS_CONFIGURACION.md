# Presets de producción y venta

Los presets guardan configuraciones frecuentes en el navegador mediante `localStorage`.

## Datos incluidos

- Ciudad.
- Bono de especialidad.
- Uso de foco.
- Bono diario y su magnitud.
- Estado Premium para las comisiones de venta.

No se guardan el objeto seleccionado, el encantamiento, la cantidad, los precios de materiales ni el precio de venta.

## Specialty kind

El preset no guarda `specialtyKind`. Al aplicarlo, la calculadora conserva automáticamente el tipo correcto del objeto actual: `crafting` o `refining`.

## Acciones disponibles

- Aplicar un preset.
- Guardar la configuración actual como uno nuevo.
- Actualizar un preset modificado.
- Renombrar.
- Eliminar con confirmación.
- Marcar o quitar un preset predeterminado.

El preset predeterminado se carga al iniciar la aplicación. La configuración se mantiene al cambiar de receta.

## Clave de almacenamiento

```text
albion-craft-calculator:craft-presets:v1
```
