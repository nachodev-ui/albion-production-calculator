import { Auth0Provider, useAuth0, type AppState } from "@auth0/auth0-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createBillingCheckout,
  createBillingPortal,
} from "../api/accountApi";
import { synchronizeAccountAccess } from "../api/accountAccessSync";
import { accountAuthConfig } from "../config/accountAuthConfig";
import {
  clearAccountAccessSession,
  loadAccountAccessSession,
  saveAccountAccessSession,
} from "../store/accountAccessSessionCache";
import {
  accountAccessIsUnresolved,
  useAccountAccessStore,
} from "../store/accountAccessStore";
import type { SessionProfile } from "../types";
import {
  AccountSessionContext,
  type AccountSessionValue,
  type BillingActionStatus,
} from "./accountSession";

interface Auth0AccountSessionProviderProps {
  readonly children: ReactNode;
}

function currentReturnTo(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function safeRedirectTarget(appState: AppState | undefined): string {
  const returnTo = appState?.returnTo;
  if (
    typeof returnTo === "string" &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//")
  ) {
    return returnTo;
  }
  return "/account";
}

function onRedirectCallback(appState?: AppState) {
  window.history.replaceState({}, document.title, safeRedirectTarget(appState));
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function Auth0AccountBridge({ children }: Auth0AccountSessionProviderProps) {
  const {
    isLoading: authIsLoading,
    isAuthenticated,
    user,
    error: authError,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();
  const access = useAccountAccessStore((state) => state.access);
  const accessStatus = useAccountAccessStore((state) => state.status);
  const beginLoading = useAccountAccessStore((state) => state.beginLoading);
  const setAccess = useAccountAccessStore((state) => state.setAccess);
  const restoreAccess = useAccountAccessStore((state) => state.restoreAccess);
  const setError = useAccountAccessStore((state) => state.setError);
  const clear = useAccountAccessStore((state) => state.clear);
  const [billingStatus, setBillingStatus] =
    useState<BillingActionStatus>("idle");
  const [billingError, setBillingError] = useState<string | null>(null);
  const activeSync = useRef<AbortController | null>(null);
  const automaticallySyncedSubject = useRef<string | null>(null);
  const subject =
    typeof user?.sub === "string" && user.sub.trim().length > 0
      ? user.sub
      : null;

  const getAccountAccessToken = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: accountAuthConfig.audience,
          scope: accountAuthConfig.scope,
        },
      }),
    [getAccessTokenSilently],
  );

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) return null;
    return getAccountAccessToken();
  }, [getAccountAccessToken, isAuthenticated]);

  const refreshAccess = useCallback(async () => {
    if (!isAuthenticated) {
      activeSync.current?.abort();
      activeSync.current = null;
      clearAccountAccessSession();
      clear();
      return;
    }

    if (!subject) {
      setError("Auth0 no entregó un identificador válido para la cuenta.");
      return;
    }

    activeSync.current?.abort();
    const controller = new AbortController();
    activeSync.current = controller;
    beginLoading();

    try {
      const accessToken = await getAccountAccessToken();
      const nextAccess = await synchronizeAccountAccess(
        accessToken,
        controller.signal,
      );
      if (controller.signal.aborted) return;

      const syncedAt = new Date().toISOString();
      setAccess(nextAccess);
      saveAccountAccessSession(subject, nextAccess, syncedAt);
    } catch (error: unknown) {
      if (controller.signal.aborted || isAbortError(error)) return;
      setError(
        error instanceof Error
          ? error.message
          : "No fue posible sincronizar la cuenta.",
      );
    } finally {
      if (activeSync.current === controller) activeSync.current = null;
    }
  }, [
    beginLoading,
    clear,
    getAccountAccessToken,
    isAuthenticated,
    setAccess,
    setError,
    subject,
  ]);

  useLayoutEffect(() => {
    if (authIsLoading) return;

    if (!isAuthenticated) {
      activeSync.current?.abort();
      activeSync.current = null;
      automaticallySyncedSubject.current = null;
      clearAccountAccessSession();
      clear();
      return;
    }

    if (!subject) {
      automaticallySyncedSubject.current = null;
      setError("Auth0 no entregó un identificador válido para la cuenta.");
      return;
    }

    const cached = loadAccountAccessSession(subject);
    if (cached) {
      restoreAccess(cached.access, cached.syncedAt);
    } else {
      beginLoading();
    }
  }, [
    authIsLoading,
    beginLoading,
    clear,
    isAuthenticated,
    restoreAccess,
    setError,
    subject,
  ]);

  useEffect(() => {
    if (authIsLoading || !isAuthenticated || !subject) return;
    if (automaticallySyncedSubject.current === subject) return;

    automaticallySyncedSubject.current = subject;
    void refreshAccess();
  }, [authIsLoading, isAuthenticated, refreshAccess, subject]);

  useEffect(
    () => () => {
      activeSync.current?.abort();
      activeSync.current = null;
    },
    [],
  );

  const login = useCallback(async () => {
    setBillingError(null);
    setBillingStatus("idle");
    await loginWithRedirect({
      appState: { returnTo: currentReturnTo() },
      authorizationParams: {
        audience: accountAuthConfig.audience,
        scope: accountAuthConfig.scope,
      },
    });
  }, [loginWithRedirect]);

  const logout = useCallback(async () => {
    setBillingError(null);
    setBillingStatus("idle");
    activeSync.current?.abort();
    activeSync.current = null;
    automaticallySyncedSubject.current = null;
    clearAccountAccessSession();
    clear();
    await auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    });
  }, [auth0Logout, clear]);

  const runBillingAction = useCallback(
    async (
      status: Exclude<BillingActionStatus, "idle">,
      action: (accessToken: string) => Promise<{ readonly url: string }>,
    ) => {
      if (!accountAuthConfig.billingEnabled) {
        setBillingError("La facturación sandbox todavía no está habilitada.");
        return;
      }
      if (!isAuthenticated) {
        await login();
        return;
      }

      setBillingError(null);
      setBillingStatus(status);
      try {
        const accessToken = await getAccountAccessToken();
        const response = await action(accessToken);
        window.location.assign(response.url);
      } catch (error: unknown) {
        setBillingError(
          error instanceof Error
            ? error.message
            : "No fue posible abrir la facturación.",
        );
        setBillingStatus("idle");
      }
    },
    [getAccountAccessToken, isAuthenticated, login],
  );

  const startCheckout = useCallback(
    () => runBillingAction("checkout", createBillingCheckout),
    [runBillingAction],
  );

  const openBillingPortal = useCallback(
    () => runBillingAction("portal", createBillingPortal),
    [runBillingAction],
  );

  const profile = useMemo<SessionProfile | null>(
    () =>
      user
        ? {
            name:
              typeof user.name === "string" && user.name.trim().length > 0
                ? user.name
                : null,
            email:
              typeof user.email === "string" && user.email.trim().length > 0
                ? user.email
                : null,
            picture:
              typeof user.picture === "string" && user.picture.trim().length > 0
                ? user.picture
                : null,
          }
        : null,
    [user],
  );

  const accountIsLoading =
    isAuthenticated && accountAccessIsUnresolved(accessStatus, access);

  const value = useMemo<AccountSessionValue>(
    () => ({
      authEnabled: true,
      authConfigured: true,
      billingEnabled: accountAuthConfig.billingEnabled,
      billingStatus,
      billingError,
      isLoading: authIsLoading || accountIsLoading,
      isAuthenticated,
      profile,
      error: authError?.message ?? null,
      login,
      logout,
      refreshAccess,
      getAccessToken,
      startCheckout,
      openBillingPortal,
    }),
    [
      accountIsLoading,
      authError?.message,
      authIsLoading,
      billingError,
      billingStatus,
      getAccessToken,
      isAuthenticated,
      login,
      logout,
      openBillingPortal,
      profile,
      refreshAccess,
      startCheckout,
    ],
  );

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  );
}

export default function Auth0AccountSessionProvider({
  children,
}: Auth0AccountSessionProviderProps) {
  return (
    <Auth0Provider
      domain={accountAuthConfig.domain}
      clientId={accountAuthConfig.clientId}
      cacheLocation={accountAuthConfig.cacheLocation}
      useRefreshTokens={accountAuthConfig.useRefreshTokens}
      useRefreshTokensFallback={accountAuthConfig.useRefreshTokensFallback}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: accountAuthConfig.audience,
        scope: accountAuthConfig.scope,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <Auth0AccountBridge>{children}</Auth0AccountBridge>
    </Auth0Provider>
  );
}
