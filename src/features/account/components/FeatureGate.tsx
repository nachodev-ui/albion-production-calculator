import type { ReactNode } from "react";
import { useAccountEntitlement } from "../hooks/useAccountEntitlement";
import { useAccountSession } from "../hooks/useAccountSession";
import {
  accountAccessIsUnresolved,
  useAccountAccessStore,
} from "../store/accountAccessStore";
import type { EntitlementKey, EntitlementValue } from "../types";
import { AccountAccessResolutionCard } from "./AccountAccessResolutionCard";
import { LockedFeatureCard } from "./LockedFeatureCard";

interface FeatureGateProps {
  readonly entitlementKey: EntitlementKey;
  readonly children: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly onViewPlans: () => void;
  readonly minimum?: number;
  readonly fallback?: ReactNode;
}

function isAllowed(
  value: EntitlementValue,
  minimum: number | undefined,
): boolean {
  if (typeof minimum === "number") {
    return typeof value === "number" && value >= minimum;
  }
  return value === true;
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
  const session = useAccountSession();
  const access = useAccountAccessStore((state) => state.access);
  const accessStatus = useAccountAccessStore((state) => state.status);
  const accessError = useAccountAccessStore((state) => state.error);
  const value = useAccountEntitlement(entitlementKey);
  const unresolved =
    session.isLoading ||
    (session.isAuthenticated &&
      accountAccessIsUnresolved(accessStatus, access));

  if (unresolved) {
    return <AccountAccessResolutionCard status="loading" compact />;
  }

  if (session.isAuthenticated && access === null && accessStatus === "error") {
    return (
      <AccountAccessResolutionCard
        status="error"
        error={accessError}
        onRetry={() => void session.refreshAccess()}
        compact
      />
    );
  }

  if (isAllowed(value, minimum)) {
    return <>{children}</>;
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
  );
}
