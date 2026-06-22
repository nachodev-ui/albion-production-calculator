import { describe, expect, it } from 'vitest'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'
import { buildArmorCraftingBranches } from '../craftingBranches'

const repository = new JsonItemRepository()
const branches = buildArmorCraftingBranches(repository.getAll('armor'))

function getBranch(id: (typeof branches)[number]['id']) {
  const branch = branches.find((candidate) => candidate.id === id)
  if (!branch) throw new Error(`No se encontró la rama ${id}`)
  return branch
}

describe('buildArmorCraftingBranches', () => {
  it('construye las 13 ramas previstas para armaduras', () => {
    expect(branches).toHaveLength(13)
    expect(branches.reduce((sum, branch) => sum + branch.itemCount, 0)).toBe(423)
  })

  it('agrupa los nueve objetos T2 dentro de Trainee Crafter', () => {
    const trainee = getBranch('trainee_crafter')

    expect(trainee.itemCount).toBe(9)
    expect(trainee.families).toHaveLength(9)
    expect(trainee.families.every((family) => family.items[0]?.tier === 2)).toBe(true)
  })

  it('separa los nodos T3 por estación de producción', () => {
    expect(getBranch('journeyman_warrior_forge').itemCount).toBe(3)
    expect(getBranch('journeyman_hunter_lodge').itemCount).toBe(3)
    expect(getBranch('journeyman_mage_tower').itemCount).toBe(3)
  })

  it('agrupa Plate Helmet Crafter en nueve familias T4 a T8', () => {
    const branch = getBranch('plate_head')

    expect(branch.itemCount).toBe(45)
    expect(branch.families).toHaveLength(9)
    expect(branch.families.every((family) => family.items.map((item) => item.tier).join(',') === '4,5,6,7,8')).toBe(true)
  })

  it('normaliza la familia del casco de soldado sin el rango del tier', () => {
    const soldierHelmet = getBranch('plate_head').families.find(
      (family) => family.id === 'HEAD_PLATE_SET1',
    )

    expect(soldierHelmet?.name).toBe('Casco de soldado')
    expect(soldierHelmet?.items.map((item) => item.id)).toEqual([
      'T4_HEAD_PLATE_SET1',
      'T5_HEAD_PLATE_SET1',
      'T6_HEAD_PLATE_SET1',
      'T7_HEAD_PLATE_SET1',
      'T8_HEAD_PLATE_SET1',
    ])
  })

  it('excluye prototipos internos y no duplica objetos entre ramas', () => {
    const ids = branches.flatMap((branch) =>
      branch.families.flatMap((family) => family.items.map((item) => item.id)),
    )

    expect(ids.some((id) => id.includes('PROTOTYPE'))).toBe(false)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
