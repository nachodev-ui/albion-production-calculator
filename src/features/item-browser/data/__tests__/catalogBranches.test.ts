import { describe, expect, it } from 'vitest'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import {
  buildCategoryCraftingCatalog,
  isGroupedCraftingItem,
  type BranchCategory,
} from '../craftingBranches'

const repository = new JsonItemRepository()

function build(category: BranchCategory) {
  return buildCategoryCraftingCatalog(category, repository.getAll(category))
}

function getBranch(category: BranchCategory, id: string) {
  const branch = build(category).branches.find((candidate) => candidate.id === id)
  if (!branch) throw new Error(`No se encontró la rama ${id}`)
  return branch
}

function expectUniqueItems(category: BranchCategory) {
  const ids = build(category).branches.flatMap((branch) =>
    branch.families.flatMap((family) => family.items.map((item) => item.id)),
  )

  expect(new Set(ids).size).toBe(ids.length)
}

describe('ramas de armas', () => {
  it('agrupa todo el equipamiento reconocido en 20 ramas', () => {
    const catalog = build('weapon')

    expect(catalog.branches).toHaveLength(20)
    expect(catalog.itemCount).toBe(664)
    expectUniqueItems('weapon')
  })

  it('separa T2 y T3 de las especializaciones T4 a T8', () => {
    expect(getBranch('weapon', 'weapon_trainee_crafter').itemCount).toBe(3)
    expect(getBranch('weapon', 'weapon_journeyman_warrior_forge').itemCount).toBe(6)
    expect(getBranch('weapon', 'weapon_journeyman_hunter_lodge').itemCount).toBe(5)
    expect(getBranch('weapon', 'weapon_journeyman_mage_tower').itemCount).toBe(5)
  })

  it('agrupa Sword Crafter en ocho familias completas', () => {
    const swords = getBranch('weapon', 'weapon_sword')

    expect(swords.itemCount).toBe(40)
    expect(swords.families).toHaveLength(8)
    expect(
      swords.families.every(
        (family) => family.items.map((item) => item.tier).join(',') === '4,5,6,7,8',
      ),
    ).toBe(true)
  })

  it('mantiene los artefactos de armas fuera de la navegación principal', () => {
    const catalog = build('weapon')
    const ids = catalog.branches.flatMap((branch) =>
      branch.families.flatMap((family) => family.items.map((item) => item.id)),
    )
    const artifact = repository
      .getAll('weapon')
      .find((item) => item.id.startsWith('T4_ARTEFACT_'))

    expect(ids.some((id) => id.includes('ARTEFACT_'))).toBe(false)
    expect(artifact ? isGroupedCraftingItem('weapon', artifact) : true).toBe(false)
  })
})

describe('ramas de offhands', () => {
  it('crea introducción, escudos, libros y antorchas sin duplicados', () => {
    const catalog = build('offhand')

    expect(catalog.branches).toHaveLength(5)
    expect(catalog.itemCount).toBe(95)
    expectUniqueItems('offhand')
  })

  it.each([
    ['offhand_shield', 6],
    ['offhand_tome', 6],
    ['offhand_torch', 6],
  ])('agrupa %s en %i familias T4 a T8', (branchId, familyCount) => {
    const branch = getBranch('offhand', branchId)

    expect(branch.itemCount).toBe(30)
    expect(branch.families).toHaveLength(familyCount)
    expect(
      branch.families.every(
        (family) => family.items.map((item) => item.tier).join(',') === '4,5,6,7,8',
      ),
    ).toBe(true)
  })
})

describe('ramas de accesorios', () => {
  it('organiza bolsas, capas, insignias y decorativos en ocho ramas', () => {
    const catalog = build('accessory')

    expect(catalog.branches).toHaveLength(8)
    expect(catalog.itemCount).toBe(123)
    expectUniqueItems('accessory')
  })

  it('agrupa las siete capas de ciudad con sus cinco tiers', () => {
    const cityCapes = getBranch('accessory', 'accessory_city_cape')

    expect(cityCapes.itemCount).toBe(35)
    expect(cityCapes.families).toHaveLength(7)
    expect(
      cityCapes.families.every(
        (family) => family.items.map((item) => item.tier).join(',') === '4,5,6,7,8',
      ),
    ).toBe(true)
  })

  it('mantiene las nueve capas decorativas T6 como familias individuales', () => {
    const decorative = getBranch('accessory', 'accessory_decorative_cape')

    expect(decorative.itemCount).toBe(9)
    expect(decorative.families).toHaveLength(9)
    expect(decorative.families.every((family) => family.items[0]?.tier === 6)).toBe(true)
  })
})
