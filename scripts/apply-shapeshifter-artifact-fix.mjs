import { readFileSync, writeFileSync } from 'node:fs'

const GENERATOR_PATH = 'scripts/generate-dataset.ts'
const DATASET_PATH = 'src/data/datasets/items.json'
const BEFORE_PATH = '/tmp/items-before.json'
const INGREDIENT_PATTERN = /^(?:T1_ALCHEMY_COMMON|T[357]_ALCHEMY_RARE_[A-Z0-9_]+)$/

function replaceOnce(text, search, replacement, label) {
  const count = text.split(search).length - 1
  if (count !== 1) {
    throw new Error(`${label}: se esperaba 1 coincidencia y hubo ${count}`)
  }
  return text.replace(search, replacement)
}

function apply() {
  writeFileSync(BEFORE_PATH, readFileSync(DATASET_PATH))

  let source = readFileSync(GENERATOR_PATH, 'utf8')
  source = replaceOnce(
    source,
    `const ROYAL_SIGIL_PATTERN = /^QUESTITEM_TOKEN_ROYAL_T[4-8]$/

function isRoyalSigil(uniqueName: string): boolean {
  return ROYAL_SIGIL_PATTERN.test(uniqueName)
}
`,
    `const ROYAL_SIGIL_PATTERN = /^QUESTITEM_TOKEN_ROYAL_T[4-8]$/
const ALCHEMY_CRAFTING_INGREDIENT_PATTERN =
  /^(?:T1_ALCHEMY_COMMON|T[357]_ALCHEMY_RARE_[A-Z0-9_]+)$/

function isRoyalSigil(uniqueName: string): boolean {
  return ROYAL_SIGIL_PATTERN.test(uniqueName)
}

function isAlchemyCraftingIngredient(uniqueName: string): boolean {
  return ALCHEMY_CRAFTING_INGREDIENT_PATTERN.test(uniqueName)
}
`,
    'helper de ingredientes de alquimia',
  )
  source = replaceOnce(
    source,
    `    const category = isRoyalSigil(id)
      ? 'other'
      : mapCategory(tagName, shopCategory, shopSubcategory1)`,
    `    const category = isRoyalSigil(id) || isAlchemyCraftingIngredient(id)
      ? 'other'
      : mapCategory(tagName, shopCategory, shopSubcategory1)`,
    'clasificación de ingredientes de alquimia',
  )
  writeFileSync(GENERATOR_PATH, source, 'utf8')
}

function isolate() {
  const before = JSON.parse(readFileSync(BEFORE_PATH, 'utf8'))
  const generated = JSON.parse(readFileSync(DATASET_PATH, 'utf8'))
  const beforeIds = new Set(before.map((item) => item.id))
  const additions = generated.filter(
    (item) => !beforeIds.has(item.id) && INGREDIENT_PATTERN.test(item.id),
  )

  if (additions.length !== 22) {
    throw new Error(
      `Se esperaban 22 dependencias nuevas en la generación y hubo ${additions.length}`,
    )
  }

  const focused = [...before, ...additions]
  writeFileSync(DATASET_PATH, `${JSON.stringify(focused, null, 2)}\n`, 'utf8')
}

function verify() {
  const before = JSON.parse(readFileSync(BEFORE_PATH, 'utf8'))
  const after = JSON.parse(readFileSync(DATASET_PATH, 'utf8'))
  const beforeById = new Map(before.map((item) => [item.id, item]))
  const beforeIds = new Set(beforeById.keys())
  const afterIds = new Set(after.map((item) => item.id))
  const added = after.filter((item) => !beforeIds.has(item.id))
  const removed = before.filter((item) => !afterIds.has(item.id))
  const modifiedExisting = after
    .filter((item) => beforeIds.has(item.id))
    .filter(
      (item) =>
        JSON.stringify(item) !== JSON.stringify(beforeById.get(item.id)),
    )
    .map((item) => item.id)

  console.log(
    JSON.stringify(
      {
        before: before.length,
        after: after.length,
        added: added.map(({ id, name, category }) => ({ id, name, category })),
        removed: removed.map(({ id }) => id),
        modifiedExisting,
      },
      null,
      2,
    ),
  )

  if (added.length !== 22) {
    throw new Error(`Se esperaban 22 ingredientes añadidos y hubo ${added.length}`)
  }
  if (removed.length !== 0) {
    throw new Error(`La regeneración eliminó ${removed.length} objetos`)
  }
  if (modifiedExisting.length !== 0) {
    throw new Error(
      `La corrección modificó ${modifiedExisting.length} objetos existentes`,
    )
  }
  if (
    added.some(
      (item) =>
        !INGREDIENT_PATTERN.test(item.id) ||
        item.category !== 'other' ||
        item.name === item.id,
    )
  ) {
    throw new Error('Se añadieron objetos inesperados o sin localizar')
  }

  const byId = new Map(after.map((item) => [item.id, item]))
  const expected = new Map([
    ['T5_ALCHEMY_RARE_PANTHER', 'Garras sombrías finas'],
    ['T5_ALCHEMY_RARE_WEREWOLF', 'Colmillos de hombre lobo finos'],
  ])
  for (const [id, name] of expected) {
    if (byId.get(id)?.name !== name) {
      throw new Error(`${id} no tiene la traducción oficial esperada`)
    }
  }
}

const command = process.argv[2]
if (command === 'apply') apply()
else if (command === 'isolate') isolate()
else if (command === 'verify') verify()
else throw new Error(`Comando no reconocido: ${command ?? '<vacío>'}`)
