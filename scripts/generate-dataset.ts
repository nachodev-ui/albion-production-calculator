/**
 * Script de generación de dataset: descarga items.xml desde el repo
 * comunitario ao-data/ao-bin-dumps y lo transforma al formato de
 * `Item`/`Recipe` que usa la app, filtrando solo las categorías
 * en alcance (armas, armaduras, accesorios, recursos).
 *
 * Uso: pnpm run generate:dataset
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { XMLParser } from 'fast-xml-parser'

const ITEMS_XML_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.xml'
const ITEMS_LOCALIZATION_URL =
  'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json'
const OUTPUT_PATH = './src/data/datasets/items.json'
const LOCALE = 'ES-ES'

// ---------------------------------------------------------------------------
// Tipos del XML crudo (solo los campos que usamos, el XML tiene muchos más)
// ---------------------------------------------------------------------------

interface RawCraftResource {
  '@_uniquename': string
  '@_count': string
  '@_enchantmentlevel'?: string
}

interface RawUpgradeResource {
  '@_uniquename': string
  '@_count': string
}

interface RawCraftingRequirements {
  '@_silver'?: string
  '@_time'?: string
  '@_craftingfocus'?: string
  '@_amountcrafted'?: string
  craftresource?: RawCraftResource | RawCraftResource[]
}

interface RawUpgradeRequirements {
  upgraderesource?: RawUpgradeResource | RawUpgradeResource[]
}

interface RawEnchantment {
  '@_enchantmentlevel': string
  craftingrequirements?: RawCraftingRequirements | RawCraftingRequirements[]
  upgraderequirements?: RawUpgradeRequirements
}

interface RawEnchantments {
  enchantment?: RawEnchantment | RawEnchantment[]
}

interface RawItemNode {
    '@_uniquename': string
    '@_tier'?: string
    '@_craftingcategory'?: string
    '@_shopcategory'?: string
    '@_shopsubcategory1'?: string
    craftingrequirements?: RawCraftingRequirements | RawCraftingRequirements[]
    enchantments?: RawEnchantments
  }

interface RawLocalizationEntry {
    UniqueName: string
    LocalizedNames?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Tipos del dataset de SALIDA (deben reflejar exactamente las entidades
// de core/domain/entities, pero como datos planos serializables)
// ---------------------------------------------------------------------------

type OutputCategory =
  | 'weapon'
  | 'armor'
  | 'offhand'
  | 'accessory'
  | 'resource'
  | 'refined_resource'
  | 'other'

interface OutputIngredient {
  itemId: string
  enchantment: number
  quantity: number
}

interface OutputUpgradeRequirement {
  itemId: string
  quantity: number
}

interface OutputRecipeOption {
  ingredients: OutputIngredient[]
  outputQuantity: number
  silverFee: number
  craftingFocus: number
}

interface OutputRecipeTier extends OutputRecipeOption {
  enchantment: number
  station: string
  alternatives?: OutputRecipeOption[]
  upgradeFrom: OutputUpgradeRequirement | null
}

interface OutputItem {
    id: string
    name: string
    tier: number
    category: OutputCategory
    maxEnchantment: number
    recipe: { tiers: OutputRecipeTier[] } | null
  }

// ---------------------------------------------------------------------------
// Helpers de normalización
// ---------------------------------------------------------------------------

/** Las propiedades del XML pueden venir como objeto único o array; normalizamos a array. */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Construye un mapa UniqueName -> nombre localizado a partir del
 * dataset de localización. Si un ítem no tiene nombre en el locale
 * pedido, se usa EN-US como respaldo, y si tampoco existe, el propio id.
 */
function buildLocalizationMap(entries: RawLocalizationEntry[]): Map<string, string> {
    const map = new Map<string, string>()
    for (const entry of entries) {
      const name = entry.LocalizedNames?.[LOCALE] ?? entry.LocalizedNames?.['EN-US']
      if (name) map.set(entry.UniqueName, name)
    }
    return map
  }

/**
 * Detecta ítems de debug/desarrollo que no son contenido real del
 * juego (ej. T4_DEBUG_ARMOR_HIDDEN) y no deben aparecer en el dataset.
 */
function isDebugItem(uniqueName: string): boolean {
  return uniqueName.includes('_DEBUG_')
}

