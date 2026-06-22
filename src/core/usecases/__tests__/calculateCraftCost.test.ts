import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '../../domain/entities/Item'
import type { BaseItemId, Item, ItemCategory } from '../../domain/entities/Item'
import type { ItemRepository } from '../../domain/repositories/ItemRepository'
import {
  calculateCraftCost,
  childPath,
  createEmptyTreeConfig,
  recipeChildPath,
  DEFAULT_RETURN_RATE_CONFIG,
} from '../calculateCraftCost'
import type { CraftTreeConfig } from '../calculateCraftCost'

/**
 * Repositorio en memoria con una jerarquía de 3 niveles conocida,
 * para verificar la recursión y las fórmulas a mano:
 *
 *   SWORD (1 craft -> 1 unidad)
 *     ├─ 2x INGOT   (1 craft -> 1 unidad, tiene receta propia)
 *     │    └─ 3x ORE  (hoja, sin receta)
 *     └─ 4x BAR     (tiene receta, pero la dejamos sin expandir en los tests)
 *
 *   ARTIFACT_SWORD (1 craft -> 1 unidad)
 *     ├─ 2x INGOT   (recurso refinado retornable)
 *     └─ 1x ARTIFACT (componente especial no retornable)
 *
 *   FOOD (1 craft -> 5 unidades) — para probar outputQuantity > 1.
 *     └─ 2x GRAIN   (hoja)
 */
function buildTestRepository(): ItemRepository {
  const items = new Map<BaseItemId, Item>()

  function add(item: Item): void {
    items.set(item.id, item)
  }

  const ORE = asBaseItemId('ORE')
  const INGOT = asBaseItemId('INGOT')
  const BAR = asBaseItemId('BAR')
  const SWORD = asBaseItemId('SWORD')
  const ARTIFACT = asBaseItemId('ARTIFACT')
  const ARTIFACT_SWORD = asBaseItemId('ARTIFACT_SWORD')
  const GRAIN = asBaseItemId('GRAIN')
  const FOOD = asBaseItemId('FOOD')

  add({ id: ORE, name: 'Ore', tier: 4, category: 'resource' as ItemCategory, maxEnchantment: 0, recipe: null })

  add({
    id: INGOT,
    name: 'Ingot',
    tier: 4,
    category: 'refined_resource' as ItemCategory,
    maxEnchantment: 0,
    recipe: {
      tiers: [
        {
          enchantment: 0,
          station: 'refining' as never,
          ingredients: [{ itemId: ORE, enchantment: 0, quantity: 3 }],
          outputQuantity: 1,
          silverFee: 10,
          craftingFocus: 0,
          upgradeFrom: null,
        },
      ],
    },
  })

  add({
    id: BAR,
    name: 'Bar',
    tier: 4,
    category: 'refined_resource' as ItemCategory,
    maxEnchantment: 0,
    recipe: {
      tiers: [
        {
          enchantment: 0,
          station: 'refining' as never,
          ingredients: [{ itemId: ORE, enchantment: 0, quantity: 1 }],
          outputQuantity: 1,
          silverFee: 0,
          craftingFocus: 0,
          upgradeFrom: null,
        },
      ],
    },
  })

  add({
    id: SWORD,
    name: 'Sword',
    tier: 4,
    category: 'weapon' as ItemCategory,
    maxEnchantment: 0,
    recipe: {
      tiers: [
        {
          enchantment: 0,
          station: 'warrior_forge' as never,
          ingredients: [
            { itemId: INGOT, enchantment: 0, quantity: 2 },
            { itemId: BAR, enchantment: 0, quantity: 4 },
          ],
          outputQuantity: 1,
          silverFee: 50,
          craftingFocus: 0,
          upgradeFrom: null,
        },
      ],
    },
  })

  add({
    id: ARTIFACT,
    name: 'Artifact',
    tier: 4,
    category: 'other' as ItemCategory,
    maxEnchantment: 0,
    recipe: null,
  })

  add({
    id: ARTIFACT_SWORD,
    name: 'Artifact Sword',
    tier: 4,
    category: 'weapon' as ItemCategory,
    maxEnchantment: 0,
    recipe: {
      tiers: [
        {
          enchantment: 0,
          station: 'warrior_forge' as never,
          ingredients: [
            { itemId: INGOT, enchantment: 0, quantity: 2 },
            { itemId: ARTIFACT, enchantment: 0, quantity: 1 },
          ],
          outputQuantity: 1,
          silverFee: 50,
          craftingFocus: 0,
          upgradeFrom: null,
        },
      ],
    },
  })

  add({ id: GRAIN, name: 'Grain', tier: 1, category: 'resource' as ItemCategory, maxEnchantment: 0, recipe: null })

  add({
    id: FOOD,
    name: 'Food',
    tier: 1,
    category: 'food' as ItemCategory,
    maxEnchantment: 0,
    recipe: {
      tiers: [
        {
          enchantment: 0,
          station: 'cooking' as never,
          ingredients: [{ itemId: GRAIN, enchantment: 0, quantity: 2 }],
          outputQuantity: 5,
          silverFee: 0,
          craftingFocus: 0,
          upgradeFrom: null,
        },
      ],
    },
  })

  return {
    getById: (id) => items.get(id) ?? null,
    getAll: () => Array.from(items.values()),
    searchByName: () => [],
  }
}

