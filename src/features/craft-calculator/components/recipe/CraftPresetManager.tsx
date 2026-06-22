import { useMemo, useState } from 'react'
import type { NodeReturnRateConfig } from '@core/domain/entities/CraftCostNode'
import { InfoHint } from '@shared/components/InfoHint'
import { useCraftPresetStore } from '../../store/craftPresetStore'
import {
  applyPresetProductionConfig,
  doesPresetMatchCurrentConfig,
} from '../../store/craftPresetStorage'

interface CraftPresetManagerProps {
  readonly config: NodeReturnRateConfig
  readonly isPremium: boolean
  readonly onConfigChange: (config: NodeReturnRateConfig) => void
  readonly onPremiumChange: (isPremium: boolean) => void
}

type EditorMode = 'create' | 'rename' | null

export function CraftPresetManager({
  config,
  isPremium,
  onConfigChange,
  onPremiumChange,
}: CraftPresetManagerProps) {
  const presets = useCraftPresetStore((state) => state.presets)
  const defaultPresetId = useCraftPresetStore(
    (state) => state.defaultPresetId,
  )
  const activePresetId = useCraftPresetStore(
    (state) => state.activePresetId,
  )
  const createPreset = useCraftPresetStore((state) => state.createPreset)
  const updatePreset = useCraftPresetStore((state) => state.updatePreset)
  const renamePreset = useCraftPresetStore((state) => state.renamePreset)
  const deletePreset = useCraftPresetStore((state) => state.deletePreset)
  const setDefaultPreset = useCraftPresetStore(
    (state) => state.setDefaultPreset,
  )
  const setActivePreset = useCraftPresetStore(
    (state) => state.setActivePreset,
  )

  const [editorMode, setEditorMode] = useState<EditorMode>(null)
  const [nameInput, setNameInput] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<
    string | null
  >(null)

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activePresetId) ?? null,
    [activePresetId, presets],
  )

  const isActivePresetModified = activePreset
    ? !doesPresetMatchCurrentConfig(activePreset, config, isPremium)
    : false

  const isActivePresetDefault =
    activePreset !== null && activePreset.id === defaultPresetId

  function applyPreset(presetId: string) {
    const preset = presets.find((candidate) => candidate.id === presetId)

    if (!preset) {
      setActivePreset(null)
      return
    }

    onConfigChange(
      applyPresetProductionConfig(config, preset.productionConfig),
    )
    onPremiumChange(preset.isPremium)
    setActivePreset(preset.id)
    setEditorMode(null)
    setFormError(null)
    setDeleteConfirmationId(null)
  }

  function openCreateEditor() {
    setEditorMode('create')
    setNameInput('')
    setFormError(null)
    setDeleteConfirmationId(null)
  }

  function openRenameEditor() {
    if (!activePreset) return

    setEditorMode('rename')
    setNameInput(activePreset.name)
    setFormError(null)
    setDeleteConfirmationId(null)
  }

  function closeEditor() {
    setEditorMode(null)
    setNameInput('')
    setFormError(null)
  }

  function submitEditor() {
    const normalizedName = nameInput.trim()

    if (normalizedName.length === 0) {
      setFormError('Escribe un nombre para el preset.')
      return
    }

    const duplicatedName = presets.some(
      (preset) =>
        preset.id !== activePreset?.id &&
        preset.name.localeCompare(normalizedName, 'es', {
          sensitivity: 'base',
        }) === 0,
    )

    if (duplicatedName) {
      setFormError('Ya existe un preset con ese nombre.')
      return
    }

    if (editorMode === 'create') {
      const createdId = createPreset(
        normalizedName,
        config,
        isPremium,
      )

      if (!createdId) {
        setFormError('No se pudo guardar el preset.')
        return
      }
    } else if (editorMode === 'rename' && activePreset) {
      renamePreset(activePreset.id, normalizedName)
    }

    closeEditor()
  }

  function handleUpdatePreset() {
    if (!activePreset) return

    updatePreset(activePreset.id, config, isPremium)
    setDeleteConfirmationId(null)
  }

  function handleDefaultToggle() {
    if (!activePreset) return

    setDefaultPreset(
      isActivePresetDefault ? null : activePreset.id,
    )
  }

  function handleDeletePreset() {
    if (!activePreset) return

    if (deleteConfirmationId !== activePreset.id) {
      setDeleteConfirmationId(activePreset.id)
      setEditorMode(null)
      return
    }

    deletePreset(activePreset.id)
    setDeleteConfirmationId(null)
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
            Preset
          </span>

          <InfoHint
            label="Preset de producción y venta"
            text="Guarda ciudad, bono de especialidad, foco, bono diario y Premium para reutilizar la misma configuración con un clic. Los precios, la cantidad y el objeto no se guardan aquí."
            align="left"
          />
        </div>

        <select
          value={activePresetId ?? ''}
          onChange={(event) => applyPreset(event.target.value)}
          className="min-w-52 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
        >
          <option value="">Configuración manual</option>

          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
              {preset.id === defaultPresetId ? ' · Predeterminado' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={openCreateEditor}
          className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
        >
          Guardar actual
        </button>
      </div>

      {activePreset && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${
              isActivePresetModified
                ? 'border border-accent-border bg-accent-muted text-accent'
                : 'bg-positive-muted text-positive'
            }`}
          >
            {isActivePresetModified ? 'Modificado' : 'Aplicado'}
          </span>

          {isActivePresetDefault && (
            <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text-muted">
              Predeterminado
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {isActivePresetModified && (
              <button
                type="button"
                onClick={handleUpdatePreset}
                className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-bg transition-opacity hover:opacity-90"
              >
                Actualizar preset
              </button>
            )}

            <button
              type="button"
              onClick={openRenameEditor}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted hover:border-border-strong hover:text-text"
            >
              Renombrar
            </button>

            <button
              type="button"
              onClick={handleDefaultToggle}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted hover:border-border-strong hover:text-text"
            >
              {isActivePresetDefault
                ? 'Quitar predeterminado'
                : 'Usar al iniciar'}
            </button>

            <button
              type="button"
              onClick={handleDeletePreset}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-negative hover:border-border-strong"
            >
              {deleteConfirmationId === activePreset.id
                ? 'Confirmar eliminación'
                : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {editorMode && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-3">
          <label
            htmlFor="craft-preset-name"
            className="text-xs font-medium text-text-muted"
          >
            {editorMode === 'create'
              ? 'Nombre del nuevo preset'
              : 'Nuevo nombre del preset'}
          </label>

          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="craft-preset-name"
              type="text"
              maxLength={48}
              autoFocus
              value={nameInput}
              onChange={(event) => {
                setNameInput(event.target.value)
                setFormError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitEditor()
                if (event.key === 'Escape') closeEditor()
              }}
              placeholder="Ej. Bridgewatch con foco"
              className="min-w-56 flex-1 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
            />

            <button
              type="button"
              onClick={submitEditor}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-bg"
            >
              {editorMode === 'create' ? 'Guardar' : 'Renombrar'}
            </button>

            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md border border-border px-3 py-2 text-xs text-text-muted hover:text-text"
            >
              Cancelar
            </button>
          </div>

          {formError && (
            <p className="mt-2 text-xs text-negative">
              {formError}
            </p>
          )}
        </div>
      )}

      {presets.length === 0 && !editorMode && (
        <p className="mt-2 text-[11px] leading-relaxed text-text-faint">
          Todavía no tienes presets. Ajusta la configuración y presiona
          “Guardar actual”.
        </p>
      )}
    </div>
  )
}
