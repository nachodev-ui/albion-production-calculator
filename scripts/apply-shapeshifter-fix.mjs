import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { XMLParser } from 'fast-xml-parser'

const ITEMS_XML_URL =
  'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.xml'
const DATASET_PATH = 'src/data/datasets/items.json'
const CATALOG_PATH = 'src/features/item-browser/data/craftingBranches.ts'
const TEST_PATH =
  'src/features/item-browser/data/__tests__/craftingBranches.test.ts'
const GENERATOR_PATH = 'scripts/generate-dataset.ts'

function replaceOnce(text, search, replacement, label) {
  const next = text.replace(search, replacement)
  if (next === text) throw new Error(`No se pudo aplicar el cambio: ${label}`)
  return next
}

function toArray(value) {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function parseFamilyId(itemId) {
  const match = /^T\d+_(.+)$/.exec(itemId)
  if (!match?.[1]) throw new Error(`ID sin tier reconocido: ${itemId}`)
  return match[1]
}

function isShapeshifterItem(item) {
  return (
    item.category === 'weapon' &&
    item.id.includes('SHAPESHIFTER') &&
    !item.id.includes('ARTEFACT_')
  )
}

function familyOrder(familyId) {
  const suffix = familyId.split('_').at(-1) ?? familyId
  const order = {
    SET1: 0,
    SET2: 1,
    SET3: 2,
    MORGANA: 3,
    HELL: 4,
    KEEPER: 5,
    AVALON: 6,
    CRYSTAL: 7,
  }
  return order[suffix] ?? 100
}

async function loadOfficialShapeshifterNodes() {
  const response = await fetch(ITEMS_XML_URL)
  if (!response.ok) {
    throw new Error(
      `No se pudo descargar items.xml: ${response.status} ${response.statusText}`,
    )
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })
  const parsed = parser.parse(await response.text())
  const nodes = toArray(parsed.items?.transformationweapon).filter((node) => {
    const id = node['@_uniquename'] ?? ''
    const tier = Number(node['@_tier'] ?? 0)
    return (
      id.includes('SHAPESHIFTER') &&
      !id.includes('ARTEFACT_') &&
      tier >= 3 &&
      tier <= 8
    )
  })

  if (nodes.length === 0) {
    throw new Error('items.xml no contiene transformationweapon cambiaformas T3–T8')
  }

  const categories = new Set(
    nodes.map((node) => node['@_craftingcategory']).filter(Boolean),
  )
  const subcategories = new Set(
    nodes.map((node) => node['@_shopsubcategory1']).filter(Boolean),
  )
  if (
    !categories.has('shapeshifterstaff') ||
    !subcategories.has('shapeshifterstaff')
  ) {
    throw new Error(
      `Metadatos cambiaformas inesperados: crafting=${[...categories].join(',')} shop=${[...subcategories].join(',')}`,
    )
  }

  return nodes
}

function updateGenerator() {
  let source = readFileSync(GENERATOR_PATH, 'utf8')
  const replacement = `function inferStation(\n  shopSubcategory1: string | undefined,\n  craftingCategory: string | undefined,\n): string {\n  const normalizedShopSubcategory = shopSubcategory1?.toLowerCase() ?? ''\n  const normalizedCraftingCategory = craftingCategory?.toLowerCase() ?? ''\n\n  // Albion modela esta línea como <transformationweapon> y usa\n  // shapeshifterstaff tanto en shopsubcategory1 como en craftingcategory.\n  if (\n    normalizedShopSubcategory === 'shapeshifterstaff' ||\n    normalizedCraftingCategory === 'shapeshifterstaff'\n  ) {\n    return 'hunter_lodge'\n  }\n\n  if (normalizedCraftingCategory.includes('warrior')) return 'warrior_forge'\n  if (normalizedCraftingCategory.includes('hunter')) return 'hunter_lodge'\n  if (normalizedCraftingCategory.includes('mage')) return 'mage_tower'\n  if (normalizedCraftingCategory.includes('toolmaker')) return 'toolmaker'\n  if (normalizedCraftingCategory.includes('refin')) return 'refining'\n\n  if (!shopSubcategory1) return 'unknown'\n  const meleeWeapons = ['sword', 'axe', 'mace', 'hammer', 'dagger', 'spear']\n  const hunterWeapons = ['bow', 'crossbow', 'nature_staff']\n  const magicWeapons = ['arcane_staff', 'fire_staff', 'frost_staff', 'holy_staff', 'cursed_staff']\n  const plateArmor = ['plate_armor', 'plate_helmet', 'plate_shoes']\n  const leatherArmor = ['leather_armor', 'leather_helmet', 'leather_shoes']\n  const clothArmor = ['cloth_armor', 'cloth_helmet', 'cloth_shoes']\n\n  if (meleeWeapons.includes(shopSubcategory1) || plateArmor.includes(shopSubcategory1)) {\n    return 'warrior_forge'\n  }\n  if (hunterWeapons.includes(shopSubcategory1) || leatherArmor.includes(shopSubcategory1)) {\n    return 'hunter_lodge'\n  }\n  if (magicWeapons.includes(shopSubcategory1) || clothArmor.includes(shopSubcategory1)) {\n    return 'mage_tower'\n  }\n  if (shopSubcategory1.includes('refinedresources') || shopSubcategory1.includes('resources')) {\n    return 'refining'\n  }\n  return 'toolmaker'\n}`

  source = replaceOnce(
    source,
    /function inferStation\(shopSubcategory1: string \| undefined\): string \{[\s\S]*?\n\}/,
    replacement,
    'inferStation con transformationweapon cambiaformas',
  )
  source = replaceOnce(
    source,
    "    if (tagName === 'weapon') {",
    "    if (tagName === 'weapon' || tagName === 'transformationweapon') {",
    'mapear transformationweapon como weapon',
  )
  source = replaceOnce(
    source,
    '    const station = inferStation(shopSubcategory1)',
    "    const station = inferStation(shopSubcategory1, node['@_craftingcategory'])",
    'pasar craftingcategory a inferStation',
  )
  source = replaceOnce(
    source,
    "    const relevantTags = ['weapon', 'equipmentitem', 'simpleitem'] as const",
    "    const relevantTags = ['weapon', 'transformationweapon', 'equipmentitem', 'simpleitem'] as const",
    'procesar transformationweapon',
  )

  writeFileSync(GENERATOR_PATH, source, 'utf8')
}