const repo = buildTestRepository()

describe('calculateCraftCost', () => {
  it('una hoja sin precio manual ingresado cuesta 0, no asume nada', () => {
    const config = createEmptyTreeConfig()
    const result = calculateCraftCost(asBaseItemId('SWORD'), 0, 1, repo, config)

    expect(result.grandTotal).toBe(0)
    expect(result.root.isManualPrice).toBe(true)
    expect(result.root.hasValidPrice).toBe(false)
    expect(result.isComplete).toBe(false)
    expect(result.missingPriceCount).toBe(1)
    expect(result.missingPriceItems[0]?.paths).toEqual(['root'])
    expect(result.root.children).toHaveLength(0)
  })

  it('una hoja con precio manual multiplica precio x cantidad', () => {
    const config: CraftTreeConfig = {
      ...createEmptyTreeConfig(),
      manualPrices: new Map([['root', 100]]),
    }
    const result = calculateCraftCost(asBaseItemId('SWORD'), 0, 3, repo, config)

    expect(result.root.unitCost).toBe(100)
    expect(result.root.hasValidPrice).toBe(true)
    expect(result.isComplete).toBe(true)
    expect(result.missingPriceCount).toBe(0)
    expect(result.grandTotal).toBe(300)
  })


  it('distingue un precio 0 confirmado de un precio faltante', () => {
    const config: CraftTreeConfig = {
      ...createEmptyTreeConfig(),
      manualPrices: new Map([['root', 0]]),
    }

    const result = calculateCraftCost(asBaseItemId('ORE'), 0, 1, repo, config)

    expect(result.grandTotal).toBe(0)
    expect(result.root.hasValidPrice).toBe(true)
    expect(result.isComplete).toBe(true)
    expect(result.missingPriceItems).toHaveLength(0)
  })

  it('agrupa un mismo material faltante que aparece en varias ramas', () => {
    const ingotPath = childPath('root', 0)
    const barPath = childPath('root', 1)

    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root', ingotPath, barPath]),
      manualPrices: new Map(),
      productionConfig: DEFAULT_RETURN_RATE_CONFIG,
    }

    const result = calculateCraftCost(asBaseItemId('SWORD'), 0, 1, repo, config)

    expect(result.isComplete).toBe(false)
    expect(result.missingPriceCount).toBe(1)
    expect(result.missingPriceItems[0]?.itemId).toBe(asBaseItemId('ORE'))
    expect(result.missingPriceItems[0]?.paths).toEqual([
      childPath(ingotPath, 0),
      childPath(barPath, 0),
    ])
  })

  it('un nodo expandido sin RRR (config neutra) suma hijos + tarifa de estación', () => {
    // SWORD expandido: 2x INGOT (hoja, precio manual 20) + 4x BAR (hoja, precio manual 5)
    // gross = 2*20 + 4*5 = 60; RRR neutro (isla, sin foco) = 0% -> net = 60
    // unitCost = (60 + silverFee 50) / outputQuantity 1 = 110
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root']),
      manualPrices: new Map([
        [childPath('root', 0), 20], // INGOT
        [childPath('root', 1), 5], // BAR
      ]),
      productionConfig: DEFAULT_RETURN_RATE_CONFIG,
    }

    const result = calculateCraftCost(asBaseItemId('SWORD'), 0, 1, repo, config)

    expect(result.root.isManualPrice).toBe(false)
    expect(result.totalMaterialCost).toBe(60)
    expect(result.totalStationFees).toBe(50)
    expect(result.grandTotal).toBe(110)
    expect(result.totalSilverSavedByReturnRate).toBe(0)
  })

  it('aplica RRR correctamente sobre el costo bruto de materiales de un nodo expandido', () => {
    // Ciudad real con bono de crafteo (+15%) y sin foco:
    // LPB = 0.18 (base) + 0.15 (specialty crafting) = 0.33
    // RRR = 1 - 1/(1+0.33) = 0.33/1.33 ≈ 0.248120...
    const rrrConfig = {
      cityId: 'martlock',
      hasSpecialtyBonus: true,
      specialtyKind: 'crafting' as const,
      useFocus: false,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1 as const,
      isIsland: false,
    }
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root']),
      manualPrices: new Map([
        [childPath('root', 0), 20], // INGOT
        [childPath('root', 1), 5], // BAR
      ]),
      productionConfig: rrrConfig,
    }

    const result = calculateCraftCost(asBaseItemId('SWORD'), 0, 1, repo, config)

    const expectedRRR = 1 - 1 / (1 + 0.33)
    const grossMaterial = 60
    const expectedSaved = grossMaterial * expectedRRR
    const expectedNet = grossMaterial - expectedSaved

    expect(result.root.returnRate?.returnRate).toBeCloseTo(expectedRRR, 10)
    expect(result.totalSilverSavedByReturnRate).toBeCloseTo(expectedSaved, 10)
    expect(result.totalMaterialCost).toBeCloseTo(expectedNet, 10)
    expect(result.grandTotal).toBeCloseTo(expectedNet + 50, 10)
  })

  it('no aplica RRR a artefactos ni los incluye entre los materiales recuperados', () => {
    const rrrConfig = {
      cityId: 'martlock',
      hasSpecialtyBonus: true,
      specialtyKind: 'crafting' as const,
      useFocus: false,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1 as const,
      isIsland: false,
    }
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root']),
      manualPrices: new Map([
        [childPath('root', 0), 20], // 2 INGOT = 40 plata retornable
        [childPath('root', 1), 1_000], // ARTIFACT no retornable
      ]),
      productionConfig: rrrConfig,
    }

    const result = calculateCraftCost(
      asBaseItemId('ARTIFACT_SWORD'),
      0,
      1,
      repo,
      config,
    )

    const expectedRRR = 1 - 1 / (1 + 0.33)
    const expectedSaved = 40 * expectedRRR
    const expectedGrossMaterialCost = 1_040

    expect(result.totalSilverSavedByReturnRate).toBeCloseTo(expectedSaved, 10)
    expect(result.totalMaterialCost).toBeCloseTo(
      expectedGrossMaterialCost - expectedSaved,
      10,
    )
    expect(result.grandTotal).toBeCloseTo(
      expectedGrossMaterialCost - expectedSaved + 50,
      10,
    )
    expect(result.returnedMaterials).toHaveLength(1)
    expect(result.returnedMaterials[0]?.itemId).toBe(asBaseItemId('INGOT'))
    expect(result.returnedMaterials[0]?.returnedQuantity).toBeCloseTo(
      2 * expectedRRR,
      10,
    )
  })

  it('mantiene el retorno de recursos crudos dentro de una etapa de refinamiento', () => {
    const rrrConfig = {
      cityId: 'martlock',
      hasSpecialtyBonus: true,
      specialtyKind: 'refining' as const,
      useFocus: false,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1 as const,
      isIsland: false,
    }
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root']),
      manualPrices: new Map([[childPath('root', 0), 10]]),
      productionConfig: rrrConfig,
    }

    const result = calculateCraftCost(asBaseItemId('INGOT'), 0, 1, repo, config)
    const expectedRRR = 1 - 1 / (1 + 0.58)

    expect(result.returnedMaterials).toHaveLength(1)
    expect(result.returnedMaterials[0]?.itemId).toBe(asBaseItemId('ORE'))
    expect(result.returnedMaterials[0]?.returnedQuantity).toBeCloseTo(
      3 * expectedRRR,
      10,
    )
  })

  it('recursión a 2 niveles: expandir SWORD y también INGOT', () => {
    // SWORD expandido -> INGOT expandido (2x ORE @ precio manual 3) + BAR hoja (precio manual 5)
    // INGOT por unidad: gross = 3*3 = 9, RRR neutro = 0 -> net = 9; unitCost = (9 + silverFee 10) / 1 = 19
    // SWORD pide 2x INGOT -> 2 crafteos de INGOT -> tarifa de estación de INGOT = 10*2 = 20
    // SWORD ingredientes: 2x INGOT (costo 19 c/u = 38) + 4x BAR (5 c/u = 20) = gross 58
    // SWORD unitCost = (58 + silverFee 50) / 1 = 108
    const ingotPath = childPath('root', 0)
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root', ingotPath]),
      manualPrices: new Map([
        [childPath(ingotPath, 0), 3], // ORE dentro de INGOT
        [childPath('root', 1), 5], // BAR
      ]),
      productionConfig: DEFAULT_RETURN_RATE_CONFIG,
    }

    const result = calculateCraftCost(asBaseItemId('SWORD'), 0, 1, repo, config)

    const ingotNode = result.root.children[0]
    expect(ingotNode?.isManualPrice).toBe(false)
    expect(ingotNode?.unitCost).toBe(19)

    expect(result.totalStationFees).toBe(50 + 10 * 2) // sword fee (1 craft) + ingot fee (2 crafts, piden 2 unidades)
    expect(result.grandTotal).toBe(108)
  })

  it('escala correctamente cuando outputQuantity > 1 (ej. comida produce 5 por tirada)', () => {
    // Pedimos 10 unidades de FOOD -> 2 crafteos necesarios (10/5)
    // 1 crafteo gasta 2x GRAIN; con precio manual 1 -> gross por crafteo = 2
    // unitCost = (2 + silverFee 0) / outputQuantity 5 = 0.4 por unidad
    // grandTotal = 0.4 * 10 = 4; stationFees = 0 * 2 = 0
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root']),
      manualPrices: new Map([[childPath('root', 0), 1]]),
      productionConfig: DEFAULT_RETURN_RATE_CONFIG,
    }

    const result = calculateCraftCost(asBaseItemId('FOOD'), 0, 10, repo, config)

    expect(result.root.unitCost).toBeCloseTo(0.4, 10)
    expect(result.grandTotal).toBeCloseTo(4, 10)
  })

  it('cantidad pedida escala el costo total linealmente para una hoja', () => {
    const config: CraftTreeConfig = {
      ...createEmptyTreeConfig(),
      manualPrices: new Map([['root', 7]]),
    }
    const result1 = calculateCraftCost(asBaseItemId('ORE'), 0, 1, repo, config)
    const result10 = calculateCraftCost(asBaseItemId('ORE'), 0, 10, repo, config)

    expect(result10.grandTotal).toBe(result1.grandTotal * 10)
  })
})


