export const RETURNED_MATERIALS_INFO = {
  section:
    'Muestra los recursos que pueden volver a tu inventario gracias al RRR. En crafteo solo se incluyen recursos refinados: los artefactos y otros componentes especiales nunca se devuelven.',

  grossQuantity:
    'Es la cantidad total de recursos retornables utilizada. Los artefactos y componentes especiales no forman parte de esta cantidad.',

  returnedQuantity:
    'Es la cantidad estimada que recuperas después de fabricar. Estos materiales vuelven a tu inventario y puedes reutilizarlos o venderlos.',

  netQuantity:
    'Es la cantidad que realmente terminas consumiendo después de descontar los materiales recuperados.',

  silverValue:
    'Es el valor estimado de los materiales recuperados, usando los precios manuales y costos calculados en tu árbol de producción.',
} as const
