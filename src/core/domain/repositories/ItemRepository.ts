import type { BaseItemId, Item, ItemCategory } from '../entities/Item'

/**
 * Puerto (en términos de arquitectura hexagonal) para acceder a los
 * datos de ítems y recetas.
 *
 * Los `usecases` dependen ÚNICAMENTE de esta interfaz, nunca de una
 * implementación concreta (Dependency Inversion Principle). Esto permite
 * cambiar la fuente de datos (dataset estático hoy, posible API mañana)
 * sin tocar una sola línea de lógica de negocio.
 */
export interface ItemRepository {
  /**
   * Devuelve un ítem por su id base, o `null` si no existe.
   */
  getById(id: BaseItemId): Item | null

  /**
   * Devuelve todos los ítems, opcionalmente filtrados por categoría.
   */
  getAll(category?: ItemCategory): readonly Item[]

  /**
   * Busca ítems por coincidencia de texto en el nombre (case-insensitive).
   */
  searchByName(query: string): readonly Item[]
}