import { lazy, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { accountAuthConfig } from "../config/accountAuthConfig";
import { useAccountAccessStore } from "../store/accountAccessStore";
import {
  AccountSessionContext,
  type AccountSessionValue,
} from "./accountSession";

const Auth0AccountSessionProvider = lazy(
  () => import("./Auth0AccountSessionProvider"),
);

interface AccountSessionProviderProps {
  readonly children: ReactNode;
}

async function noop(): Promise<void> {
  return undefined;
}

async function noToken(): Promise<string | null> {
  return null;
}

function StaticAccountSessionProvider({
  children,
  loading = false,
  clearAccess = true,
}: AccountSessionProviderProps & {
  readonly loading?: boolean;
  readonly clearAccess?: boolean;
}) {
  const clear = useAccountAccessStore((state) => state.clear);

  useEffect(() => {
    if (clearAccess) clear();
  }, [clear, clearAccess]);

  const value = useMemo<AccountSessionValue>(
    () => ({
      authEnabled: accountAuthConfig.enabled,
      authConfigured: accountAuthConfig.configured,
      billingEnabled: false,
      billingStatus: "idle",
      billingError: null,
      isLoading: loading,
      isAuthenticated: false,
      profile: null,
      error:
        accountAuthConfig.enabled && !accountAuthConfig.configured
          ? "La autenticación está habilitada, pero faltan variables públicas de Auth0."
          : null,
      login: noop,
      logout: noop,
      refreshAccess: noop,
      getAccessToken: noToken,
      startCheckout: noop,
      openBillingPortal: noop,
    }),
    [loading],
  );

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  );
}

export function AccountSessionProvider({
  children,
}: AccountSessionProviderProps) {
  if (!accountAuthConfig.enabled || !accountAuthConfig.configured) {
    return (
      <StaticAccountSessionProvider>{children}</StaticAccountSessionProvider>
    );
  }

  return (
    <Suspense
      fallback={
        <StaticAccountSessionProvider loading clearAccess={false}>
          {children}
        </StaticAccountSessionProvider>
      }
    >
      <Auth0AccountSessionProvider>{children}</Auth0AccountSessionProvider>
    </Suspense>
  );
}
