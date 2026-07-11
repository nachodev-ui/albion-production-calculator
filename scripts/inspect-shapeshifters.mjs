import { XMLParser } from 'fast-xml-parser'

const response = await fetch(
  'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.xml',
)
if (!response.ok) {
  throw new Error(`No se pudo descargar items.xml: ${response.status}`)
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})
const parsed = parser.parse(await response.text())
const matches = []

function visit(value, path) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => visit(entry, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== 'object') return

  const id = value['@_uniquename']
  if (
    typeof id === 'string' &&
    (id.toUpperCase().includes('SHAPESHIFT') ||
      JSON.stringify(value).toUpperCase().includes('SHAPESHIFT'))
  ) {
    matches.push({
      path,
      id,
      tier: value['@_tier'] ?? null,
      shopCategory: value['@_shopcategory'] ?? null,
      shopSubcategory1: value['@_shopsubcategory1'] ?? null,
      craftingCategory: value['@_craftingcategory'] ?? null,
      hasCraftingRequirements: Boolean(value.craftingrequirements),
      hasEnchantments: Boolean(value.enchantments),
    })
  }

  for (const [key, child] of Object.entries(value)) {
    visit(child, `${path}.${key}`)
  }
}

visit(parsed.items, 'items')
console.log(
  JSON.stringify(
    {
      topLevelKeys: Object.keys(parsed.items ?? {}),
      matchCount: matches.length,
      matches,
    },
    null,
    2,
  ),
)
