import { useEffect, useRef, useState } from 'react'
import {
  createCloudPreset,
  deleteCloudPreset,
  fetchCloudPresets,
  updateCloudPreset,
} from '@features/account/api/savedDataApi'
import type { CloudPreset } from '@features/account/api/savedDataApi'
import { useAccountSession } from '@features/account/hooks/useAccountSession'
import { useAccountAccessStore } from '@features/account/store/accountAccessStore'
import { useCraftPresetStore } from '@features/craft-calculator/store/craftPresetStore'
import { saveCraftPresetStorage } from '@features/craft-calculator/store/craftPresetStorage'
import type { CraftPreset } from '@features/craft-calculator/store/craftPresetStorage'

const OWNER_KEY = 'albion-craft-calculator:cloud-preset-owner:v1'

function localPreset(row: CloudPreset): CraftPreset {
  return { ...row.payload, name: row.name }
}

function persist(presets: readonly CraftPreset[], defaultPresetId: string | null) {
  saveCraftPresetStorage({ presets, defaultPresetId })
  useCraftPresetStore.setState((state) => ({
    presets,
    defaultPresetId,
    activePresetId: presets.some(
      (preset) => preset.id === state.activePresetId,
    )
      ? state.activePresetId
      : defaultPresetId,
  }))
}

function cloudInput(preset: CraftPreset, defaultPresetId: string | null) {
  return {
    name: preset.name,
    payload: preset,
    isDefault: preset.id === defaultPresetId,
  }
}

export function CloudPresetSync() {
  const { isAuthenticated, isLoading, getAccessToken } = useAccountSession()
  const userId = useAccountAccessStore((state) => state.access?.user.id ?? null)
  const presets = useCraftPresetStore((state) => state.presets)
  const defaultPresetId = useCraftPresetStore((state) => state.defaultPresetId)
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (isLoading || loadingRef.current) return

    if (!isAuthenticated || !userId) {
      if (hydratedUserId || localStorage.getItem(OWNER_KEY)) {
        persist([], null)
        localStorage.removeItem(OWNER_KEY)
        setHydratedUserId(null)
      }
      return
    }
    if (hydratedUserId === userId) return

    const controller = new AbortController()
    loadingRef.current = true
    void getAccessToken()
      .then(async (token) => {
        if (!token) return
        const rows = await fetchCloudPresets(token, controller.signal)
        if (controller.signal.aborted) return

        const local = useCraftPresetStore.getState()
        const migrateLocal = localStorage.getItem(OWNER_KEY) === null
        const merged = new Map<string, CraftPreset>()
        if (migrateLocal) {
          local.presets.forEach((preset) => merged.set(preset.id, preset))
        }
        rows.forEach((row) => {
          const preset = localPreset(row)
          merged.set(preset.id, preset)
        })

        const nextPresets = [...merged.values()]
        const requestedDefault =
          rows.find((row) => row.isDefault)?.payload.id ??
          (migrateLocal ? local.defaultPresetId : null)
        const nextDefault = nextPresets.some(
          (preset) => preset.id === requestedDefault,
        )
          ? requestedDefault
          : null

        persist(nextPresets, nextDefault)
        localStorage.setItem(OWNER_KEY, userId)
        setHydratedUserId(userId)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.warn('Preset hydration failed', error)
      })
      .finally(() => {
        loadingRef.current = false
      })

    return () => controller.abort()
  }, [getAccessToken, hydratedUserId, isAuthenticated, isLoading, userId])

  useEffect(() => {
    if (!userId || hydratedUserId !== userId || !isAuthenticated) return

    const timer = window.setTimeout(() => {
      void getAccessToken()
        .then(async (token) => {
          if (!token) return
          const rows = await fetchCloudPresets(token)
          const remote = new Map(rows.map((row) => [row.payload.id, row]))
          const localIds = new Set(presets.map((preset) => preset.id))

          for (const preset of presets) {
            const row = remote.get(preset.id)
            const input = cloudInput(preset, defaultPresetId)
            if (!row) await createCloudPreset(token, input)
            else if (
              row.name !== input.name ||
              row.isDefault !== input.isDefault ||
              JSON.stringify(row.payload) !== JSON.stringify(input.payload)
            ) {
              await updateCloudPreset(token, row.id, input)
            }
          }
          for (const [localId, row] of remote) {
            if (!localIds.has(localId)) await deleteCloudPreset(token, row.id)
          }
        })
        .catch((error: unknown) => console.warn('Preset sync failed', error))
    }, 700)

    return () => window.clearTimeout(timer)
  }, [
    defaultPresetId,
    getAccessToken,
    hydratedUserId,
    isAuthenticated,
    presets,
    userId,
  ])

  return null
}
