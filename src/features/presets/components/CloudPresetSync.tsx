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

const CLOUD_PRESET_OWNER_KEY = 'albion-craft-calculator:cloud-preset-owner:v1'
const SYNC_DELAY_MS = 700

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCloudPresetPayload(row: CloudPreset): CraftPreset | null {
  const payload: unknown = row.payload
  if (
    !isRecord(payload) ||
    typeof payload['id'] !== 'string' ||
    payload['id'].trim().length === 0 ||
    !isRecord(payload['productionConfig']) ||
    typeof payload['isPremium'] !== 'boolean'
  ) {
    return null
  }

  return {
    ...(payload as unknown as CraftPreset),
    name: row.name,
  }
}

function persistStore(
  presets: readonly CraftPreset[],
  defaultPresetId: string | null,
): void {
  saveCraftPresetStorage({ presets, defaultPresetId })
  useCraftPresetStore.setState((state) => ({
    presets,
    defaultPresetId,
    activePresetId:
      state.activePresetId &&
      presets.some((preset) => preset.id === state.activePresetId)
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

function sameCloudValue(
  row: CloudPreset,
  preset: CraftPreset,
  defaultPresetId: string | null,
): boolean {
  return (
    row.name === preset.name &&
    row.isDefault === (preset.id === defaultPresetId) &&
    JSON.stringify(row.payload) === JSON.stringify(preset)
  )
}

export function CloudPresetSync() {
  const { isAuthenticated, isLoading, getAccessToken } = useAccountSession()
  const userId = useAccountAccessStore((state) => state.access?.user.id ?? null)
  const presets = useCraftPresetStore((state) => state.presets)
  const defaultPresetId = useCraftPresetStore(
    (state) => state.defaultPresetId,
  )
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null)
  const initializingRef = useRef(false)

  useEffect(() => {
    if (isLoading || initializingRef.current) return

    if (!isAuthenticated || !userId) {
      if (hydratedUserId) {
        persistStore([], null)
        window.localStorage.removeItem(CLOUD_PRESET_OWNER_KEY)
        setHydratedUserId(null)
      }
      return
    }
    if (hydratedUserId === userId) return

    const controller = new AbortController()
    initializingRef.current = true

    void getAccessToken()
      .then(async (accessToken) => {
        if (!accessToken) return
        const cloudRows = await fetchCloudPresets(
          accessToken,
          controller.signal,
        )
        if (controller.signal.aborted) return

        const cloudPresets = cloudRows
          .map((row) => ({ row, preset: readCloudPresetPayload(row) }))
          .filter(
            (
              value,
            ): value is { readonly row: CloudPreset; readonly preset: CraftPreset } =>
              value.preset !== null,
          )
        const localState = useCraftPresetStore.getState()
        const cachedOwner = window.localStorage.getItem(CLOUD_PRESET_OWNER_KEY)
        const shouldMergeLocal = cachedOwner === null || cachedOwner === userId
        const merged = new Map<string, CraftPreset>()

        if (shouldMergeLocal) {
          for (const preset of localState.presets) merged.set(preset.id, preset)
        }
        for (const { preset } of cloudPresets) merged.set(preset.id, preset)

        const mergedPresets = Array.from(merged.values())
        const cloudDefaultId = cloudPresets.find(({ row }) => row.isDefault)
          ?.preset.id
        const requestedDefaultId =
          cloudDefaultId ??
          (shouldMergeLocal ? localState.defaultPresetId : null)
        const nextDefaultId = mergedPresets.some(
          (preset) => preset.id === requestedDefaultId,
        )
          ? requestedDefaultId
          : null

        persistStore(mergedPresets, nextDefaultId)
        window.localStorage.setItem(CLOUD_PRESET_OWNER_KEY, userId)
        setHydratedUserId(userId)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('Cloud preset hydration failed', error)
        }
      })
      .finally(() => {
        initializingRef.current = false
      })

    return () => controller.abort()
  }, [
    getAccessToken,
    hydratedUserId,
    isAuthenticated,
    isLoading,
    userId,
  ])

  useEffect(() => {
    if (!userId || hydratedUserId !== userId || !isAuthenticated) return

    const timer = window.setTimeout(() => {
      void getAccessToken()
        .then(async (accessToken) => {
          if (!accessToken) return
          const cloudRows = await fetchCloudPresets(accessToken)
          const rowsByLocalId = new Map<string, CloudPreset>()

          for (const row of cloudRows) {
            const payload = readCloudPresetPayload(row)
            if (payload) rowsByLocalId.set(payload.id, row)
          }

          const localIds = new Set(presets.map((preset) => preset.id))
          for (const preset of presets) {
            const existing = rowsByLocalId.get(preset.id)
            if (!existing) {
              await createCloudPreset(
                accessToken,
                cloudInput(preset, defaultPresetId),
              )
            } else if (!sameCloudValue(existing, preset, defaultPresetId)) {
              await updateCloudPreset(
                accessToken,
                existing.id,
                cloudInput(preset, defaultPresetId),
              )
            }
          }

          for (const [localId, row] of rowsByLocalId) {
            if (!localIds.has(localId)) {
              await deleteCloudPreset(accessToken, row.id)
            }
          }
        })
        .catch((error: unknown) => {
          console.warn('Cloud preset synchronization failed', error)
        })
    }, SYNC_DELAY_MS)

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
