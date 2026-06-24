# Ciudad de producción recomendada

La configuración de producción detecta automáticamente la ciudad que posee el
bono local de especialidad para el objeto seleccionado.

## Comportamiento

Al seleccionar un objeto nuevo:

1. Se identifica su familia de crafteo o tipo de refinado.
2. Se selecciona automáticamente la ciudad con el bono correspondiente.
3. El selector marca esa opción como `Recomendada`.
4. El bono de especialidad se activa únicamente cuando la ciudad elegida
   coincide con la recomendación.

El usuario puede seleccionar cualquier otra ciudad. La combinación no se
bloquea; simplemente se informa que el bono de especialidad no aplica allí y
se conserva visible la ciudad recomendada.

## Ejemplos

- Bastones malditos: Bridgewatch.
- Hachas: Martlock.
- Túnicas de tela: Fort Sterling.
- Guantes de guerra: Caerleon.
- Manos secundarias: Martlock.
- Refinado de tablas: Fort Sterling.

Las islas personales o de gremio nunca reciben el bono de especialidad.

## Presets

Los presets continúan pudiendo guardar cualquier ciudad. Al aplicar uno, la
configuración se normaliza según el objeto actual:

- ciudad recomendada: bono activo;
- otra ciudad: bono inactivo;
- isla: bono inactivo.

Esto evita que una configuración guardada atribuya un bono a una ciudad que no
lo posee para la categoría seleccionada.
