import { useState } from 'react'
import { CITIES } from '@core/domain/entities/City'
import { useCraftPresetStore } from '@features/craft-calculator/store/craftPresetStore'
import { applyPresetProductionConfig } from '@features/craft-calculator/store/craftPresetStorage'
import { useCraftTreeStore } from '@features/craft-calculator/store/craftTreeStore'
import { ArrowRightIcon, PresetIcon } from '../../../app/AppIcons'

interface PresetLibraryPageProps {
  readonly onOpenCrafting: () => void
}

function yesNo(value: boolean): string {
  return value ? 'Sí' : 'No'
}

export function PresetLibraryPage({ onOpenCrafting }: PresetLibraryPageProps) {
  const presets = useCraftPresetStore((state) => state.presets)
  const defaultPresetId = useCraftPresetStore((state) => state.defaultPresetId)
  const setDefaultPreset = useCraftPresetStore((state) => state.setDefaultPreset)
  const deletePreset = useCraftPresetStore((state) => state.deletePreset)
  const setActivePreset = useCraftPresetStore((state) => state.setActivePreset)
  const productionConfig = useCraftTreeStore((state) => state.productionConfig)
  const setProductionConfig = useCraftTreeStore((state) => state.setProductionConfig)
  const setIsPremium = useCraftTreeStore((state) => state.setIsPremium)
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null)

  function openPresetInCrafting(presetId: string) {
    const preset = presets.find((candidate) => candidate.id === presetId)
    if (!preset) return

    setProductionConfig(
      applyPresetProductionConfig(productionConfig, preset.productionConfig),
    )
    setIsPremium(preset.isPremium)
    setActivePreset(presetId)
    onOpenCrafting()
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-14 pt-2 sm:px-6">
      {presets.length === 0 ? (
        <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/62 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-border bg-accent-muted text-accent">
            <PresetIcon className="h-7 w-7" />
          </span>
          <h3 className="mt-5 font-display text-2xl text-text">Aún no tienes presets guardados</h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-muted">
            Crea un preset desde la configuración de producción para guardar ciudad, foco, bono diario y estado Premium.
          </p>
          <button
            type="button"
            onClick={onOpenCrafting}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
          >
            Ir a Crafteo
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </section>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-surface/72 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-text">
                {presets.length} preset{presets.length === 1 ? '' : 's'} guardado{presets.length === 1 ? '' : 's'}
              </p>
              <p className="mt-0.5 text-xs text-text-faint">
                Se almacenan únicamente en este navegador.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCrafting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-text-muted hover:border-border-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            >
              Crear o editar en Crafteo
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presets.map((preset) => {
              const city = CITIES.find((candidate) => candidate.id === preset.productionConfig.cityId)
              const isDefault = preset.id === defaultPresetId
              const isConfirmingDelete = deleteConfirmationId === preset.id

              return (
                <article
                  key={preset.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-surface/86 p-5 transition-colors hover:border-border-strong"
                >
                  {isDefault && (
                    <span className="absolute right-4 top-4 rounded-full border border-accent-border bg-accent-muted px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent">
                      Predeterminado
                    </span>
                  )}

                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-raised text-accent">
                    <PresetIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 pr-24 text-base font-semibold text-text">{preset.name}</h3>
                  <p className="mt-1 text-xs text-text-faint">
                    {city?.name ?? preset.productionConfig.cityId}
                  </p>

                  <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-4 text-xs">
                    <div>
                      <dt className="text-text-faint">Especialidad</dt>
                      <dd className="mt-0.5 text-text">{yesNo(preset.productionConfig.hasSpecialtyBonus)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-faint">Foco</dt>
                      <dd className="mt-0.5 text-text">{yesNo(preset.productionConfig.useFocus)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-faint">Bono diario</dt>
                      <dd className="mt-0.5 text-text">
                        {preset.productionConfig.hasDailyBonus
                          ? `+${preset.productionConfig.dailyBonusAmount * 100}%`
                          : 'No'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-faint">Premium</dt>
                      <dd className="mt-0.5 text-text">{yesNo(preset.isPremium)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openPresetInCrafting(preset.id)}
                      className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                    >
                      Usar en Crafteo
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultPreset(isDefault ? null : preset.id)}
                      className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-muted hover:border-border-strong hover:text-text"
                    >
                      {isDefault ? 'Quitar predeterminado' : 'Predeterminado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isConfirmingDelete) {
                          deletePreset(preset.id)
                          setDeleteConfirmationId(null)
                        } else {
                          setDeleteConfirmationId(preset.id)
                        }
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        isConfirmingDelete
                          ? 'border-negative bg-negative-muted text-negative'
                          : 'border-border bg-surface-raised text-text-faint hover:border-negative/50 hover:text-negative'
                      }`}
                    >
                      {isConfirmingDelete ? 'Confirmar eliminación' : 'Eliminar'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
