# Persistencia de precios manuales

Los precios manuales ahora se guardan automáticamente en `localStorage`.

## Comportamiento

- Cada precio se confirma al salir del campo o presionar Enter.
- Los valores se separan por ítem raíz, encantamiento y ruta dentro de la receta.
- Al volver a la misma receta, incluso después de cerrar el navegador, los precios se restauran.
- El valor `0` se conserva como precio válido confirmado.
- Los datos permanecen únicamente en el navegador del usuario y no se envían a un servidor.

## Controles

Sobre el árbol de materiales aparece una barra de guardado local con opciones para:

- borrar los precios de la receta actual;
- borrar todos los precios guardados en el navegador.

## Almacenamiento

Clave utilizada:

```text
albion-craft-calculator.manual-prices.v1
```

El formato está versionado y valida los datos antes de cargarlos. Entradas corruptas, negativas o incompatibles se ignoran de forma segura.
