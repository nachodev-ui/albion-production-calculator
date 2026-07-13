import { useAccountAccessStore } from '../store/accountAccessStore'
import {
  entitlementIsEnabled,
  entitlementNumber,
  readEntitlement,
} from '../store/accountAccessStore'
import type { EntitlementKey, EntitlementValue } from '../types'

export function useAccountEntitlement(
  key: EntitlementKey,
): EntitlementValue {
  return useAccountAccessStore((state) => readEntitlement(state.access, key))
}

export function useBooleanEntitlement(key: EntitlementKey): boolean {
  return useAccountAccessStore((state) =>
    entitlementIsEnabled(state.access, key),
  )
}

export function useNumericEntitlement(
  key: EntitlementKey,
  fallback = 0,
): number {
  return useAccountAccessStore((state) =>
    entitlementNumber(state.access, key, fallback),
  )
}
