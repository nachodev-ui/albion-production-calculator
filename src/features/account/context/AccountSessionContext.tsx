import {
  Auth0Provider,
  useAuth0,
  type AppState,
} from '@auth0/auth0-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { fetchCurrentAccount } from '../api/accountApi'
import { accountAuthConfig } from '../config/accountAuthConfig'
import { useAccountAccessStore } from '../store/accountAccessStore'
import type { SessionProfile } from '../types'

interface AccountSessionValue {
  readonly authEnabled: boolean
  readonly authConfigured: boolean
  readonly isLoading: boolean
  readonly isAuthenticated: boolean
  readonly profile: SessionProfile | null
  readonly error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
  refreshAccess: () => Promise<void>
}

interface AccountSessionProviderProps {
  readonly children: ReactNode
}

const AccountSessionContext = createContext<AccountSessionValue | null>(null)

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

function UnavailableAccountSessionProvider({
  children,
}: AccountSessionProviderProps) {
  const clear = useAccountAccessStore((state) => state.clear)

  useEffect(() => {
    clear()
  }, [clear])

  const value = useMemo<AccountSessionValue>(
    () => ({
      authEnabled: accountAuthConfig.enabled,
      authConfigured: accountAuthConfig.configured,
      isLoading: false,
      isAuthenticated: false,
      profile: null,
      error:
        accountAuthConfig.enabled && !accountAuthConfig.configured
          ? 'La autenticación está habilitada, pero faltan variables públicas de Auth0.'
          : null,
      login: async () => undefined,
      logout: async () => undefined,
      refreshAccess: async () => undefined,
    }),
    [],
  )

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  )
}

function Auth0AccountBridge({ children }: AccountSessionProviderProps) {
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

  const refreshAccess = useCallback(async () => {
    if (!isAuthenticated) {
      clear()
      return
    }

    beginLoading()
    try {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: accountAuthConfig.audience,
          scope: accountAuthConfig.scope,
        },
      })
      setAccess(await fetchCurrentAccount(accessToken))
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'No fue posible sincronizar la cuenta.',
      )
    }
  }, [beginLoading, clear, getAccessTokenSilently, isAuthenticated, setAccess, setError])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      clear()
      return
    }
    void refreshAccess()
  }, [clear, isAuthenticated, isLoading, refreshAccess])

  const login = useCallback(
    () =>
      loginWithRedirect({
        appState: { returnTo: currentReturnTo() },
        authorizationParams: {
          audience: accountAuthConfig.audience,
          scope: accountAuthConfig.scope,
        },
      }),
    [loginWithRedirect],
  )

  const logout = useCallback(
    () =>
      auth0Logout({
        logoutParams: { returnTo: window.location.origin },
      }),
    [auth0Logout],
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
      isLoading,
      isAuthenticated,
      profile,
      error: authError?.message ?? null,
      login,
      logout,
      refreshAccess,
    }),
    [authError?.message, isAuthenticated, isLoading, login, logout, profile, refreshAccess],
  )

  return (
    <AccountSessionContext.Provider value={value}>
      {children}
    </AccountSessionContext.Provider>
  )
}

export function AccountSessionProvider({
  children,
}: AccountSessionProviderProps) {
  if (!accountAuthConfig.enabled || !accountAuthConfig.configured) {
    return (
      <UnavailableAccountSessionProvider>
        {children}
      </UnavailableAccountSessionProvider>
    )
  }

  return (
    <Auth0Provider
      domain={accountAuthConfig.domain}
      clientId={accountAuthConfig.clientId}
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

export function useAccountSession(): AccountSessionValue {
  const value = useContext(AccountSessionContext)
  if (!value) {
    throw new Error('useAccountSession must be used inside AccountSessionProvider')
  }
  return value
}
