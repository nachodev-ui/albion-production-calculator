import { accountAuthConfig } from '../config/accountAuthConfig'
import type { CalculationSummarySnapshot } from '@features/craft-calculator/utils/calculationSummary'
import type { CraftPreset } from '@features/craft-calculator/store/craftPresetStorage'

export class SavedDataApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SavedDataApiError'
    this.status = status
  }
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SavedDataApiError(`Invalid saved data field: ${field}`, 502)
  }
  return value
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (isRecord(payload) && typeof payload['error'] === 'string') {
      return payload['error']
    }
  } catch {
    // Keep the generic message when the body is not JSON.
  }
  return `Saved data request failed with status ${response.status}`
}

async function request(
  path: string,
  accessToken: string,
  options: RequestInit,
): Promise<Response> {
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
    throw new SavedDataApiError(await responseMessage(response), response.status)
  }
  return response
}

function parseCloudPreset(value: unknown): CloudPreset {
  if (!isRecord(value) || !isRecord(value['payload'])) {
    throw new SavedDataApiError('Invalid cloud preset response', 502)
  }
  return {
    id: requiredString(value['id'], 'preset.id'),
    name: requiredString(value['name'], 'preset.name'),
    payload: value['payload'] as unknown as CraftPreset,
    isDefault: value['isDefault'] === true,
    createdAt: requiredString(value['createdAt'], 'preset.createdAt'),
    updatedAt: requiredString(value['updatedAt'], 'preset.updatedAt'),
  }
}

function parseSavedCalculation(value: unknown): SavedCalculation {
  if (!isRecord(value) || !isRecord(value['snapshot'])) {
    throw new SavedDataApiError('Invalid saved calculation response', 502)
  }
  return {
    id: requiredString(value['id'], 'calculation.id'),
    name: nullableString(value['name']),
    kind: requiredString(value['kind'], 'calculation.kind'),
    snapshot: value['snapshot'] as unknown as CalculationSummarySnapshot,
    createdAt: requiredString(value['createdAt'], 'calculation.createdAt'),
  }
}

export async function fetchCloudPresets(
  accessToken: string,
  signal?: AbortSignal,
): Promise<readonly CloudPreset[]> {
  const response = await request('/me/presets', accessToken, {
    method: 'GET',
    signal,
  })
  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload['presets'])) {
    throw new SavedDataApiError('Invalid cloud preset list response', 502)
  }
  return payload['presets'].map(parseCloudPreset)
}

export async function createCloudPreset(
  accessToken: string,
  input: PresetWriteInput,
): Promise<CloudPreset> {
  const response = await request('/me/presets', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return parseCloudPreset(await response.json())
}

export async function updateCloudPreset(
  accessToken: string,
  cloudPresetId: string,
  input: PresetWriteInput,
): Promise<CloudPreset> {
  const response = await request(
    `/me/presets/${encodeURIComponent(cloudPresetId)}`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
  return parseCloudPreset(await response.json())
}

export async function deleteCloudPreset(
  accessToken: string,
  cloudPresetId: string,
): Promise<void> {
  await request(`/me/presets/${encodeURIComponent(cloudPresetId)}`, accessToken, {
    method: 'DELETE',
  })
}

export async function fetchSavedCalculations(
  accessToken: string,
  limit = 50,
  signal?: AbortSignal,
): Promise<readonly SavedCalculation[]> {
  const response = await request(
    `/me/calculations?limit=${encodeURIComponent(String(limit))}`,
    accessToken,
    { method: 'GET', signal },
  )
  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload['calculations'])) {
    throw new SavedDataApiError('Invalid saved calculation list response', 502)
  }
  return payload['calculations'].map(parseSavedCalculation)
}

export async function createSavedCalculation(
  accessToken: string,
  input: CalculationWriteInput,
): Promise<SavedCalculation> {
  const response = await request('/me/calculations', accessToken, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return parseSavedCalculation(await response.json())
}

export async function deleteSavedCalculation(
  accessToken: string,
  calculationId: string,
): Promise<void> {
  await request(
    `/me/calculations/${encodeURIComponent(calculationId)}`,
    accessToken,
    { method: 'DELETE' },
  )
}