function regenerateOnlyShapeshifters(officialNodes) {
  const originalItems = JSON.parse(readFileSync(DATASET_PATH, 'utf8'))

  execFileSync('pnpm', ['run', 'generate:dataset'], {
    stdio: 'inherit',
  })

  const regeneratedItems = JSON.parse(readFileSync(DATASET_PATH, 'utf8'))
  const shapeshifterItems = regeneratedItems.filter(isShapeshifterItem)
  const officialIds = new Set(
    officialNodes.map((node) => node['@_uniquename']).filter(Boolean),
  )
  const generatedIds = new Set(shapeshifterItems.map((item) => item.id))

  const missingIds = [...officialIds].filter((id) => !generatedIds.has(id))
  const unexpectedIds = [...generatedIds].filter((id) => !officialIds.has(id))
  if (missingIds.length > 0 || unexpectedIds.length > 0) {
    throw new Error(
      `Dataset cambiaformas incompleto. missing=${missingIds.join(',')} unexpected=${unexpectedIds.join(',')}`,
    )
  }

  if (shapeshifterItems.length !== 41) {
    throw new Error(
      `Se esperaban 41 cambiaformas T3–T8 y se generaron ${shapeshifterItems.length}`,
    )
  }

  for (const item of shapeshifterItems) {
    if (!item.recipe) throw new Error(`${item.id} no contiene receta`)
    if (!item.recipe.tiers.every((tier) => tier.station === 'hunter_lodge')) {
      throw new Error(`${item.id} no quedó clasificado en hunter_lodge`)
    }
  }

  const originalWithoutShapeshifters = originalItems.filter(
    (item) => !isShapeshifterItem(item),
  )
  const lastWeaponIndex = originalWithoutShapeshifters.reduce(
    (lastIndex, item, index) =>
      item.category === 'weapon' ? index : lastIndex,
    -1,
  )
  const insertionIndex = lastWeaponIndex + 1
  const mergedItems = [
    ...originalWithoutShapeshifters.slice(0, insertionIndex),
    ...shapeshifterItems,
    ...originalWithoutShapeshifters.slice(insertionIndex),
  ]

  writeFileSync(DATASET_PATH, `${JSON.stringify(mergedItems, null, 2)}\n`, 'utf8')
  return shapeshifterItems
}

function updateCatalog(shapeshifterItems) {
  const branchItems = shapeshifterItems.filter(
    (item) => item.tier >= 4 && item.tier <= 8,
  )
  const families = [
    ...new Set(branchItems.map((item) => parseFamilyId(item.id))),
  ].sort((left, right) => {
    const orderDifference = familyOrder(left) - familyOrder(right)
    return orderDifference || left.localeCompare(right)
  })

  if (families.length !== 8) {
    throw new Error(
      `Se esperaban 8 familias cambiaformas y se encontraron ${families.length}: ${families.join(', ')}`,
    )
  }

  for (const family of families) {
    const tiers = branchItems
      .filter((item) => parseFamilyId(item.id) === family)
      .map((item) => item.tier)
      .sort((left, right) => left - right)
      .join(',')
    if (tiers !== '4,5,6,7,8') {
      throw new Error(`La familia ${family} no contiene T4–T8 completos: ${tiers}`)
    }
  }

  const familySet = families.map((family) => `    '${family}',`).join('\n')
  let source = readFileSync(CATALOG_PATH, 'utf8')

  source = replaceOnce(
    source,
    /(  cursed: new Set\(\[[\s\S]*?\n  \]\),\n)(} as const)/,
    `$1  shapeshifter: new Set([\n${familySet}\n  ]),\n$2`,
    'familias cambiaformas',
  )
  source = replaceOnce(
    source,
    "  cursed: 'mage_tower',\n}",
    "  cursed: 'mage_tower',\n  shapeshifter: 'hunter_lodge',\n}",
    'estación de la línea cambiaformas',
  )
  source = replaceOnce(
    source,
    "  'weapon_cursed',\n]",
    "  'weapon_cursed',\n  'weapon_shapeshifter',\n]",
    'orden de ramas cambiaformas',
  )
  source = replaceOnce(
    source,
    /(  weapon_cursed: createWeaponBranch\([\s\S]*?\n  \),\n)(})/,
    `$1  weapon_shapeshifter: createWeaponBranch(\n    'shapeshifter',\n    'Shapeshifter Staff Crafter',\n    'Bastones cambiaformas y sus variantes',\n  ),\n$2`,
    'definición de rama cambiaformas',
  )
  source = replaceOnce(
    source,
    "      cursed: 'cursed_staff',\n    }",
    "      cursed: 'cursed_staff',\n      shapeshifter: 'shapeshifter_staff',\n    }",
    'categoría de especialidad cambiaformas',
  )

  writeFileSync(CATALOG_PATH, source, 'utf8')
  return { branchItems, families }
}

