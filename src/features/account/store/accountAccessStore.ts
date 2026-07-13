import { create } from 'zustand'
import type {
  AccountAccess,
  EntitlementKey,
  EntitlementMap,
  EntitlementValue,
} from '../types'
import { FREE_ENTITLEMENTS } from '../types'

export type AccountAccessStatus =
  | 'anonymous'
  | 'loading'
  | 'ready'
  | 'error'

interface AccountAccessState {
  readonly status: AccountAccessStatus
  readonly access: AccountAccess | null
  readonly error: string | null
  readonly lastSyncedAt: string | null
  beginLoading: () => void
  setAccess: (access: AccountAccess) => void
  setError: (message: string) => void
  clear: () => void
}

export const useAccountAccessStore = create<AccountAccessState>((set) => ({
  status: 'anonymous',
  access: null,
  error: null,
  lastSyncedAt: null,
  beginLoading: () => set({ status: 'loading', error: null }),
  setAccess: (access) =>
    set({
      status: 'ready',
      access,
      error: null,
      lastSyncedAt: new Date().toISOString(),
    }),
  setError: (message) => set({ status: 'error', error: message }),
  clear: () =>
    set({
      status: 'anonymous',
      access: null,
      error: null,
      lastSyncedAt: null,
    }),
}))

export function getEffectiveEntitlements(
  access: AccountAccess | null,
): EntitlementMap {
  return {
    ...FREE_ENTITLEMENTS,
    ...(access?.entitlements ?? {}),
  }
}

export function readEntitlement(
  access: AccountAccess | null,
  key: EntitlementKey,
): EntitlementValue {
  return getEffectiveEntitlements(access)[key] ?? null
}

export function entitlementIsEnabled(
  access: AccountAccess | null,
  key: EntitlementKey,
): boolean {
  return readEntitlement(access, key) === true
}

export function entitlementNumber(
  access: AccountAccess | null,
  key: EntitlementKey,
  fallback = 0,
): number {
  const value = readEntitlement(access, key)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function currentPlan(access: AccountAccess | null): string {
  return access?.subscription.plan ?? 'free'
}
