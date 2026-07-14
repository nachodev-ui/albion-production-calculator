import { accountAuthConfig } from '../../account/config/accountAuthConfig'
import type {
  AdminAuditEvent,
  AdminOperationResult,
  AdminSession,
  AdminUserDetail,
  AdminUserSummary,
} from '../types'

export class AdminApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { readonly error?: unknown }
    if (typeof body.error === 'string') return body.error
  } catch {
    // Use the generic status message.
  }
  return `Admin API request failed with status ${response.status}`
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${accountAuthConfig.centralApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new AdminApiError(await errorMessage(response), response.status)
  }
  return (await response.json()) as T
}

export function fetchAdminSession(token: string): Promise<AdminSession> {
  return request('/admin/session', token)
}

export async function searchAdminUsers(
  token: string,
  query = '',
): Promise<readonly AdminUserSummary[]> {
  const params = new URLSearchParams({ q: query, limit: '50' })
  const response = await request<{ readonly users: readonly AdminUserSummary[] }>(
    `/admin/users?${params.toString()}`,
    token,
  )
  return response.users
}

export function fetchAdminUser(
  token: string,
  userId: string,
): Promise<AdminUserDetail> {
  return request(`/admin/users/${encodeURIComponent(userId)}`, token)
}

export async function fetchAdminAuditEvents(
  token: string,
): Promise<readonly AdminAuditEvent[]> {
  const response = await request<{ readonly events: readonly AdminAuditEvent[] }>(
    '/admin/audit-events?limit=100',
    token,
  )
  return response.events
}

export function grantAdminPro(
  token: string,
  userId: string,
  durationDays: number,
  reason: string,
  confirmation: string,
): Promise<AdminOperationResult> {
  return request(`/admin/users/${encodeURIComponent(userId)}/grant-pro`, token, {
    method: 'POST',
    body: JSON.stringify({ durationDays, reason, confirmation }),
  })
}

export function revokeAdminPro(
  token: string,
  userId: string,
  reason: string,
  confirmation: string,
): Promise<AdminOperationResult> {
  return request(`/admin/users/${encodeURIComponent(userId)}/revoke-pro`, token, {
    method: 'POST',
    body: JSON.stringify({ reason, confirmation }),
  })
}