function buildRoyalRecipeRepository(): ItemRepository {
  const items = new Map<BaseItemId, Item>()

  function add(item: Item): void {
    items.set(item.id, item)
  }

  const SOLDIER_ARMOR = asBaseItemId('T4_ARMOR_PLATE_SET1')
  const KNIGHT_ARMOR = asBaseItemId('T4_ARMOR_PLATE_SET2')
  const GUARDIAN_ARMOR = asBaseItemId('T4_ARMOR_PLATE_SET3')
  const ROYAL_SIGIL = asBaseItemId('QUESTITEM_TOKEN_ROYAL_T4')
  const ROYAL_ARMOR = asBaseItemId('T4_ARMOR_PLATE_ROYAL')

  for (const [id, name] of [
    [SOLDIER_ARMOR, 'Soldier Armor'],
    [KNIGHT_ARMOR, 'Knight Armor'],
    [GUARDIAN_ARMOR, 'Guardian Armor'],
  ] as const) {
    add({
      id,
      name,
      tier: 4,
      category: 'armor',
      maxEnchantment: 4,
      recipe: null,
    })
  }

  add({
    id: ROYAL_SIGIL,
    name: 'Royal Sigil',
    tier: 4,
    category: 'other',
    maxEnchantment: 0,
    recipe: null,
  })

  add({
    id: ROYAL_ARMOR,
    name: 'Royal Armor',
    tier: 4,
    category: 'armor',
    maxEnchantment: 4,
    recipe: {
      tiers: [
        {
          enchantment: 2,
          station: 'warrior_forge',
          ingredients: [
            { itemId: SOLDIER_ARMOR, enchantment: 2, quantity: 1 },
            { itemId: ROYAL_SIGIL, enchantment: 0, quantity: 4 },
          ],
          outputQuantity: 1,
          silverFee: 0,
          craftingFocus: 0,
          alternatives: [
            {
              ingredients: [
                { itemId: KNIGHT_ARMOR, enchantment: 2, quantity: 1 },
                { itemId: ROYAL_SIGIL, enchantment: 0, quantity: 4 },
              ],
              outputQuantity: 1,
              silverFee: 0,
              craftingFocus: 0,
            },
            {
              ingredients: [
                { itemId: GUARDIAN_ARMOR, enchantment: 2, quantity: 1 },
                { itemId: ROYAL_SIGIL, enchantment: 0, quantity: 4 },
              ],
              outputQuantity: 1,
              silverFee: 0,
              craftingFocus: 0,
            },
          ],
          upgradeFrom: null,
        },
      ],
    },
  })

  return {
    getById: (id) => items.get(id) ?? null,
    getAll: () => Array.from(items.values()),
    searchByName: () => [],
  }
}

