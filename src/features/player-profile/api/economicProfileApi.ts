import { accountAuthConfig } from '@features/account/config/accountAuthConfig'
import type {
  EconomicProfile,
  EconomicProfileInput,
} from '../economicProfile'

export class EconomicProfileApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'EconomicProfileApiError'
    this.status = status
  }
}

async function request<T>(
  accessToken: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${accountAuthConfig.centralApiBaseUrl}/me/economic-profile`,
    {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      readonly error?: string
    } | null
    throw new EconomicProfileApiError(
      payload?.error ?? `Error HTTP ${response.status}`,
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function fetchEconomicProfile(
  accessToken: string,
  signal?: AbortSignal,
): Promise<EconomicProfile | null> {
  const payload = await request<{ readonly profile: EconomicProfile | null }>(
    accessToken,
    { method: 'GET', signal },
  )
  return payload.profile
}

export async function saveEconomicProfile(
  accessToken: string,
  input: EconomicProfileInput,
): Promise<EconomicProfile> {
  const payload = await request<{ readonly profile: EconomicProfile }>(
    accessToken,
    { method: 'PUT', body: JSON.stringify(input) },
  )
  return payload.profile
}

export function deleteEconomicProfile(accessToken: string): Promise<void> {
  return request(accessToken, { method: 'DELETE' })
}