function updateTests(shapeshifterItems, branchItems, families) {
  let source = readFileSync(TEST_PATH, 'utf8')
  const expectedItemCount = 664 + shapeshifterItems.length

  source = replaceOnce(
    source,
    '  buildCategoryCraftingCatalog,\n  isGroupedCraftingItem,',
    '  buildCategoryCraftingCatalog,\n  getCraftingSpecialtyCategory,\n  isGroupedCraftingItem,',
    'importar getCraftingSpecialtyCategory',
  )
  source = replaceOnce(
    source,
    "it('agrupa todo el equipamiento reconocido en 20 ramas'",
    "it('agrupa todo el equipamiento reconocido en 21 ramas'",
    'descripción del total de ramas',
  )
  source = replaceOnce(
    source,
    'expect(catalog.branches).toHaveLength(20)',
    'expect(catalog.branches).toHaveLength(21)',
    'total de ramas',
  )
  source = replaceOnce(
    source,
    'expect(catalog.itemCount).toBe(664)',
    `expect(catalog.itemCount).toBe(${expectedItemCount})`,
    'total de armas agrupadas',
  )

  const testBlock = `\n\n  it('agrupa todos los bastones cambiaformas T4 a T8', () => {\n    const shapeshifters = getBranch('weapon', 'weapon_shapeshifter')\n    const sourceItems = repository\n      .getAll('weapon')\n      .filter(\n        (item) =>\n          item.recipe &&\n          item.id.includes('SHAPESHIFTER') &&\n          !item.id.includes('ARTEFACT_') &&\n          item.tier >= 4,\n      )\n    const introductoryItem = repository\n      .getAll('weapon')\n      .find(\n        (item) =>\n          item.id.includes('SHAPESHIFTER') &&\n          !item.id.includes('ARTEFACT_') &&\n          item.tier === 3,\n      )\n\n    expect(introductoryItem).toBeDefined()\n    expect(\n      introductoryItem\n        ? isGroupedCraftingItem('weapon', introductoryItem)\n        : false,\n    ).toBe(true)\n    expect(shapeshifters.stationGroup).toBe('hunter_lodge')\n    expect(shapeshifters.itemCount).toBe(sourceItems.length)\n    expect(shapeshifters.itemCount).toBe(${branchItems.length})\n    expect(shapeshifters.families).toHaveLength(${families.length})\n    expect(\n      shapeshifters.families.every(\n        (family) =>\n          family.items.map((item) => item.tier).join(',') === '4,5,6,7,8',\n      ),\n    ).toBe(true)\n    expect(\n      shapeshifters.families\n        .flatMap((family) => family.items)\n        .every(\n          (item) =>\n            getCraftingSpecialtyCategory(item) === 'shapeshifter_staff' &&\n            item.recipe?.tiers.every(\n              (tier) => tier.station === 'hunter_lodge',\n            ),\n        ),\n    ).toBe(true)\n  })`

  source = replaceOnce(
    source,
    "\n})\n\ndescribe('ramas de offhands'",
    `${testBlock}\n})\n\ndescribe('ramas de offhands'`,
    'prueba de bastones cambiaformas',
  )

  writeFileSync(TEST_PATH, source, 'utf8')
}

const officialNodes = await loadOfficialShapeshifterNodes()
updateGenerator()
const shapeshifterItems = regenerateOnlyShapeshifters(officialNodes)
const { branchItems, families } = updateCatalog(shapeshifterItems)
updateTests(shapeshifterItems, branchItems, families)

console.log(
  JSON.stringify(
    {
      station: 'hunter_lodge',
      itemTag: 'transformationweapon',
      items: shapeshifterItems.length,
      branchItems: branchItems.length,
      families,
    },
    null,
    2,
  ),
)
