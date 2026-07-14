import { Auth0Provider, useAuth0, type AppState } from '@auth0/auth0-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createBillingCheckout,
  createBillingPortal,
  fetchCurrentAccount,
} from '../api/accountApi'
import { accountAuthConfig } from '../config/accountAuthConfig'
import { useAccountAccessStore } from '../store/accountAccessStore'
import type { SessionProfile } from '../types'
import {
  AccountSessionContext,
  type AccountSessionValue,
  type BillingActionStatus,
} from './accountSession'

interface Auth0AccountSessionProviderProps {
  readonly children: ReactNode
}

function currentReturnTo(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function safeRedirectTarget(appState: AppState | undefined): string {
  const returnTo = appState?.returnTo
  if (
    typeof returnTo === 'string' &&
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//')
  ) {
    return returnTo
  }
  return '/account'
}

function onRedirectCallback(appState?: AppState) {
  window.history.replaceState({}, document.title, safeRedirectTarget(appState))
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function Auth0AccountBridge({ children }: Auth0AccountSessionProviderProps) {
  const {
    isLoading,
    isAuthenticated,
    user,
    error: authError,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0()
  const beginLoading = useAccountAccessStore((state) => state.beginLoading)
  const setAccess = useAccountAccessStore((state) => state.setAccess)
  const setError = useAccountAccessStore((state) => state.setError)
  const clear = useAccountAccessStore((state) => state.clear)
  const [billingStatus, setBillingStatus] =
    useState<BillingActionStatus>('idle')
  const [billingError, setBillingError] = useState<string | null>(null)

  const getAccountAccessToken = useCallback(
    () =>
      getAccessTokenSilently({
        authorizationParams: {
          audience: accountAuthConfig.audience,
          scope: accountAuthConfig.scope,
        },
      }),
    [getAccessTokenSilently],
  )

  const refreshAccess = useCallback(async () => {
    if (!isAuthenticated) {
      clear()
      return
    }

    beginLoading()
    try {
      const accessToken = await getAccountAccessToken()
      setAccess(await fetchCurrentAccount(accessToken))
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'No fue posible sincronizar la cuenta.',
      )
    }
  }, [
    beginLoading,
    clear,
    getAccountAccessToken,
    isAuthenticated,
    setAccess,
    setError,
  ])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      clear()
      return
    }
    void refreshAccess()
  }, [clear, isAuthenticated, isLoading, refreshAccess])

  const login = useCallback(async () => {
    setBillingError(null)
    setBillingStatus('idle')
    await loginWithRedirect({
      appState: { returnTo: currentReturnTo() },
      authorizationParams: {
        audience: accountAuthConfig.audience,
        scope: accountAuthConfig.scope,
      },
    })
  }, [loginWithRedirect])

  const logout = useCallback(async () => {
    setBillingError(null)
    setBillingStatus('idle')
    await auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    })
  }, [auth0Logout])

  const runBillingAction = useCallback(
    async (
      status: Exclude<BillingActionStatus, 'idle'>,
      action: (accessToken: string) => Promise<{ readonly url: string }>,
    ) => {
      if (!accountAuthConfig.billingEnabled) {
        setBillingError('La facturación sandbox todavía no está habilitada.')
        return
      }
      if (!isAuthenticated) {
        await login()
        return
      }

      setBillingError(null)
      setBillingStatus(status)
      try {
        const accessToken = await getAccountAccessToken()
        const response = await action(accessToken)
        window.location.assign(response.url)
      } catch (error: unknown) {
        setBillingError(
          error instanceof Error
            ? error.message
            : 'No fue posible abrir la facturación.',
        )
        setBillingStatus('idle')
      }
    },
    [getAccountAccessToken, isAuthenticated, login],
  )

  const startCheckout = useCallback(
    () => runBillingAction('checkout', createBillingCheckout),
    [runBillingAction],
  )

  const openBillingPortal = useCallback(
    () => runBillingAction('portal', createBillingPortal),
    [runBillingAction],
  )

  const profile = useMemo<SessionProfile | null>(
    () =>
      user
        ? {
            name:
              typeof user.name === 'string' && user.name.trim().length > 0
                ? user.name
                : null,
            email:
              typeof user.email === 'string' && user.email.trim().length > 0
                ? user.email
                : null,
            picture:
              typeof user.picture === 'string' && user.picture.trim().length > 0
                ? user.picture
                : null,
          }
        : null,
    [user],
  )

  const value = useMemo<AccountSessionValue>(
    () => ({
      authEnabled: true,
      authConfigured: true,
      billingEnabled: accountAuthConfig.billingEnabled,
      billingStatus,
      billingError,
      isLoading,
      isAuthenticated,
      profile,
      error: authError?.message ?? null,
      login,
      logout,
      refreshAccess,
      startCheckout,
      openBillingPortal,
    }),
    [
      authError?.message,
      billingError,
      billingStatus,
      isAuthenticated,
      isLoading,
      login,
      logout,
      openBillingPortal,
      profile,
      refreshAccess,
      startCheckout,
    ],
  )

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  )
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
  )
}
