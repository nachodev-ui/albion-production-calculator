export const RETURN_RATE_SAVINGS_INFO = {
  section:
    'El RRR indica qué parte de los recursos válidos puede volver a tu inventario después de producir. Al craftear equipamiento solo se devuelven recursos refinados; los artefactos y componentes especiales se consumen por completo.',

  costWithoutReturnRate:
    'Es el valor total de los materiales que consumirías si no recuperaras ninguno. Se usa como referencia para medir cuánto te ayuda el RRR.',

  silverSaved:
    'Es el valor estimado de los recursos retornables recuperados, usando los precios que ingresaste. No incluye artefactos ni componentes especiales, y no recibes plata directamente.',

  averageSavedPerUnit:
    'Es el ahorro total dividido por la cantidad de objetos fabricados. Sirve para conocer cuánto reduce el RRR el costo de cada unidad.',

  finalCost:
    'Es el costo efectivo estimado después de descontar el valor de los materiales recuperados. En tandas pequeñas, el resultado real puede variar ligeramente por el redondeo del juego.',
} as const

export const PROFIT_SUMMARY_INFO = {
  section:
    'Compara la venta con la inversión inicial y separa la plata disponible del valor que conservas en materiales recuperados.',

  unitSellPrice:
    'Es el precio de venta de cada objeto. Ingresa el valor al que realmente esperas venderlo en el mercado.',

  premium:
    'Una cuenta Premium paga 4% de impuesto por la venta. Sin Premium, el impuesto es de 8%.',

  totalFees:
    'Es la suma del impuesto de venta y el Setup Fee. Con Premium corresponde a 6,5% y sin Premium a 10,5%.',

  breakEvenPrice:
    'Es el precio mínimo por unidad necesario para recuperar toda la plata desembolsada después de las comisiones, sin contar los materiales retornados como dinero disponible.',

  priceComparison:
    'Muestra cuánto está tu precio de venta por encima o por debajo del precio mínimo necesario para no perder plata.',

  targetPrices:
    'Cada opción muestra el precio necesario para obtener esa rentabilidad en plata sobre la inversión inicial, después de Tax y Setup Fee. Puedes presionarla para usarlo como valor de venta.',

  grossRevenue:
    'Es el valor total de la venta antes de descontar impuestos y comisiones.',

  marketTax:
    'Es el impuesto que se descuenta cuando se vende el objeto. Corresponde a 4% con Premium y 8% sin Premium.',

  setupFee:
    'Es una comisión de 2,5% aplicada al publicar la orden de venta. No cambia por tener o no tener Premium.',

  netRevenue:
    'Es la plata que queda de la venta después de descontar el impuesto y el Setup Fee.',

  netCost:
    'Es el costo económico de producción después de descontar el valor estimado de los materiales recuperados mediante el RRR.',

  initialInvestment:
    'Es la plata que necesitas desembolsar antes de recibir retornos. Incluye materiales, componentes, artefactos y tarifas calculadas.',

  cashResult:
    'Es la venta neta menos la inversión inicial. Representa la plata que ganas o pierdes en esta operación sin vender ni valorar los materiales retornados.',

  recoveredValue:
    'Es el valor de reposición estimado de los materiales devueltos. Permanece como inventario reutilizable y no equivale a plata líquida.',

  economicResult:
    'Es el resultado en plata más el valor recuperado. Mide el cambio económico total sin contar dos veces los retornos.',

  cashProfitability:
    'Es el resultado en plata dividido por la inversión inicial. Indica qué porcentaje del desembolso volvió como plata adicional o pérdida.',

  economicProfitability:
    'Es el resultado económico total dividido por la inversión inicial. Incluye el valor de los materiales que conservas para futuros crafteos.',

  result:
    'Es la venta neta menos el costo económico neto. Equivale al resultado en plata más el valor recuperado.',

  profitability:
    'Indica el resultado económico calculado en relación con el costo usado como referencia.',
} as const
