# Navegación principal de categorías

La vista global **Todos** fue eliminada. Mezclaba objetos con jerarquías distintas y volvía a crear una lista extensa difícil de explorar.

## Nuevo selector

El encabezado del panel muestra una sola categoría activa. Al presionarla, se abre una cuadrícula compacta con:

- Nombre e ícono de la categoría.
- Cantidad de ítems disponibles.
- Indicador visual de la categoría activa.

Esto reemplaza los chips horizontales y elimina su scroll lateral.

## Dirección del proyecto

Cada categoría declara un modo de navegación:

```ts
browserMode: 'branches' | 'list'
```

Actualmente **Armaduras** usa ramas del Destiny Board. Las demás categorías conservan temporalmente el listado propio de su categoría hasta incorporar sus respectivos agrupamientos.

La categoría inicial es **Armaduras**, para que la primera vista del catálogo ya utilice la navegación organizada.

## Corrección del acordeón

Al seleccionar un tier se abre su rama automáticamente, pero el usuario conserva el control después de la selección:

- Puede cerrar la rama seleccionada.
- Puede abrir cualquier otra rama.
- Solo una rama permanece abierta a la vez.

El error anterior ocurría porque el efecto que sincronizaba la selección también observaba el estado del acordeón; cada intento de cambiarlo volvía a abrir la rama del objeto seleccionado.
