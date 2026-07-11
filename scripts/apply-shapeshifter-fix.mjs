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
  if (next === text) {
    throw new Error(`No se pudo aplicar el cambio: ${label}`)
  }
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

function detectStation(nodes) {
  const signals = nodes.flatMap((node) => [
    node['@_craftingcategory'],
    node['@_shopsubcategory1'],
  ])
  const normalized = signals
    .filter((value) => typeof value === 'string')
    .map((value) => value.toLowerCase())

  if (normalized.some((value) => value.includes('hunter'))) {
    return 'hunter_lodge'
  }
  if (normalized.some((value) => value.includes('mage'))) {
    return 'mage_tower'
  }

  throw new Error(
    `No se pudo determinar la estación cambiaformas desde: ${[...new Set(normalized)].join(', ')}`,
  )
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
  const nodes = toArray(parsed.items?.weapon).filter((node) => {
    const id = node['@_uniquename'] ?? ''
    const tier = Number(node['@_tier'] ?? 0)
    return (
      id.includes('SHAPESHIFTER') &&
      !id.includes('ARTEFACT_') &&
      tier >= 4 &&
      tier <= 8
    )
  })

  if (nodes.length === 0) {
    throw new Error('items.xml no contiene armas cambiaformas T4–T8')
  }

  return nodes
}

function updateGenerator(station) {
  let source = readFileSync(GENERATOR_PATH, 'utf8')
  const shapeshifterFallback =
    station === 'hunter_lodge'
      ? "  const hunterWeapons = ['bow', 'crossbow', 'nature_staff', 'shapeshifter_staff', 'shapeshifterstaff']\n  const magicWeapons = ['arcane_staff', 'fire_staff', 'frost_staff', 'holy_staff', 'cursed_staff']"
      : "  const hunterWeapons = ['bow', 'crossbow', 'nature_staff']\n  const magicWeapons = ['arcane_staff', 'fire_staff', 'frost_staff', 'holy_staff', 'cursed_staff', 'shapeshifter_staff', 'shapeshifterstaff']"

  const replacement = `function inferStation(\n  shopSubcategory1: string | undefined,\n  craftingCategory: string | undefined,\n): string {\n  const normalizedCraftingCategory = craftingCategory?.toLowerCase() ?? ''\n\n  if (normalizedCraftingCategory.includes('warrior')) return 'warrior_forge'\n  if (normalizedCraftingCategory.includes('hunter')) return 'hunter_lodge'\n  if (normalizedCraftingCategory.includes('mage')) return 'mage_tower'\n  if (normalizedCraftingCategory.includes('toolmaker')) return 'toolmaker'\n  if (normalizedCraftingCategory.includes('refin')) return 'refining'\n\n  if (!shopSubcategory1) return 'unknown'\n  const meleeWeapons = ['sword', 'axe', 'mace', 'hammer', 'dagger', 'spear']\n${shapeshifterFallback}\n  const plateArmor = ['plate_armor', 'plate_helmet', 'plate_shoes']\n  const leatherArmor = ['leather_armor', 'leather_helmet', 'leather_shoes']\n  const clothArmor = ['cloth_armor', 'cloth_helmet', 'cloth_shoes']\n\n  if (meleeWeapons.includes(shopSubcategory1) || plateArmor.includes(shopSubcategory1)) {\n    return 'warrior_forge'\n  }\n  if (hunterWeapons.includes(shopSubcategory1) || leatherArmor.includes(shopSubcategory1)) {\n    return 'hunter_lodge'\n  }\n  if (magicWeapons.includes(shopSubcategory1) || clothArmor.includes(shopSubcategory1)) {\n    return 'mage_tower'\n  }\n  if (shopSubcategory1.includes('refinedresources') || shopSubcategory1.includes('resources')) {\n    return 'refining'\n  }\n  return 'toolmaker'\n}`

  source = replaceOnce(
    source,
    /function inferStation\(shopSubcategory1: string \| undefined\): string \{[\s\S]*?\n\}/,
    replacement,
    'inferStation con craftingcategory y cambiaformas',
  )
  source = replaceOnce(
    source,
    '    const station = inferStation(shopSubcategory1)',
    "    const station = inferStation(shopSubcategory1, node['@_craftingcategory'])",
    'pasar craftingcategory a inferStation',
  )
  writeFileSync(GENERATOR_PATH, source, 'utf8')
}

function updateDataset(station) {
  const items = JSON.parse(readFileSync(DATASET_PATH, 'utf8'))
  const shapeshifterItems = items.filter(
    (item) =>
      item.category === 'weapon' &&
      item.recipe &&
      item.id.includes('SHAPESHIFTER') &&
      !item.id.includes('ARTEFACT_') &&
      item.tier >= 4 &&
      item.tier <= 8,
  )

  if (shapeshifterItems.length === 0) {
    throw new Error('El dataset local no contiene bastones cambiaformas craftables')
  }

  for (const item of shapeshifterItems) {
    for (const tier of item.recipe.tiers) {
      tier.station = station
    }
  }

  writeFileSync(DATASET_PATH, `${JSON.stringify(items, null, 2)}\n`, 'utf8')
  return shapeshifterItems
}

function updateCatalog(shapeshifterItems, station) {
  const families = [
    ...new Set(shapeshifterItems.map((item) => parseFamilyId(item.id))),
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
    const tiers = shapeshifterItems
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
    `  cursed: 'mage_tower',\n  shapeshifter: '${station}',\n}`,
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
  return families
}

function updateTests(shapeshifterItems, families, station) {
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

  const testBlock = `\n\n  it('agrupa todos los bastones cambiaformas T4 a T8', () => {\n    const shapeshifters = getBranch('weapon', 'weapon_shapeshifter')\n    const sourceItems = repository\n      .getAll('weapon')\n      .filter(\n        (item) =>\n          item.recipe &&\n          item.id.includes('SHAPESHIFTER') &&\n          !item.id.includes('ARTEFACT_'),\n      )\n\n    expect(shapeshifters.stationGroup).toBe('${station}')\n    expect(shapeshifters.itemCount).toBe(sourceItems.length)\n    expect(shapeshifters.families).toHaveLength(${families.length})\n    expect(\n      shapeshifters.families.every(\n        (family) =>\n          family.items.map((item) => item.tier).join(',') === '4,5,6,7,8',\n      ),\n    ).toBe(true)\n    expect(\n      shapeshifters.families\n        .flatMap((family) => family.items)\n        .every(\n          (item) =>\n            getCraftingSpecialtyCategory(item) === 'shapeshifter_staff' &&\n            item.recipe?.tiers.every((tier) => tier.station === '${station}'),\n        ),\n    ).toBe(true)\n  })`

  source = replaceOnce(
    source,
    "\n})\n\ndescribe('ramas de offhands'",
    `${testBlock}\n})\n\ndescribe('ramas de offhands'`,
    'prueba de bastones cambiaformas',
  )

  writeFileSync(TEST_PATH, source, 'utf8')
}

const officialNodes = await loadOfficialShapeshifterNodes()
const station = detectStation(officialNodes)
updateGenerator(station)
const shapeshifterItems = updateDataset(station)
const families = updateCatalog(shapeshifterItems, station)
updateTests(shapeshifterItems, families, station)

console.log(
  JSON.stringify(
    {
      station,
      items: shapeshifterItems.length,
      families,
      officialCraftingCategories: [
        ...new Set(officialNodes.map((node) => node['@_craftingcategory'])),
      ],
      officialShopSubcategories: [
        ...new Set(officialNodes.map((node) => node['@_shopsubcategory1'])),
      ],
    },
    null,
    2,
  ),
)
