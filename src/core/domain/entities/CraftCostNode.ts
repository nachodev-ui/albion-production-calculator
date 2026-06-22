import type { BaseItemId } from './Item'
import type { EnchantmentLevel } from './Enchantment'
import type { ReturnRateParams } from './ReturnRate'

/**
 * Precio ingresado manualmente por el usuario para un ítem específico
 * (en un encantamiento dado), expresado en plata por unidad.
 */
export interface ManualPrice {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly unitPrice: number
}

/** Configuración global de Resource Return Rate para la producción actual. */
export interface NodeReturnRateConfig extends ReturnRateParams {
  readonly cityId: string
}

/**
 * Desglose económico del RRR aplicado a un nodo craftable.
 * `grossQuantity` representa el costo de todos los ingredientes, mientras
 * que `returnedQuantity` solo descuenta el valor de los ingredientes que
 * pueden ser devueltos por el juego.
 */
export interface MaterialReturnBreakdown {
  readonly grossQuantity: number
  readonly returnRate: number
  readonly returnedQuantity: number
  readonly netQuantity: number
}

/**
 * Material recuperado por el RRR, agregado por ítem y encantamiento.
 *
 * Una misma materia prima puede aparecer en varias ramas o etapas del
 * proceso. En ese caso, sus cantidades y su valor recuperado se suman.
 */
export interface ReturnedMaterial {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  /** Cantidad total usada en las etapas donde se aplicó RRR. */
  readonly grossQuantity: number
  /** Cantidad estimada que vuelve al inventario. */
  readonly returnedQuantity: number
  /** Cantidad efectiva consumida después del retorno. */
  readonly netQuantity: number
  /** Valor estimado en plata de la cantidad recuperada. */
  readonly silverValue: number
}

/**
 * Ítem que todavía necesita un precio manual para completar el cálculo.
 * `paths` conserva todas las ramas del árbol donde aparece ese mismo ítem.
 */
export interface MissingPriceItem {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly paths: readonly string[]
}

/** Nodo del árbol de cálculo de costo de un crafteo. */
export interface CraftCostNode {
  readonly itemId: BaseItemId
  readonly enchantment: EnchantmentLevel
  readonly quantity: number
  /** Costo total para esta cantidad de este ítem, ya neto de RRR. */
  readonly totalCost: number
  readonly unitCost: number
  readonly isManualPrice: boolean
  /** Indica si este nodo y todas sus hojas tienen un precio confirmado. */
  readonly hasValidPrice: boolean
  readonly returnRate: MaterialReturnBreakdown | null
  /** Índice de la variante usada cuando el nodo fue expandido. */
  readonly recipeOptionIndex: number | null
  readonly children: readonly CraftCostNode[]
}

/** Resultado completo de calcular el costo de craftear un ítem objetivo. */
export interface CraftCalculation {
  readonly root: CraftCostNode
  readonly totalStationFees: number
  readonly totalMaterialCost: number
  readonly grandTotal: number
  readonly totalSilverSavedByReturnRate: number
  /** Materiales que se espera recuperar, agrupados por ítem y encantamiento. */
  readonly returnedMaterials: readonly ReturnedMaterial[]
  /** Materiales únicos que todavía no tienen precio manual confirmado. */
  readonly missingPriceItems: readonly MissingPriceItem[]
  readonly missingPriceCount: number
  /** Solo es verdadero cuando todas las hojas necesarias tienen precio. */
  readonly isComplete: boolean
}