/**
 * Las variantes de recurso encantado (ej. T4_ORE_LEVEL2) NO tienen
 * entrada propia en el archivo de localización: el juego las deriva
 * del nombre del recurso base, igual que cualquier otro ítem
 * encantable. Si buscáramos el id completo en el mapa de
 * localización, fallaría siempre y caeríamos al id crudo como
 * nombre (bug observado en ~211 ítems).
 *
 * Importante: acá devolvemos el nombre BASE limpio, sin sufijo de
 * encantamiento — el sufijo (".2") ya lo agrega `formatEnchantment`
 * en la UI a partir del campo `enchantment`, igual que para
 * equipo. Si lo horneáramos también acá, quedaría duplicado
 * ("Tablas de maderablanca.2.2").
 *
 * @see verificado contra ao-bin-dumps/formatted/items.json: existe
 * "T8_PLANKS" pero no "T8_PLANKS_LEVEL1..4".
 */
const RESOURCE_LEVEL_SUFFIX = /^(.+)_LEVEL([1-4])$/

function resolveItemName(id: string, localizationMap: Map<string, string>): string {
  const directMatch = localizationMap.get(id)
  if (directMatch) return directMatch

  const levelMatch = RESOURCE_LEVEL_SUFFIX.exec(id)
  if (levelMatch) {
    const [, baseId] = levelMatch
    const baseName = localizationMap.get(baseId as string)
    if (baseName) return baseName
  }

  return id
}

/**
 * Heurística para detectar recursos de "evento"/facción que no deben
 * formar parte de la receta estándar (ej. T1_FACTION_MOUNTAIN_TOKEN_1).
 */
const ROYAL_SIGIL_PATTERN = /^QUESTITEM_TOKEN_ROYAL_T[4-8]$/

function isRoyalSigil(uniqueName: string): boolean {
  return ROYAL_SIGIL_PATTERN.test(uniqueName)
}

function isEventOrFactionResource(uniqueName: string): boolean {
  if (isRoyalSigil(uniqueName)) return false

  return (
    uniqueName.includes('FACTION_') ||
    uniqueName.includes('TOKEN') ||
    uniqueName.includes('EVENT_') ||
    uniqueName.includes('CRYSTAL_LEAGUE')
  )
}

/**
 * Determina la estación de crafteo a partir de shopsubcategory1 /
 * craftingcategory. Mapeo aproximado basado en las categorías reales
 * del juego — se amplía a medida que aparecen casos no contemplados.
 */
function inferStation(shopSubcategory1: string | undefined): string {
  if (!shopSubcategory1) return 'unknown'
  const meleeWeapons = ['sword', 'axe', 'mace', 'hammer', 'dagger', 'spear']
  const rangedWeapons = ['bow', 'crossbow']
  const magicWeapons = ['arcane_staff', 'fire_staff', 'frost_staff', 'holy_staff', 'nature_staff', 'cursed_staff']
  const plateArmor = ['plate_armor', 'plate_helmet', 'plate_shoes']
  const leatherArmor = ['leather_armor', 'leather_helmet', 'leather_shoes']
  const clothArmor = ['cloth_armor', 'cloth_helmet', 'cloth_shoes']

  if (meleeWeapons.includes(shopSubcategory1) || plateArmor.includes(shopSubcategory1)) {
    return 'warrior_forge'
  }
  if (rangedWeapons.includes(shopSubcategory1) || leatherArmor.includes(shopSubcategory1)) {
    return 'hunter_lodge'
  }
  if (magicWeapons.includes(shopSubcategory1) || clothArmor.includes(shopSubcategory1)) {
    return 'mage_tower'
  }
  if (shopSubcategory1.includes('refinedresources') || shopSubcategory1.includes('resources')) {
    return 'refining'
  }
  return 'toolmaker'
}

/**
 * Mapea un nodo a su categoría de salida, o `null` si el ítem está
 * fuera de alcance para esta v1 (herramientas de gathering, vanity,
 * artefactos especiales, etc.).
 *
 * Basado en `shopcategory` real del juego (verificado contra el XML),
 * NO en heurísticas sobre el nombre de `shopsubcategory1`.
 */
