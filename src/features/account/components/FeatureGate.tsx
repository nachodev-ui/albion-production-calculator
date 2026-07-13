import type { ReactNode } from 'react'
import { useAccountEntitlement } from '../hooks/useAccountEntitlement'
import type { EntitlementKey, EntitlementValue } from '../types'
import { LockedFeatureCard } from './LockedFeatureCard'

interface FeatureGateProps {
  readonly entitlementKey: EntitlementKey
  readonly children: ReactNode
  readonly title: string
  readonly description: string
  readonly onViewPlans: () => void
  readonly minimum?: number
  readonly fallback?: ReactNode
}

function isAllowed(value: EntitlementValue, minimum: number | undefined): boolean {
  if (typeof minimum === 'number') {
    return typeof value === 'number' && value >= minimum
  }
  return value === true
}

export function FeatureGate({
  entitlementKey,
  children,
  title,
  description,
  onViewPlans,
  minimum,
  fallback,
}: FeatureGateProps) {
  const value = useAccountEntitlement(entitlementKey)

  if (isAllowed(value, minimum)) {
    return <>{children}</>
  }

  return (
    <>
      {fallback ?? (
        <LockedFeatureCard
          title={title}
          description={description}
          onViewPlans={onViewPlans}
        />
      )}
    </>
  )
}
