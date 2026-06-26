import { useMemo, useState } from 'react'
import type { Item } from '@core/domain/entities/Item'
import type { CraftingStation } from '@core/domain/entities/Recipe'
import {
  calculateJournalProgress,
  calculateSpecializationProjection,
  calculateStudyFame,
  getCraftingJournalProfile,
  getCraftingJournalProfilesForTier,
  inferSpecializationCurve,
} from '@core/usecases/calculateCraftingProgress'
import type { CraftingJournalProfile } from '@core/usecases/calculateCraftingProgress'
import type { CraftingFameBreakdown } from '@core/usecases/calculateCraftingFame'
import { InfoHint } from '@shared/components/InfoHint'
import { CraftingJournalSelector } from './CraftingJournalSelector'
import { SpecializationExampleHint } from './SpecializationExampleHint'

interface CraftingProgressCardProps {
  readonly item: Item
  readonly station: CraftingStation
  readonly fame: CraftingFameBreakdown
}

const numberFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 2,
})

const integerFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
})

function formatFame(value: number): string {
  return numberFormatter.format(value)
}

function formatInteger(value: number): string {
  return integerFormatter.format(value)
}

function parseNonNegativeInteger(rawValue: string): number {
  const value = Number(rawValue)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function parseNonNegativeNumber(rawValue: string): number {
  const value = Number(rawValue.replace(',', '.'))
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

interface ProgressBarProps {
  readonly value: number
  readonly label: string
}

function ProgressBar({ value, label }: ProgressBarProps) {
  const normalizedValue = Math.min(1, Math.max(0, value))

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-text-faint">
        <span>{label}</span>
        <span className="font-mono tabular-nums">
          {formatInteger(normalizedValue * 100)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${normalizedValue * 100}%` }}
        />
      </div>
    </div>
  )
}

interface MetricProps {
  readonly label: string
  readonly value: string
  readonly accent?: boolean
}

function Metric({ label, value, accent = false }: MetricProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <span className="text-[10px] uppercase tracking-wide text-text-faint">
        {label}
      </span>
      <p
        className={`mt-1 font-mono text-sm font-semibold tabular-nums ${
          accent ? 'text-accent' : 'text-text'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

export function CraftingProgressCard({
  item,
  station,
  fame,
}: CraftingProgressCardProps) {
  const canStudy = ['weapon', 'armor', 'offhand', 'accessory'].includes(
    item.category,
  )
  const detectedCurve = useMemo(
    () => inferSpecializationCurve(item),
    [item],
  )
  const automaticJournalProfile = useMemo(
    () => getCraftingJournalProfile(item, station),
    [item, station],
  )
  const availableJournalProfiles = useMemo(
    () => getCraftingJournalProfilesForTier(item.tier),
    [item.tier],
  )
  const [journalProfileOverride, setJournalProfileOverride] =
    useState<CraftingJournalProfile | null>(null)
  const selectedJournalProfile =
    journalProfileOverride ?? automaticJournalProfile
  const [itemsStudiedOverride, setItemsStudiedOverride] = useState<
    number | null
  >(null)
  const itemsStudied = canStudy
    ? Math.min(
        fame.producedQuantity,
        itemsStudiedOverride ?? fame.producedQuantity,
      )
    : 0
  const [initialJournalFame, setInitialJournalFame] = useState(0)
  const [currentLevel, setCurrentLevel] = useState(0)
  const [currentLevelProgress, setCurrentLevelProgress] = useState(0)
  const [targetLevel, setTargetLevel] = useState(100)
  const [firstLevelFame, setFirstLevelFame] = useState(
    detectedCurve?.firstLevelFame ?? 14424,
  )

  const study = useMemo(
    () => calculateStudyFame(fame, canStudy ? itemsStudied : 0),
    [canStudy, fame, itemsStudied],
  )

  const effectiveInitialJournalFame = selectedJournalProfile
    ? Math.min(
        initialJournalFame,
        Math.max(0, selectedJournalProfile.capacity - 1),
      )
    : 0

  const journal = useMemo(
    () =>
      calculateJournalProgress({
        item,
        station,
        gainedFame: fame.journalFame,
        initialFame: effectiveInitialJournalFame,
        profile: selectedJournalProfile,
      }),
    [
      effectiveInitialJournalFame,
      fame.journalFame,
      item,
      selectedJournalProfile,
      station,
    ],
  )

  const projection = useMemo(
    () =>
      detectedCurve
        ? calculateSpecializationProjection({
            firstLevelFame,
            currentLevel,
            currentLevelProgressFame: currentLevelProgress,
            targetLevel,
            gainedFame: study.combinedCraftAndStudyFame,
          })
        : null,
    [
      currentLevel,
      currentLevelProgress,
      detectedCurve,
      firstLevelFame,
      study.combinedCraftAndStudyFame,
      targetLevel,
    ],
  )

  const effectiveTargetLevel = Math.max(currentLevel, targetLevel)

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-text">
              Progreso de crafteo
            </h3>
            <InfoHint
              label="Qué incluye esta proyección"
              text="La especialización suma la fama de fabricar y la fama de estudiar. Los diarios solo reciben la fama base de fabricación: Premium y estudio no los llenan. No se aplican Puntos de Aprendizaje ni bonos temporales."
              align="left"
            />
          </div>
          <p className="mt-1 text-xs text-text-faint">
            Estudio, diarios compatibles y avance estimado del nodo de
            especialización.
          </p>
        </div>

        <span className="w-fit rounded-full border border-accent-border bg-accent-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Fórmulas verificadas
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface p-4">
          <div>
            <h4 className="text-sm font-semibold text-text">
              Estudiar y destruir
            </h4>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-negative">
              Los objetos que estudies se destruyen permanentemente.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
              Estudiar entrega 275% de la fama base del objeto. Premium añade
              50% también a esa fama.
            </p>
          </div>

          {canStudy ? (
            <>
              <label className="mt-4 block">
                <span className="text-xs text-text-faint">
                  Objetos del lote que estudiarás
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={fame.producedQuantity}
                    step={1}
                    value={itemsStudied}
                    onChange={(event) =>
                      setItemsStudiedOverride(
                        Math.min(
                          fame.producedQuantity,
                          parseNonNegativeInteger(event.target.value),
                        ),
                      )
                    }
                    className="w-28 rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                  />
                  <span className="text-xs text-text-faint">
                    de {formatInteger(fame.producedQuantity)} producidos
                  </span>
                </div>
              </label>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Metric
                  label="Estudio por objeto"
                  value={`${formatFame(
                    study.famePerStudiedItemBeforePremium *
                      (fame.isPremium ? 1.5 : 1),
                  )} fama`}
                />
                <Metric
                  label="Fama total por estudio"
                  value={formatFame(study.totalStudyFame)}
                  accent
                />
                <Metric
                  label="Fama por fabricar"
                  value={formatFame(fame.totalFame)}
                />
                <Metric
                  label="Fabricar + estudiar"
                  value={formatFame(study.combinedCraftAndStudyFame)}
                  accent
                />
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-text-faint">
                Multiplicador del estudio:{' '}
                {fame.isPremium ? '412,5% con Premium' : '275% sin Premium'}.
                La fama de fabricar se suma aparte.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-border bg-surface-raised p-3 text-xs leading-relaxed text-text-faint">
              Esta proyección de estudio está limitada a equipamiento. No se
              aplica automáticamente a recursos refinados, consumibles ni
              componentes.
            </p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-surface p-4">
          <div>
            <h4 className="text-sm font-semibold text-text">
              Diarios completados
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
              Supone que llevas suficientes diarios vacíos del mismo tier y
              profesión.
            </p>
          </div>

          {journal &&
          automaticJournalProfile &&
          selectedJournalProfile ? (
            <>
              <CraftingJournalSelector
                profiles={availableJournalProfiles}
                selectedProfile={selectedJournalProfile}
                automaticProfile={automaticJournalProfile}
                isAutomatic={journalProfileOverride === null}
                onSelect={setJournalProfileOverride}
                onResetAutomatic={() => setJournalProfileOverride(null)}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-faint">
                    Resultado con este lote
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    Usando {journal.profile.name.toLocaleLowerCase('es-CL')} T
                    {journal.profile.tier} vacío
                  </p>
                </div>
                <span className="rounded-md bg-positive-muted px-2 py-1 font-mono text-xs font-semibold tabular-nums text-positive">
                  {formatInteger(journal.completedJournals)} completos
                </span>
              </div>

              <label className="mt-3 block">
                <span className="text-xs text-text-faint">
                  Fama ya cargada en el primer diario
                </span>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, journal.profile.capacity - 1)}
                  step={1}
                  value={effectiveInitialJournalFame}
                  onChange={(event) =>
                    setInitialJournalFame(
                      Math.min(
                        Math.max(0, journal.profile.capacity - 1),
                        parseNonNegativeNumber(event.target.value),
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Metric
                  label="Fama que llena diarios"
                  value={formatFame(journal.gainedFame)}
                />
                <Metric
                  label="Sobrante en el siguiente"
                  value={`${formatFame(journal.remainingFame)} / ${formatFame(
                    journal.profile.capacity,
                  )}`}
                />
              </div>

              <div className="mt-3">
                <ProgressBar
                  value={journal.nextJournalProgressRate}
                  label="Progreso del próximo diario"
                />
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-text-faint">
                Solo se usa la fama base de fabricación ({formatFame(
                  fame.journalFame,
                )}). Premium y estudio no cuentan para llenar diarios.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-border bg-surface-raised p-3 text-xs leading-relaxed text-text-faint">
              Esta receta no llena un diario de fabricación compatible. El
              refinamiento, la cocina, la alquimia y otras estaciones fuera de
              las cuatro profesiones de trabajadores quedan excluidas.
            </p>
          )}
        </article>
      </div>

      <article className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-text">
              Proyección de especialización
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-text-faint">
              Usa los 100 requerimientos de fama de la especialización individual
              del objeto seleccionado.
            </p>
          </div>

          {detectedCurve && (
            <span className="w-fit rounded-md border border-border bg-surface-raised px-2 py-1 text-[10px] text-text-muted">
              Curva: {detectedCurve.label}
            </span>
          )}
        </div>

        {projection && detectedCurve ? (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="flex items-center gap-1 text-xs text-text-faint">
                  Nivel actual
                  <SpecializationExampleHint target="current-level" />
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={currentLevel}
                  onChange={(event) => {
                    const nextLevel = Math.min(
                      100,
                      parseNonNegativeInteger(event.target.value),
                    )
                    setCurrentLevel(nextLevel)
                    setTargetLevel((currentTarget) =>
                      Math.max(nextLevel, currentTarget),
                    )
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>

              <label>
                <span className="flex items-center gap-1 text-xs text-text-faint">
                  Progreso dentro del nivel
                  <SpecializationExampleHint target="level-progress" />
                </span>
                <input
                  type="number"
                  min={0}
                  max={projection.currentLevelRequirement}
                  step={1}
                  value={currentLevelProgress}
                  disabled={currentLevel >= 100}
                  onChange={(event) =>
                    setCurrentLevelProgress(
                      Math.min(
                        projection.currentLevelRequirement,
                        parseNonNegativeNumber(event.target.value),
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular-nums text-text outline-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent-border"
                />
                <span className="mt-1 flex items-center gap-1 text-[10px] text-text-faint">
                  Requerido para subir: {formatFame(
                    projection.currentLevelRequirement,
                  )}
                  <SpecializationExampleHint
                    target="level-requirement"
                    align="center"
                  />
                </span>
              </label>

              <label>
                <span className="text-xs text-text-faint">Nivel objetivo</span>
                <input
                  type="number"
                  min={currentLevel}
                  max={100}
                  step={1}
                  value={effectiveTargetLevel}
                  onChange={(event) =>
                    setTargetLevel(
                      Math.min(
                        100,
                        Math.max(
                          currentLevel,
                          parseNonNegativeInteger(event.target.value),
                        ),
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
              </label>

              <label>
                <span className="flex items-center gap-1 text-xs text-text-faint">
                  Fama requerida 0 → 1
                  <InfoHint
                    label="Curva editable"
                    text="Las especializaciones individuales verificadas usan 14.424 de fama para 0 → 1. El campo queda editable para corregir un cambio futuro del Destiny Board sin bloquear la proyección."
                    align="left"
                  />
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={firstLevelFame}
                  onChange={(event) =>
                    setFirstLevelFame(
                      Math.max(1, parseNonNegativeNumber(event.target.value)),
                    )
                  }
                  className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-right text-sm tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                />
                <span className="mt-1 block text-[10px] text-text-faint">
                  Detectado: {formatFame(detectedCurve.firstLevelFame)}
                </span>
              </label>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Fama aplicada en este lote"
                value={formatFame(projection.gainedFame)}
                accent
              />
              <Metric
                label="Nivel proyectado"
                value={
                  projection.projectedLevel >= 100
                    ? '100 / 100'
                    : `${projection.projectedLevel} + ${formatFame(
                        projection.projectedLevelProgressFame,
                      )}`
                }
                accent
              />
              <Metric
                label={`Fama restante a nivel ${projection.targetLevel}`}
                value={formatFame(projection.fameToTargetAfter)}
              />
              <Metric
                label="Lotes iguales necesarios"
                value={
                  projection.equivalentBatchesToTarget === null
                    ? '—'
                    : formatInteger(projection.equivalentBatchesToTarget)
                }
              />
            </div>

            <div className="mt-4 rounded-lg border border-border bg-surface-raised p-3">
              <ProgressBar
                value={projection.projectedLevelProgressRate}
                label={
                  projection.projectedLevel >= 100
                    ? 'Especialización máxima'
                    : `Progreso proyectado del nivel ${projection.projectedLevel} → ${projection.projectedLevel + 1}`
                }
              />

              <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] text-text-faint">
                <span>
                  Antes del lote faltaban{' '}
                  {formatFame(projection.fameToTargetBefore)} de fama
                </span>
                <span>
                  Total 0 → 100: {formatFame(projection.totalFameToLevel100)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-text-faint">
              La proyección usa fabricar + estudiar según la cantidad indicada
              arriba. No incluye Puntos de Aprendizaje, Quick Learn, bonos
              temporales de fama ni estudio con foco.
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-lg border border-border bg-surface-raised p-3 text-xs leading-relaxed text-text-faint">
            La especialización de crafteo se proyecta para equipamiento T4 o
            superior. Esta receta no tiene un nodo compatible detectado.
          </p>
        )}
      </article>
    </section>
  )
}
