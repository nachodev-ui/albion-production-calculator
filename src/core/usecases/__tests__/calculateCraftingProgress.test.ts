import { describe, expect, it } from 'vitest'
import { asBaseItemId } from '@core/domain/entities/Item'
import {
  BASE_CRAFTING_SPECIALIZATION_FAME_CURVE,
  calculateJournalProgress,
  calculateSpecializationProjection,
  calculateStudyFame,
  getCraftingJournalProfile,
  getCraftingJournalProfileByKind,
  getCraftingJournalProfilesForTier,
  inferSpecializationCurve,
} from '@core/usecases/calculateCraftingProgress'
import type { CraftingFameBreakdown } from '@core/usecases/calculateCraftingFame'
import { JsonItemRepository } from '@data/repositories/JsonItemRepository'

const repository = new JsonItemRepository()

function createFame(
  overrides: Partial<CraftingFameBreakdown> = {},
): CraftingFameBreakdown {
  return {
    famePerFinalItem: 360,
    requestedQuantity: 1,
    craftsNeeded: 1,
    producedQuantity: 1,
    baseFame: 360,
    premiumBonus: 0,
    totalFame: 360,
    journalFame: 360,
    isPremium: false,
    ...overrides,
  }
}

describe('calculateStudyFame', () => {
  it('aplica 275% al estudiar y suma la fama de fabricación', () => {
    const result = calculateStudyFame(createFame(), 1)

    expect(result.famePerStudiedItemBeforePremium).toBe(990)
    expect(result.totalStudyFame).toBe(990)
    expect(result.combinedCraftAndStudyFame).toBe(1350)
  })

  it('aplica Premium también a la fama de estudio', () => {
    const result = calculateStudyFame(
      createFame({
        premiumBonus: 180,
        totalFame: 540,
        isPremium: true,
      }),
      1,
    )

    expect(result.baseStudyFame).toBe(990)
    expect(result.premiumStudyBonus).toBe(495)
    expect(result.totalStudyFame).toBe(1485)
    expect(result.combinedCraftAndStudyFame).toBe(2025)
  })

  it('limita los objetos estudiados a la producción real', () => {
    const result = calculateStudyFame(
      createFame({ producedQuantity: 3 }),
      99,
    )

    expect(result.itemsStudied).toBe(3)
  })
})

describe('calculateJournalProgress', () => {
  it('calcula diarios T4 exactos y conserva el sobrante', () => {
    const item = repository.getById(asBaseItemId('T4_ARMOR_CLOTH_SET1'))
    expect(item).toBeTruthy()

    const result = calculateJournalProgress({
      item: item!,
      station: 'mage_tower',
      initialFame: 1000,
      gainedFame: 3600,
    })

    expect(result?.profile.name).toBe('Diario de imbuídor')
    expect(result?.profile.capacity).toBe(3600)
    expect(result?.completedJournals).toBe(1)
    expect(result?.remainingFame).toBe(1000)
  })

  it('no ofrece diario de fabricación para refinamiento', () => {
    const item = repository.getById(asBaseItemId('T4_CLOTH'))
    expect(item).toBeTruthy()

    const result = calculateJournalProgress({
      item: item!,
      station: 'refining',
      gainedFame: 10000,
    })

    expect(result).toBeNull()
  })

  it('genera únicamente perfiles vacíos de crafteo para el tier', () => {
    const profiles = getCraftingJournalProfilesForTier(4)

    expect(profiles).toHaveLength(4)
    expect(profiles.map((profile) => profile.emptyItemId)).toEqual([
      'T4_JOURNAL_WARRIOR_EMPTY',
      'T4_JOURNAL_HUNTER_EMPTY',
      'T4_JOURNAL_MAGE_EMPTY',
      'T4_JOURNAL_TOOLMAKER_EMPTY',
    ])
  })

  it('autoselecciona el diario vacío compatible con el objeto', () => {
    const item = repository.getById(asBaseItemId('T4_ARMOR_CLOTH_SET1'))
    expect(item).toBeTruthy()

    const profile = getCraftingJournalProfile(item!, 'mage_tower')

    expect(profile?.kind).toBe('imbuer')
    expect(profile?.tier).toBe(4)
    expect(profile?.emptyItemId).toBe('T4_JOURNAL_MAGE_EMPTY')
  })

  it('permite corregir manualmente la profesión sin cambiar el tier', () => {
    const item = repository.getById(asBaseItemId('T4_ARMOR_CLOTH_SET1'))
    const manualProfile = getCraftingJournalProfileByKind('fletcher', 4)
    expect(item).toBeTruthy()
    expect(manualProfile).toBeTruthy()

    const result = calculateJournalProgress({
      item: item!,
      station: 'mage_tower',
      gainedFame: 3600,
      profile: manualProfile,
    })

    expect(result?.profile.kind).toBe('fletcher')
    expect(result?.completedJournals).toBe(1)
  })

  it('rechaza una selección manual de tier distinto al objeto', () => {
    const item = repository.getById(asBaseItemId('T4_ARMOR_CLOTH_SET1'))
    const invalidProfile = getCraftingJournalProfileByKind('imbuer', 5)
    expect(item).toBeTruthy()
    expect(invalidProfile).toBeTruthy()

    const result = calculateJournalProgress({
      item: item!,
      station: 'mage_tower',
      gainedFame: 7200,
      profile: invalidProfile,
    })

    expect(result).toBeNull()
  })
})

describe('specialization projection', () => {
  it('conserva la curva exacta de 100 niveles', () => {
    expect(BASE_CRAFTING_SPECIALIZATION_FAME_CURVE).toHaveLength(100)
    expect(BASE_CRAFTING_SPECIALIZATION_FAME_CURVE[0]).toBe(14424)
    expect(
      BASE_CRAFTING_SPECIALIZATION_FAME_CURVE.reduce(
        (total, value) => total + value,
        0,
      ),
    ).toBe(12879472)
  })

  it('usa la misma curva individual para arma normal y artefacto', () => {
    const axe = repository.getById(asBaseItemId('T4_MAIN_AXE'))
    const feyRobe = repository.getById(
      asBaseItemId('T4_ARMOR_CLOTH_FEY'),
    )

    expect(axe && inferSpecializationCurve(axe)?.firstLevelFame).toBe(14424)
    expect(feyRobe && inferSpecializationCurve(feyRobe)?.firstLevelFame).toBe(
      14424,
    )
  })

  it('proyecta nivel y fama restante usando progreso parcial', () => {
    const result = calculateSpecializationProjection({
      firstLevelFame: 14424,
      currentLevel: 0,
      currentLevelProgressFame: 1000,
      targetLevel: 2,
      gainedFame: 14000,
    })

    expect(result.projectedLevel).toBe(1)
    expect(result.projectedLevelProgressFame).toBe(576)
    expect(result.fameToTargetBefore).toBe(28358)
    expect(result.fameToTargetAfter).toBe(14358)
    expect(result.equivalentBatchesToTarget).toBe(3)
  })

  it('permite escalar manualmente la curva para una excepción futura', () => {
    const result = calculateSpecializationProjection({
      firstLevelFame: 28848,
      currentLevel: 0,
      targetLevel: 1,
      gainedFame: 28848,
    })

    expect(result.projectedLevel).toBe(1)
    expect(result.totalFameToLevel100).toBe(25758944)
  })
})
