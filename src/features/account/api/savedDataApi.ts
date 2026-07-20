import { accountAuthConfig } from '../config/accountAuthConfig'
import type { CalculationSummarySnapshot } from '@features/craft-calculator/utils/calculationSummary'
import type { CraftPreset } from '@features/craft-calculator/store/craftPresetStorage'

export interface CloudPreset {
  readonly id: string
  readonly name: string
  readonly payload: CraftPreset
  readonly isDefault: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SavedCalculation {
  readonly id: string
  readonly name: string | null
  readonly kind: string
  readonly snapshot: CalculationSummarySnapshot
  readonly createdAt: string
}

interface PresetWriteInput {
  readonly name: string
  readonly payload: CraftPreset
  readonly isDefault: boolean
}

interface CalculationWriteInput {
  readonly name?: string
  readonly kind: string
  readonly snapshot: CalculationSummarySnapshot
}

async function request<T>(
  path: string,
  accessToken: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(`${accountAuthConfig.centralApiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      readonly error?: string
    } | null
    throw new Error(payload?.error ?? `Error HTTP ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function fetchCloudPresets(
  accessToken: string,
  signal?: AbortSignal,
): Promise<readonly CloudPreset[]> {
  const payload = await request<{ readonly presets: readonly CloudPreset[] }>(
    '/me/presets',
    accessToken,
    { method: 'GET', signal },
  )
  return payload.presets
}

export function createCloudPreset(
  accessToken: string,
  input: PresetWriteInput,
): Promise<CloudPreset> {
  return request('/me/presets', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateCloudPreset(
  accessToken: string,
  cloudPresetId: string,
  input: PresetWriteInput,
): Promise<CloudPreset> {
  return request(
    `/me/presets/${encodeURIComponent(cloudPresetId)}`,
    accessToken,
    { method: 'PUT', body: JSON.stringify(input) },
  )
}

export function deleteCloudPreset(
  accessToken: string,
  cloudPresetId: string,
): Promise<void> {
  return request(`/me/presets/${encodeURIComponent(cloudPresetId)}`, accessToken, {
    method: 'DELETE',
  })
}

export async function fetchSavedCalculations(
  accessToken: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<readonly SavedCalculation[]> {
  const payload = await request<{
    readonly calculations: readonly SavedCalculation[]
  }>(
    `/me/calculations?limit=${encodeURIComponent(String(limit))}`,
    accessToken,
    { method: 'GET', signal },
  )
  return payload.calculations
}

export function createSavedCalculation(
  accessToken: string,
  input: CalculationWriteInput,
): Promise<SavedCalculation> {
  return request('/me/calculations', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteSavedCalculation(
  accessToken: string,
  calculationId: string,
): Promise<void> {
  return request(
    `/me/calculations/${encodeURIComponent(calculationId)}`,
    accessToken,
    { method: 'DELETE' },
  )
}