function mapCategory(
    tagName: string,
    shopCategory: string | undefined,
    shopSubcategory1: string | undefined,
  ): OutputCategory | null {
    if (tagName === 'weapon') {
      // Solo armas de combate real; gathering/vanity/other/magic quedan fuera.
      return shopCategory === 'weapons' ? 'weapon' : null
    }
  
    if (tagName === 'equipmentitem') {
      if (shopCategory === 'armors' || shopCategory === 'head' || shopCategory === 'shoes') {
        return 'armor'
      }
      if (shopCategory === 'offhands') return 'offhand'
      if (shopCategory === 'capes' || shopCategory === 'bags') return 'accessory'
      // gathering, vanity, y cualquier otro shopcategory no contemplado: fuera de alcance.
      return null
    }
  
    if (tagName === 'simpleitem') {
      if (shopSubcategory1 === 'refinedresources') return 'refined_resource'
      if (shopSubcategory1 === 'resources') return 'resource'

      // Artefactos de facción (materiales de calabozo para equipo T4-T8)
      // y blueprints de capa (obtenidos por reputación): el juego los
      // modela como <simpleitem shopcategory="artefacts">, distinto del
      // equipo real que craftean, pero SÍ son ítems propios resolubles
      // (con nombre e ícono), no deberían descartarse del dataset.
      //
      // @see investigación del caso T5_ARTEFACT_MAIN_CURSEDSTAFF_CRYSTAL:
      // existía en items.xml con nombre localizado completo, pero
      // mapCategory lo descartaba por no contemplar shopcategory="artefacts"
      // en absoluto — afectaba a las 860 entradas de esa categoría.
      if (shopCategory === 'artefacts') {
        if (shopSubcategory1 === 'weapons') return 'weapon'
        if (shopSubcategory1 === 'offhands') return 'offhand'
        if (
          shopSubcategory1 === 'armors' ||
          shopSubcategory1 === 'head' ||
          shopSubcategory1 === 'shoes'
        ) {
          return 'armor'
        }
        if (shopSubcategory1 === 'capes') return 'accessory'
        // favor (tokens de favor de facción) y fragments (Runa/Alma/
        // Reliquia, ya referenciados aparte vía upgradeFrom): no son
        // equipo, quedan como categoría genérica.
        return 'other'
      }

      return null
    }
  
    return null
  }

// ---------------------------------------------------------------------------
// Parseo de un bloque <craftingrequirements> a OutputRecipeTier (sin upgrade)
// ---------------------------------------------------------------------------

function parseIngredients(req: RawCraftingRequirements): OutputIngredient[] {
  const resources = toArray(req.craftresource)
  return resources
    .filter((r) => !isEventOrFactionResource(r['@_uniquename']))
    .map((r) => ({
      itemId: r['@_uniquename'],
      enchantment: r['@_enchantmentlevel'] ? Number(r['@_enchantmentlevel']) : 0,
      quantity: Number(r['@_count']),
    }))
}

function parseRecipeOption(req: RawCraftingRequirements): OutputRecipeOption {
  return {
    ingredients: parseIngredients(req),
    outputQuantity: req['@_amountcrafted'] ? Number(req['@_amountcrafted']) : 1,
    silverFee: req['@_silver'] ? Number(req['@_silver']) : 0,
    craftingFocus: req['@_craftingfocus'] ? Number(req['@_craftingfocus']) : 0,
  }
}

function buildRecipeTier(
  enchantment: number,
  station: string,
  requirements: readonly RawCraftingRequirements[],
  upgradeFrom: OutputUpgradeRequirement | null,
): OutputRecipeTier | null {
  const options = requirements.map(parseRecipeOption)
  const primary = options[0]
  if (!primary) return null

  return {
    enchantment,
    station,
    ...primary,
    alternatives: options.length > 1 ? options.slice(1) : undefined,
    upgradeFrom,
  }
}

function parseUpgradeFrom(upgradeReq: RawUpgradeRequirements | undefined): OutputUpgradeRequirement | null {
  if (!upgradeReq) return null
  const resources = toArray(upgradeReq.upgraderesource)
  const first = resources[0]
  if (!first) return null
  return {
    itemId: first['@_uniquename'],
    quantity: Number(first['@_count']),
  }
}

// ---------------------------------------------------------------------------
// Parseo de un nodo de ítem completo (weapon | equipmentitem | simpleitem)
// ---------------------------------------------------------------------------

