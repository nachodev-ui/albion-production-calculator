import rawItems from '@data/datasets/items.json'
import type { BaseItemId, Item, ItemCategory } from '@core/domain/entities/Item'
import { asBaseItemId, isVanityPlaceholder } from '@core/domain/entities/Item'
import type { EnchantmentLevel } from '@core/domain/entities/Enchantment'
import type {
  CraftingStation,
  Recipe,
  RecipeIngredient,
  RecipeOption,
  RecipeTier,
  UpgradeRequirement,
} from '@core/domain/entities/Recipe'
import type { ItemRepository } from '@core/domain/repositories/ItemRepository'

/**
 * Formas crudas tal como vienen en items.json (sin los brands/uniones
 * estrictas de las entidades de dominio). El mapeo de Raw* -> entidad
 * vive solo acá: es la única capa que conoce el formato del dataset.
 */
interface RawRecipeIngredient {
  readonly itemId: string
  readonly enchantment: number
  readonly quantity: number
}

interface RawUpgradeRequirement {
  readonly itemId: string
  readonly quantity: number
}

interface RawRecipeOption {
  readonly ingredients: readonly RawRecipeIngredient[]
  readonly outputQuantity: number
  readonly silverFee: number
  readonly craftingFocus: number
}

interface RawRecipeTier extends RawRecipeOption {
  readonly enchantment: number
  readonly station: string
  readonly alternatives?: readonly RawRecipeOption[]
  readonly upgradeFrom: RawUpgradeRequirement | null
}

interface RawRecipe {
  readonly tiers: readonly RawRecipeTier[]
}

interface RawItem {
  readonly id: string
  readonly name: string
  readonly tier: number
  readonly category: string
  readonly maxEnchantment: number
  readonly itemValue?: number | null
  readonly recipe: RawRecipe | null
}

function mapIngredient(raw: RawRecipeIngredient): RecipeIngredient {
  return {
    itemId: asBaseItemId(raw.itemId),
    enchantment: raw.enchantment as EnchantmentLevel,
    quantity: raw.quantity,
  }
}

function mapUpgradeFrom(raw: RawUpgradeRequirement | null): UpgradeRequirement | null {
  if (!raw) return null
  return { itemId: asBaseItemId(raw.itemId), quantity: raw.quantity }
}

function mapOption(raw: RawRecipeOption): RecipeOption {
  return {
    ingredients: raw.ingredients.map(mapIngredient),
    outputQuantity: raw.outputQuantity,
    silverFee: raw.silverFee,
    craftingFocus: raw.craftingFocus,
  }
}

function mapTier(raw: RawRecipeTier): RecipeTier {
  return {
    enchantment: raw.enchantment as EnchantmentLevel,
    station: raw.station as CraftingStation,
    ...mapOption(raw),
    alternatives: raw.alternatives?.map(mapOption),
    upgradeFrom: mapUpgradeFrom(raw.upgradeFrom),
  }
}

function mapRecipe(raw: RawRecipe | null): Recipe | null {
  if (!raw) return null
  return { tiers: raw.tiers.map(mapTier) }
}

function mapItem(raw: RawItem): Item {
  return {
    id: asBaseItemId(raw.id),
    name: raw.name,
    tier: raw.tier,
    category: raw.category as ItemCategory,
    maxEnchantment: raw.maxEnchantment as EnchantmentLevel,
    itemValue:
      typeof raw.itemValue === 'number' && Number.isFinite(raw.itemValue)
        ? raw.itemValue
        : null,
    recipe: mapRecipe(raw.recipe),
  }
}

/**
 * Implementación de `ItemRepository` respaldada por el dataset
 * estático `items.json`.
 *
 * Decisión de diseño: `getById` devuelve cualquier ítem del dataset
 * tal cual, incluyendo vanity placeholders (ver `isVanityPlaceholder`)
 * — es una lectura directa por id, no una vidriera curada. La
 * exclusión de vanity ocurre en `getAll`/`searchByName`, que son los
 * puntos donde el usuario "descubre" ítems (selector, buscador): ahí
 * sí no tiene sentido ofrecer un cosmético sin receta real como si
 * fuera craftable.
 */
export class JsonItemRepository implements ItemRepository {
  private readonly itemsById: ReadonlyMap<BaseItemId, Item>

  constructor() {
    const items = (rawItems as readonly RawItem[]).map(mapItem)
    this.itemsById = new Map(items.map((item) => [item.id, item]))
  }

  getById(id: BaseItemId): Item | null {
    return this.itemsById.get(id) ?? null
  }

  getAll(category?: ItemCategory): readonly Item[] {
    const catalog = Array.from(this.itemsById.values()).filter(
      (item) => !isVanityPlaceholder(item),
    )
    return category ? catalog.filter((item) => item.category === category) : catalog
  }

  searchByName(query: string): readonly Item[] {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    return this.getAll().filter((item) => item.name.toLowerCase().includes(normalized))
  }
}
