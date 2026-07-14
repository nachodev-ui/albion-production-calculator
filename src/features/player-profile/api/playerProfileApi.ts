import { accountAuthConfig } from '../../account/config/accountAuthConfig'
import type { AlbionPlayerSearchResult, AlbionProfileResponse, AlbionServer } from '../types'

export class PlayerProfileApiError extends Error {
  readonly status: number
  readonly retryAfterSeconds?: number

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message)
    this.name = 'PlayerProfileApiError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly error?: unknown }
    if (typeof body.error === 'string') return body.error
  } catch {
    // Use the generic status message.
  }
  return `Player profile request failed with status ${response.status}`
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.body) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${accountAuthConfig.centralApiBaseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    cache: 'no-store',
  })
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new PlayerProfileApiError(
      await readError(response),
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    )
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function searchAlbionPlayers(server: AlbionServer, name: string) {
  const params = new URLSearchParams({ server, name })
  const data = await request<{ readonly players: readonly AlbionPlayerSearchResult[] }>(
    `/albion/players/search?${params.toString()}`,
  )
  return data.players
}

export const fetchMyAlbionProfile = (token: string) =>
  request<AlbionProfileResponse>('/me/albion-profile', token)

export const linkMyAlbionProfile = (token: string, server: AlbionServer, playerId: string) =>
  request<AlbionProfileResponse>('/me/albion-profile/link', token, {
    method: 'PUT',
    body: JSON.stringify({ server, playerId }),
  })

export const refreshMyAlbionProfile = (token: string) =>
  request<AlbionProfileResponse>('/me/albion-profile/refresh', token, { method: 'POST' })

export const unlinkMyAlbionProfile = (token: string) =>
  request<void>('/me/albion-profile/unlink', token, { method: 'DELETE' })