function parseItemNode(
    tagName: string,
    node: RawItemNode,
    localizationMap: Map<string, string>,
  ): OutputItem | null {
    const id = node['@_uniquename']
    // Excluir variantes @1-@4 explícitas si existieran como nodos propios
    // (no debería pasar según lo investigado, pero por seguridad las saltamos).
    if (id.includes('@')) return null
    // Excluir ítems de debug/desarrollo (ej. T4_DEBUG_ARMOR_HIDDEN): no son
    // contenido real, y su nombre localizado tampoco existe.
    if (isDebugItem(id)) return null
  
    const tier = node['@_tier'] ? Number(node['@_tier']) : 0
    const shopCategory = node['@_shopcategory']
    const shopSubcategory1 = node['@_shopsubcategory1']
    const category = isRoyalSigil(id)
      ? 'other'
      : mapCategory(tagName, shopCategory, shopSubcategory1)
    if (category === null) return null // Fuera de alcance: gathering, vanity, etc.
  
    const station = inferStation(shopSubcategory1)

  const tiers: OutputRecipeTier[] = []
  const baseTier = buildRecipeTier(
    0,
    station,
    toArray(node.craftingrequirements),
    null,
  )

  if (baseTier) tiers.push(baseTier)

  const enchantmentNodes = toArray(node.enchantments?.enchantment)
  for (const ench of enchantmentNodes) {
    const enchantmentTier = buildRecipeTier(
      Number(ench['@_enchantmentlevel']),
      station,
      toArray(ench.craftingrequirements),
      parseUpgradeFrom(ench.upgraderequirements),
    )

    if (enchantmentTier) tiers.push(enchantmentTier)
  }

  // Ítems sin ninguna receta (recursos crudos farmeables, ej. T4_ORE) son
  // válidos igual: quedan con recipe: null, pero SÍ se incluyen en el
  // dataset porque son ingredientes de otras recetas.
  // Los Sellos Reales se tratan como componentes comprables dentro de
  // esta calculadora. Aunque el juego permita transmutarlos, mantenerlos
  // como hoja evita mezclar ese sistema con el costo de equipo real.
  const recipe = isRoyalSigil(id)
    ? null
    : tiers.length > 0
      ? { tiers }
      : null
  const maxEnchantment = tiers.length > 0 ? Math.max(...tiers.map((t) => t.enchantment)) : 0

  return {
    id,
    name: resolveItemName(id, localizationMap),
    tier,
    category,
    maxEnchantment,
    recipe,
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    console.log('Descargando items.xml desde ao-data/ao-bin-dumps...')
    const xmlResponse = await fetch(ITEMS_XML_URL)
    if (!xmlResponse.ok) {
      throw new Error(`No se pudo descargar items.xml: ${xmlResponse.status} ${xmlResponse.statusText}`)
    }
    const xml = await xmlResponse.text()
    console.log(`Descargado (${(xml.length / 1024 / 1024).toFixed(1)} MB). Parseando...`)
  
    console.log('Descargando nombres localizados (items.json)...')
    const localizationResponse = await fetch(ITEMS_LOCALIZATION_URL)
    if (!localizationResponse.ok) {
      throw new Error(
        `No se pudo descargar items.json: ${localizationResponse.status} ${localizationResponse.statusText}`,
      )
    }
    const localizationEntries: RawLocalizationEntry[] = await localizationResponse.json()
    const localizationMap = buildLocalizationMap(localizationEntries)
    console.log(`Mapa de nombres construido (${localizationMap.size} entradas).`)
  
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const parsed = parser.parse(xml)
  
    const relevantTags = ['weapon', 'equipmentitem', 'simpleitem'] as const
    const items: OutputItem[] = []
  
    for (const tagName of relevantTags) {
      const nodes = toArray<RawItemNode>(parsed.items[tagName])
      console.log(`Procesando ${nodes.length} nodos <${tagName}>...`)
      for (const node of nodes) {
        const item = parseItemNode(tagName, node, localizationMap)
        if (item) items.push(item)
      }
    }

  // Filtrar a las categorías en alcance: weapon, armor, accessory, resource, refined_resource
  console.log(`Total de ítems en alcance: ${items.length}`)

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(items, null, 2), 'utf-8')
  console.log(`Dataset escrito en ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error('Error generando el dataset:', error)
  process.exit(1)
})