describe('recetas alternativas de equipo real', () => {
  const royalRepo = buildRoyalRecipeRepository()
  const royalArmor = asBaseItemId('T4_ARMOR_PLATE_ROYAL')

  it('usa por defecto la primera pieza de la rama y mantiene el sello en .0', () => {
    const config: CraftTreeConfig = {
      ...createEmptyTreeConfig(),
      expandedPaths: new Set(['root']),
    }

    const result = calculateCraftCost(royalArmor, 2, 1, royalRepo, config)

    expect(result.root.recipeOptionIndex).toBe(0)
    expect(result.root.children[0]?.itemId).toBe(
      asBaseItemId('T4_ARMOR_PLATE_SET1'),
    )
    expect(result.root.children[0]?.enchantment).toBe(2)
    expect(result.root.children[1]?.itemId).toBe(
      asBaseItemId('QUESTITEM_TOKEN_ROYAL_T4'),
    )
    expect(result.root.children[1]?.enchantment).toBe(0)
    expect(result.root.children[1]?.quantity).toBe(4)
  })

  it('permite elegir cualquiera de las tres piezas sin mezclar sus precios', () => {
    const optionIndex = 2
    const basePath = recipeChildPath('root', optionIndex, 0)
    const sigilPath = recipeChildPath('root', optionIndex, 1)
    const config: CraftTreeConfig = {
      ...createEmptyTreeConfig(),
      expandedPaths: new Set(['root']),
      selectedRecipeOptions: new Map([['root', optionIndex]]),
      manualPrices: new Map([
        [basePath, 100_000],
        [sigilPath, 20_000],
      ]),
    }

    const result = calculateCraftCost(royalArmor, 2, 1, royalRepo, config)

    expect(result.root.recipeOptionIndex).toBe(2)
    expect(result.root.children[0]?.itemId).toBe(
      asBaseItemId('T4_ARMOR_PLATE_SET3'),
    )
    expect(result.grandTotal).toBe(180_000)
    expect(result.isComplete).toBe(true)
  })

  it('no aplica RRR ni a la pieza base ni a los Sellos Reales', () => {
    const rrrConfig = {
      cityId: 'martlock',
      hasSpecialtyBonus: true,
      specialtyKind: 'crafting' as const,
      useFocus: true,
      hasDailyBonus: false,
      dailyBonusAmount: 0.1 as const,
      isIsland: false,
    }
    const config: CraftTreeConfig = {
      expandedPaths: new Set(['root']),
      manualPrices: new Map([
        [childPath('root', 0), 100_000],
        [childPath('root', 1), 20_000],
      ]),
      productionConfig: rrrConfig,
    }

    const result = calculateCraftCost(royalArmor, 2, 1, royalRepo, config)

    expect(result.grandTotal).toBe(180_000)
    expect(result.totalSilverSavedByReturnRate).toBe(0)
    expect(result.returnedMaterials).toHaveLength(0)
  })
})
